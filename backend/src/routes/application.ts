import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { checkEligibility } from '../services/eligibilityService';
import { calculateCandidateMatch } from '../services/aiService';
import { calculateProfileCompleteness } from '../services/studentProfileService';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// Helper to parse JSON/string arrays
function parseJsonArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim().length > 0) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

// POST /api/v1/internships/:id/apply - Apply for an Internship Vacancy (Student)
router.post('/internships/:id/apply', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        skills: true,
        projects: true,
        experiences: true,
        certifications: true
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    }

    const internship = await prisma.internship.findUnique({
      where: { id: req.params.id },
      include: { company: true }
    });

    if (!internship) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Internship vacancy not found' } });
    }

    if (internship.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        error: { code: 'VACANCY_CLOSED', message: 'This internship vacancy is currently not accepting applications' }
      });
    }

    // 1. Prevent Duplicate Application
    const existing = await prisma.application.findUnique({
      where: {
        internshipId_studentId: {
          internshipId: internship.id,
          studentId: student.id
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_APPLICATION', message: 'You have already applied for this internship vacancy' }
      });
    }

    // 2. Fetch student documents for eligibility check
    const studentDocs = await prisma.document.findMany({
      where: { ownerUserId: req.user!.id }
    });

    // 3. DETERMINISTIC HARD ELIGIBILITY CHECK (Zero AI)
    const allowedBranches = parseJsonArray(internship.allowedBranches);
    const passingYears = parseJsonArray(internship.passingYears).map(Number);
    const requiredSkills = parseJsonArray(internship.requiredSkills);

    const eligibility = checkEligibility({
      student: {
        cgpa: student.cgpa,
        backlogs: student.backlogs,
        department: student.department,
        passingYear: student.passingYear,
        skills: student.skills.map(s => s.skillName),
        documents: studentDocs,
        resumeDocumentId: student.resumeDocumentId,
        profileStatus: student.profileStatus
      },
      internship: {
        minCgpa: internship.minCgpa,
        maxBacklogs: internship.maxBacklogs,
        allowedBranches,
        passingYears,
        requiredSkills
      }
    });

    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INELIGIBLE',
          message: 'You do not meet the mandatory institutional or recruiter eligibility criteria for this opportunity',
          details: eligibility.reasons,
          failedRules: eligibility.failedRules
        }
      });
    }

    // 4. Calculate Explainable Candidate Match Score
    const matchResult = await calculateCandidateMatch({
      student: {
        fullName: student.fullName,
        department: student.department,
        cgpa: student.cgpa,
        backlogs: student.backlogs,
        skills: student.skills.map(s => s.skillName),
        projects: student.projects,
        experiences: student.experiences,
        certifications: student.certifications.map(c => c.name),
        preferredDomains: student.preferredDomains || undefined,
        preferredMode: student.preferredMode || undefined
      },
      internship: {
        title: internship.title,
        description: internship.description,
        requiredSkills,
        minCgpa: internship.minCgpa,
        mode: internship.mode
      }
    });

    // 5. Create Application Record
    const application = await prisma.application.create({
      data: {
        internshipId: internship.id,
        studentId: student.id,
        status: 'APPLIED',
        eligibilityScore: eligibility.score,
        aiMatchScore: matchResult.matchScore,
        matchExplanation: matchResult.explanation
      },
      include: {
        internship: {
          include: { company: true }
        }
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'SUBMIT_APPLICATION',
      entityType: 'Application',
      entityId: application.id
    });

    // Notify Recruiter
    await createNotification({
      userId: internship.company.userId,
      type: 'APPLICATION_RECEIVED',
      title: 'New Candidate Application Received',
      message: `${student.fullName} (${student.department}) applied for ${internship.title} with a ${matchResult.matchScore}% match score.`
    });

    // Notify Student
    await createNotification({
      userId: req.user!.id,
      type: 'APPLICATION_SUBMITTED',
      title: 'Application Submitted Successfully',
      message: `Your application for ${internship.title} at ${internship.company.name} has been submitted.`
    });

    return res.status(201).json({
      success: true,
      data: {
        ...application,
        matchFactors: matchResult.factors
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/applications/:id/withdraw - Withdraw Application (Student)
router.post('/applications/:id/withdraw', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    }

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { internship: { include: { company: true } } }
    });

    if (!application) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }

    if (application.studentId !== student.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to withdraw another candidate\'s application' }
      });
    }

    if (['SELECTED', 'OFFER_ACCEPTED'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_WITHDRAW', message: 'Cannot withdraw an application after being selected or accepting an offer' }
      });
    }

    if (application.status === 'WITHDRAWN') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_WITHDRAWN', message: 'Application is already withdrawn' }
      });
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: 'WITHDRAWN' }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'WITHDRAW_APPLICATION',
      entityType: 'Application',
      entityId: application.id
    });

    return res.json({ success: true, data: updated, message: 'Application withdrawn successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/internships/:id/applications - List Applicants for a Vacancy (Company & T&P)
router.get('/internships/:id/applications', authenticateJwt, authorizeRoles('COMPANY', 'TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const internship = await prisma.internship.findUnique({
      where: { id: req.params.id },
      include: { company: true }
    });

    if (!internship) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Internship not found' } });
    }

    // Company ownership check
    if (req.user!.role === 'COMPANY') {
      const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
      if (!company || internship.companyId !== company.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to view applicants for this vacancy' }
        });
      }
    }

    const applications = await prisma.application.findMany({
      where: { internshipId: req.params.id },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
            skills: true,
            projects: true,
            experiences: true,
            certifications: true
          }
        },
        offer: true
      },
      orderBy: { aiMatchScore: 'desc' } // Ranked by explainable match score
    });

    // Populate authoritative completeness and documents for each candidate via single batch query
    const userIds = applications.map(a => a.student.userId).filter(Boolean);
    const allDocs = userIds.length > 0 ? await prisma.document.findMany({
      where: { ownerUserId: { in: userIds } }
    }) : [];

    const docMap = new Map<string, any[]>();
    for (const doc of allDocs) {
      if (!docMap.has(doc.ownerUserId)) docMap.set(doc.ownerUserId, []);
      docMap.get(doc.ownerUserId)!.push(doc);
    }

    const populated = applications.map((app) => {
      const docs = docMap.get(app.student.userId) || [];
      const completeness = calculateProfileCompleteness(app.student, docs.length);
      return {
        ...app,
        documents: docs,
        completeness
      };
    });

    return res.json({ success: true, data: populated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// State machine valid status transitions
const VALID_APPLICATION_TRANSITIONS: Record<string, string[]> = {
  APPLIED: ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  UNDER_REVIEW: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['SELECTED', 'REJECTED', 'WITHDRAWN'],
  SELECTED: ['OFFER_ISSUED', 'REJECTED'],
  OFFER_ISSUED: ['OFFER_ACCEPTED', 'OFFER_DECLINED', 'REJECTED'],
  OFFER_ACCEPTED: [],
  OFFER_DECLINED: [],
  REJECTED: [],
  WITHDRAWN: []
};

// PATCH /api/v1/applications/:id/status - Update Candidate Application Status (Company only)
router.patch('/applications/:id/status', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const targetStatus = String(status || '').toUpperCase();

    if (!['UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be UNDER_REVIEW, SHORTLISTED, SELECTED, or REJECTED' }
      });
    }

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: {
        internship: { include: { company: true } },
        student: true
      }
    });

    if (!application) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }

    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company || application.internship.companyId !== company.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to update candidates for another company\'s vacancy' }
      });
    }

    // State machine check
    const currentStatus = application.status.toUpperCase();
    const allowedTargets = VALID_APPLICATION_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot transition application status from ${currentStatus} to ${targetStatus}`
        }
      });
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: targetStatus },
      include: { student: true, internship: true }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: `APPLICATION_${targetStatus}`,
      entityType: 'Application',
      entityId: application.id
    });

    // Notify student
    await createNotification({
      userId: application.student.userId,
      type: `APPLICATION_${targetStatus}`,
      title: `Application Status: ${targetStatus}`,
      message: `Your application for ${application.internship.title} at ${application.internship.company.name} is now ${targetStatus}.`
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
