import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// ============================================================
// 1. COMPLETION RECOMMENDATION (Mentor or Company)
// ============================================================

// POST /api/v1/internships/:id/completions/recommend & /api/v1/internships/:id/completion-recommendation
const handleRecommendCompletion = async (req: AuthRequest, res: any) => {
  try {
    const internshipId = req.params.id || req.body.internshipId;
    const { studentId, remarks } = req.body;

    if (!internshipId || !studentId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'internshipId and studentId are required' }
      });
    }

    const [student, internship] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { id: studentId }, include: { user: true } }),
      prisma.internship.findUnique({ where: { id: internshipId }, include: { company: true } })
    ]);

    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    if (!internship) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Internship not found' } });

    // Validate Prerequisite Conditions
    const missingConditions: string[] = [];

    // Condition 1: Approved Weekly Progress Reports
    const approvedReportsCount = await prisma.progressReport.count({
      where: { internshipId, studentId, status: 'APPROVED' }
    });
    if (approvedReportsCount === 0) {
      missingConditions.push('At least one weekly progress report must be submitted and approved by faculty mentor');
    }

    // Condition 2: Mentor Evaluation Completed
    const mentorEval = await prisma.evaluation.findFirst({
      where: { internshipId, studentId, evaluatorRole: 'MENTOR' }
    });
    if (!mentorEval) {
      missingConditions.push('Faculty mentor evaluation rubric must be completed');
    }

    // Condition 3: Company Evaluation Completed
    const companyEval = await prisma.evaluation.findFirst({
      where: { internshipId, studentId, evaluatorRole: 'COMPANY' }
    });
    if (!companyEval) {
      missingConditions.push('Employer company evaluation rubric must be completed');
    }

    if (missingConditions.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'COMPLETION_PREREQUISITES_NOT_MET',
          message: 'All prerequisite conditions must be satisfied before recommending internship completion.',
          missingConditions
        }
      });
    }

    // Deterministic Final Score Calculation (40% Mentor + 60% Company)
    const finalScore = parseFloat(((mentorEval!.overallScore * 0.40) + (companyEval!.overallScore * 0.60)).toFixed(2));
    let grade = 'A (Excellent)';
    if (finalScore >= 9.0) grade = 'A+ (Outstanding)';
    else if (finalScore >= 8.0) grade = 'A (Excellent)';
    else if (finalScore >= 7.0) grade = 'B+ (Very Good)';
    else if (finalScore >= 6.0) grade = 'B (Good)';
    else if (finalScore >= 5.0) grade = 'C (Satisfactory)';
    else grade = 'F (Needs Improvement)';

    // Upsert Completion Record
    let completion = await prisma.completion.findFirst({
      where: { internshipId, studentId }
    });

    if (completion) {
      completion = await prisma.completion.update({
        where: { id: completion.id },
        data: {
          status: 'RECOMMENDED',
          recommendedBy: req.user!.role,
          recommendationRemarks: remarks || null,
          finalScore,
          grade
        }
      });
    } else {
      completion = await prisma.completion.create({
        data: {
          internshipId,
          studentId,
          status: 'RECOMMENDED',
          recommendedBy: req.user!.role,
          recommendationRemarks: remarks || null,
          finalScore,
          grade
        }
      });
    }

    // Upsert T&P Verification Queue Record
    const existingVerif = await prisma.verification.findFirst({
      where: { entityType: 'COMPLETION', entityId: completion.id }
    });

    if (!existingVerif) {
      await prisma.verification.create({
        data: {
          entityType: 'COMPLETION',
          entityId: completion.id,
          status: 'PENDING',
          reason: `Internship completion recommended by ${req.user!.role} with final grade ${grade} (${finalScore}/10.0)`
        }
      });
    }

    await createAuditLog({
      actorId: req.user!.id,
      action: 'COMPLETION_RECOMMENDED',
      entityType: 'Completion',
      entityId: completion.id,
      reason: `${req.user!.role} recommended completion for ${student.fullName} with score ${finalScore}/10.0 (${grade})`
    });

    // Notify Student
    await createNotification({
      userId: student.userId,
      type: 'COMPLETION_RECOMMENDED',
      title: 'Internship Completion Recommended',
      message: `Your internship completion has been recommended with a final score of ${finalScore}/10.0. Awaiting institutional T&P approval.`
    });

    return res.status(201).json({
      success: true,
      data: {
        ...completion,
        prerequisitesMet: true,
        finalScore,
        grade
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.post('/:id/completions/recommend', authenticateJwt, authorizeRoles('MENTOR', 'COMPANY'), handleRecommendCompletion);
router.post('/:id/completion-recommendation', authenticateJwt, authorizeRoles('MENTOR', 'COMPANY'), handleRecommendCompletion);
router.post('/completions/recommend', authenticateJwt, authorizeRoles('MENTOR', 'COMPANY'), handleRecommendCompletion);

// ============================================================
// 2. T&P VERIFICATION & APPROVAL WORKFLOW
// ============================================================

// POST /api/v1/tnp/completions/:id/verify & /api/v1/internships/:id/completions/verify
const handleTNPVerifyCompletion = async (req: AuthRequest, res: any) => {
  try {
    const { status, rejectionReason, remarks } = req.body;
    const targetStatus = String(status || '').toUpperCase();

    if (!['APPROVED', 'REJECTED'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be APPROVED or REJECTED' }
      });
    }

    if (targetStatus === 'REJECTED' && !rejectionReason && !remarks) {
      return res.status(400).json({
        success: false,
        error: { code: 'REASON_REQUIRED', message: 'Rejection reason is mandatory when rejecting completion' }
      });
    }

    const completion = await prisma.completion.findUnique({
      where: { id: req.params.id },
      include: {
        student: { include: { user: true } },
        internship: { include: { company: true } }
      }
    });

    if (!completion) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Completion record not found' } });
    }

    const isApproved = targetStatus === 'APPROVED';

    let certificateId = completion.certificateId;
    let verificationCode = completion.verificationCode;

    if (isApproved && !certificateId) {
      const hex1 = crypto.randomBytes(4).toString('hex').toUpperCase();
      const hex2 = crypto.randomBytes(4).toString('hex').toUpperCase();
      certificateId = `CERT-2026-${hex1}-${hex2}`;
      verificationCode = crypto.randomBytes(16).toString('hex');
    }

    const updated = await prisma.completion.update({
      where: { id: completion.id },
      data: {
        status: targetStatus,
        certificateId: isApproved ? certificateId : null,
        verificationCode: isApproved ? verificationCode : null,
        completionDate: isApproved ? new Date() : null,
        verifiedBy: req.user!.id,
        verifiedAt: new Date(),
        rejectionReason: !isApproved ? (rejectionReason || remarks) : null
      },
      include: { student: true, internship: { include: { company: true } } }
    });

    // Update Verification Record
    const verif = await prisma.verification.findFirst({
      where: { entityType: 'COMPLETION', entityId: completion.id }
    });
    if (verif) {
      await prisma.verification.update({
        where: { id: verif.id },
        data: {
          status: targetStatus,
          verifierId: req.user!.id,
          reviewedAt: new Date(),
          reason: isApproved ? 'Institutional completion approved by T&P cell' : (rejectionReason || remarks)
        }
      });
    }

    // If Approved, update Application and MentorAssignment to COMPLETED
    if (isApproved) {
      await prisma.application.updateMany({
        where: { internshipId: completion.internshipId, studentId: completion.studentId },
        data: { status: 'COMPLETED' }
      });

      await prisma.mentorAssignment.updateMany({
        where: { internshipId: completion.internshipId, studentId: completion.studentId },
        data: { status: 'COMPLETED' }
      });
    }

    await createAuditLog({
      actorId: req.user!.id,
      action: isApproved ? 'COMPLETION_APPROVED' : 'COMPLETION_REJECTED',
      entityType: 'Completion',
      entityId: completion.id,
      reason: isApproved
        ? `T&P approved completion. Generated certificate: ${certificateId}`
        : `T&P rejected completion: ${rejectionReason || remarks}`
    });

    // Notify Student
    await createNotification({
      userId: completion.student.userId,
      type: isApproved ? 'COMPLETION_APPROVED' : 'COMPLETION_REJECTED',
      title: isApproved ? '🎓 Internship Certificate Issued!' : 'Completion Request Rejected',
      message: isApproved
        ? `Congratulations! Your internship completion has been verified by T&P. Certificate ID: ${certificateId}`
        : `Your internship completion request was rejected by T&P: ${rejectionReason || remarks}`
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.post('/tnp/completions/:id/verify', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleTNPVerifyCompletion);
router.post('/:id/completions/verify', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleTNPVerifyCompletion);

// ============================================================
// 3. VERIFIABLE CERTIFICATE RETRIEVAL
// ============================================================

// GET /api/v1/internships/:id/completions/certificate/:studentId & /api/v1/completions/:id/certificate
const handleGetCertificate = async (req: AuthRequest, res: any) => {
  try {
    const internshipId = req.params.id;
    const studentId = req.params.studentId;

    let completion: any = null;

    if (studentId) {
      completion = await prisma.completion.findFirst({
        where: { internshipId, studentId },
        include: {
          student: { include: { user: true } },
          internship: { include: { company: true } }
        }
      });
    } else {
      completion = await prisma.completion.findUnique({
        where: { id: req.params.id },
        include: {
          student: { include: { user: true } },
          internship: { include: { company: true } }
        }
      });
    }

    if (!completion) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Completion record not found' } });
    }

    // Crucial Rule: Do not claim completion before T&P approval
    if (completion.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'COMPLETION_NOT_APPROVED',
          message: 'Internship completion has not yet been approved by the T&P cell. Certificate is not available.'
        }
      });
    }

    return res.json({
      success: true,
      data: {
        certificateId: completion.certificateId,
        verificationCode: completion.verificationCode,
        studentName: completion.student.fullName,
        studentCode: completion.student.studentCode,
        department: completion.student.department,
        companyName: completion.internship.company.name,
        internshipTitle: completion.internship.title,
        role: completion.internship.title,
        durationMonths: completion.internship.durationMonths,
        completionDate: completion.completionDate,
        finalScore: completion.finalScore,
        grade: completion.grade,
        accreditation: 'AICTE / Autonomous Institutional Placement Governance',
        verifiedBy: 'Training & Placement (T&P) Department',
        verificationUrl: `/api/v1/verify/certificate/${completion.certificateId}`
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.get('/:id/completions/certificate/:studentId', authenticateJwt, handleGetCertificate);
router.get('/completions/:id/certificate', authenticateJwt, handleGetCertificate);

// GET /api/v1/internships/:id/completions (List completions for internship)
router.get('/:id/completions', authenticateJwt, async (req, res) => {
  try {
    const completions = await prisma.completion.findMany({
      where: { internshipId: req.params.id },
      include: {
        student: true,
        internship: { include: { company: true } }
      }
    });

    return res.json({ success: true, data: completions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
