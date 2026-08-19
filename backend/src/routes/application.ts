import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { checkEligibility } from '../services/eligibilityService';
import { calculateCandidateMatch } from '../services/aiService';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// POST /api/v1/internships/:id/apply (Student)
router.post('/:id/apply', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: { skills: true, projects: true, certifications: true }
    });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const internship = await prisma.internship.findUnique({
      where: { id: req.params.id },
      include: { company: true }
    });
    if (!internship) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Internship not found' } });

    if (internship.status !== 'OPEN') {
      return res.status(400).json({ success: false, error: { code: 'VACANCY_CLOSED', message: 'This internship vacancy is no longer accepting applications' } });
    }

    // Check duplicate application
    const existing = await prisma.application.findUnique({
      where: {
        internshipId_studentId: {
          internshipId: internship.id,
          studentId: student.id
        }
      }
    });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE_APPLICATION', message: 'You have already applied for this internship' } });
    }

    // Run deterministic eligibility check
    const allowedBranches = JSON.parse(internship.allowedBranches || '[]');
    const passingYears = JSON.parse(internship.passingYears || '[]');
    const requiredSkills = JSON.parse(internship.requiredSkills || '[]');

    const eligibility = checkEligibility({
      student: {
        cgpa: student.cgpa,
        backlogs: student.backlogs,
        department: student.department,
        passingYear: student.passingYear,
        skills: student.skills.map(s => s.skillName)
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
          message: 'You do not meet the hard eligibility criteria for this internship',
          details: eligibility.reasons
        }
      });
    }

    // Calculate AI match score
    const aiResult = await calculateCandidateMatch({
      student: {
        fullName: student.fullName,
        department: student.department,
        cgpa: student.cgpa,
        skills: student.skills.map(s => s.skillName),
        projects: student.projects.map(p => ({ title: p.title, technologies: p.technologies, description: p.description })),
        certifications: student.certifications.map(c => c.name)
      },
      internship: {
        title: internship.title,
        description: internship.description,
        requiredSkills,
        minCgpa: internship.minCgpa
      }
    });

    const application = await prisma.application.create({
      data: {
        internshipId: internship.id,
        studentId: student.id,
        status: 'APPLIED',
        eligibilityScore: eligibility.score,
        aiMatchScore: aiResult.matchScore,
        matchExplanation: aiResult.explanation
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'SUBMIT_APPLICATION',
      entityType: 'Application',
      entityId: application.id
    });

    // Notify company
    await createNotification({
      userId: internship.company.userId,
      type: 'APPLICATION_RECEIVED',
      title: 'New Application Received',
      message: `${student.fullName} applied for ${internship.title} (${aiResult.matchScore}% Match)`
    });

    return res.status(201).json({ success: true, data: application });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/internships/:id/applications (Company)
router.get('/:id/applications', authenticateJwt, authorizeRoles('COMPANY', 'TNP'), async (req: AuthRequest, res) => {
  try {
    const applications = await prisma.application.findMany({
      where: { internshipId: req.params.id },
      include: {
        student: {
          include: { skills: true, projects: true, certifications: true }
        },
        offer: true
      },
      orderBy: { aiMatchScore: 'desc' } // AI ranked by match score!
    });

    return res.json({ success: true, data: applications });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/v1/applications/:id/status (Company)
router.patch('/:id/status', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!['SHORTLISTED', 'SELECTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be SHORTLISTED, SELECTED, or REJECTED' } });
    }

    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: { status },
      include: { student: true, internship: true }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: `APPLICATION_${status}`,
      entityType: 'Application',
      entityId: application.id
    });

    // Notify student
    await createNotification({
      userId: application.student.userId,
      type: `APPLICATION_${status}`,
      title: `Application Status Updated: ${status}`,
      message: `Your application for ${application.internship.title} is now ${status}.`
    });

    return res.json({ success: true, data: application });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
