import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';
import { calculateProfileCompleteness } from '../services/studentProfileService';

const router = Router();

// GET /api/v1/tnp/students/stats - Summary counts of student verification statuses
router.get('/students/stats', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const total = await prisma.studentProfile.count();
    const verified = await prisma.studentProfile.count({ where: { profileStatus: 'VERIFIED' } });
    const rejected = await prisma.studentProfile.count({ where: { profileStatus: 'REJECTED' } });
    const correctionRequired = await prisma.studentProfile.count({ where: { profileStatus: 'CORRECTION_REQUIRED' } });
    const pending = await prisma.studentProfile.count({
      where: { profileStatus: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DRAFT'] } }
    });

    return res.json({
      success: true,
      data: {
        total,
        verified,
        rejected,
        pending,
        correctionRequired
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/tnp/students/pending - List students for verification review
router.get('/students/pending', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status, department } = req.query;

    const whereClause: any = {};
    if (status && String(status).toUpperCase() !== 'ALL') {
      whereClause.profileStatus = String(status);
    } else if (!status) {
      whereClause.profileStatus = { in: ['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'DRAFT'] };
    }

    if (department) {
      whereClause.department = String(department);
    }

    const students = await prisma.studentProfile.findMany({
      where: whereClause,
      include: {
        user: { select: { email: true } },
        skills: true,
        projects: true,
        experiences: true,
        certifications: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Attach document count and authoritative completeness for each
    const populated = await Promise.all(students.map(async (student) => {
      const documents = await prisma.document.findMany({
        where: { ownerUserId: student.userId }
      });
      const completeness = calculateProfileCompleteness(student, documents.length);
      return {
        ...student,
        documents,
        completeness
      };
    }));

    return res.json({ success: true, data: populated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/tnp/students/:id/review - In-depth student profile and documents for T&P reviewer
router.get('/students/:id/review', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, createdAt: true } },
        skills: true,
        projects: true,
        experiences: true,
        certifications: true,
        applications: {
          include: { internship: { include: { company: true } } }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    }

    const documents = await prisma.document.findMany({
      where: { ownerUserId: student.userId }
    });

    const verifications = await prisma.verification.findMany({
      where: { entityType: 'PROFILE', entityId: student.id },
      orderBy: { createdAt: 'desc' }
    });

    const completeness = calculateProfileCompleteness(student, documents.length);

    return res.json({
      success: true,
      data: {
        student,
        documents,
        verifications,
        completeness
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/tnp/students/:id/verify - Approve, Reject, or Request Correction on Student Profile
router.post('/students/:id/verify', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status, reason, remarks } = req.body;
    const targetStatus = (status || '').toUpperCase();

    if (!['APPROVED', 'VERIFIED', 'REJECTED', 'CORRECTION_REQUIRED'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Status must be APPROVED, VERIFIED, REJECTED, or CORRECTION_REQUIRED' }
      });
    }

    const student = await prisma.studentProfile.findUnique({ where: { id: req.params.id } });
    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    }

    let updatedProfileStatus = 'VERIFIED';
    let defaultReason = 'Profile verified and approved by T&P';

    if (targetStatus === 'REJECTED') {
      if (!reason && !remarks) {
        return res.status(400).json({ success: false, error: { code: 'REASON_REQUIRED', message: 'Rejection reason is required' } });
      }
      updatedProfileStatus = 'REJECTED';
      defaultReason = reason || remarks || 'Profile rejected by T&P';
    } else if (targetStatus === 'CORRECTION_REQUIRED') {
      if (!reason && !remarks) {
        return res.status(400).json({ success: false, error: { code: 'REMARKS_REQUIRED', message: 'Correction remarks are required' } });
      }
      updatedProfileStatus = 'CORRECTION_REQUIRED';
      defaultReason = reason || remarks || 'Corrections required by T&P';
    }

    // Update student profile status
    const updated = await prisma.studentProfile.update({
      where: { id: student.id },
      data: {
        profileStatus: updatedProfileStatus,
        verificationRemark: reason || remarks || defaultReason
      }
    });

    // Record verification entry
    const verification = await prisma.verification.create({
      data: {
        entityType: 'PROFILE',
        entityId: student.id,
        verifierId: req.user!.id,
        status: updatedProfileStatus === 'VERIFIED' ? 'APPROVED' : updatedProfileStatus,
        reason: reason || remarks || defaultReason,
        reviewedAt: new Date()
      }
    });

    // Notify Student
    let notifTitle = 'Profile Verified';
    let notifMsg = 'Your student profile has been verified by the T&P Cell. You can now apply to all open placements.';
    if (updatedProfileStatus === 'REJECTED') {
      notifTitle = 'Profile Verification Rejected';
      notifMsg = `Your profile verification was rejected. Reason: ${reason || remarks}`;
    } else if (updatedProfileStatus === 'CORRECTION_REQUIRED') {
      notifTitle = 'Profile Correction Required';
      notifMsg = `T&P requires corrections before verifying your profile: ${reason || remarks}`;
    }

    await createNotification({
      userId: student.userId,
      type: 'PROFILE_VERIFICATION',
      title: notifTitle,
      message: notifMsg
    });

    // Audit Log
    await createAuditLog({
      actorId: req.user!.id,
      action: `VERIFY_PROFILE_${updatedProfileStatus}`,
      entityType: 'StudentProfile',
      entityId: student.id,
      reason: reason || remarks || defaultReason
    });

    return res.json({
      success: true,
      data: {
        student: updated,
        verification
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/tnp/offers & /api/v1/tnp/offers/pending - List offers awaiting institutional T&P review
const handleGetTnpOffers = async (req: AuthRequest, res: any) => {
  try {
    const { status, department } = req.query;

    const whereClause: any = {};
    if (status) {
      whereClause.status = String(status).toUpperCase();
    }

    if (department) {
      whereClause.application = {
        student: {
          department: String(department)
        }
      };
    }

    const offers = await prisma.offer.findMany({
      where: whereClause,
      include: {
        application: {
          include: {
            student: {
              include: {
                user: { select: { email: true } },
                skills: true,
                projects: true,
                experiences: true
              }
            },
            internship: {
              include: { company: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Populate document count and completeness for each student
    const populated = await Promise.all(offers.map(async (offer) => {
      const documents = await prisma.document.findMany({
        where: { ownerUserId: offer.application.student.userId }
      });
      const completeness = calculateProfileCompleteness(offer.application.student, documents.length);
      return {
        ...offer,
        documents,
        studentCompleteness: completeness
      };
    }));

    return res.json({ success: true, data: populated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.get('/offers', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleGetTnpOffers);
router.get('/offers/pending', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleGetTnpOffers);

// GET /api/v1/tnp/offers/:id/review - In-depth review dossier of offer, company, student, and documents
router.get('/offers/:id/review', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: {
        application: {
          include: {
            student: {
              include: {
                user: { select: { id: true, email: true, createdAt: true } },
                skills: true,
                projects: true,
                experiences: true,
                certifications: true
              }
            },
            internship: {
              include: { company: true }
            }
          }
        }
      }
    });

    if (!offer) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } });
    }

    const studentDocuments = await prisma.document.findMany({
      where: { ownerUserId: offer.application.student.userId }
    });

    const verifications = await prisma.verification.findMany({
      where: {
        OR: [
          { entityType: 'OFFER', entityId: offer.id },
          { entityType: 'PROFILE', entityId: offer.application.student.id }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    const completeness = calculateProfileCompleteness(offer.application.student, studentDocuments.length);

    return res.json({
      success: true,
      data: {
        offer,
        student: offer.application.student,
        internship: offer.application.internship,
        company: offer.application.internship.company,
        studentDocuments,
        verifications,
        studentCompleteness: completeness
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/tnp/offers/:id/verify - Approve, Reject, or Request Correction on Offer Letter
router.post('/offers/:id/verify', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status, reason, remarks } = req.body;
    const targetStatus = String(status || '').toUpperCase();

    if (!['APPROVED', 'REJECTED', 'CORRECTION_REQUIRED'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Status must be APPROVED, REJECTED, or CORRECTION_REQUIRED' }
      });
    }

    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: {
        application: {
          include: {
            student: true,
            internship: { include: { company: true } }
          }
        }
      }
    });

    if (!offer) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } });
    }

    const previousStatus = offer.status;

    if (targetStatus === 'REJECTED') {
      if (!reason && !remarks) {
        return res.status(400).json({
          success: false,
          error: { code: 'REASON_REQUIRED', message: 'Rejection reason is required' }
        });
      }
    } else if (targetStatus === 'CORRECTION_REQUIRED') {
      if (!reason && !remarks) {
        return res.status(400).json({
          success: false,
          error: { code: 'REMARKS_REQUIRED', message: 'Correction remarks are required' }
        });
      }
    }

    const decisionReason = reason || remarks || (targetStatus === 'APPROVED' ? 'Offer verified and approved by T&P' : 'T&P decision');

    // Update Offer Status
    const updatedOffer = await prisma.offer.update({
      where: { id: offer.id },
      data: { status: targetStatus }
    });

    // Update Application Status if Approved or Rejected
    if (targetStatus === 'APPROVED') {
      await prisma.application.update({
        where: { id: offer.applicationId },
        data: { status: 'OFFER_ACCEPTED' }
      });
    } else if (targetStatus === 'REJECTED') {
      await prisma.application.update({
        where: { id: offer.applicationId },
        data: { status: 'REJECTED' }
      });
    }

    // Record or update Verification record
    const verification = await prisma.verification.create({
      data: {
        entityType: 'OFFER',
        entityId: offer.id,
        verifierId: req.user!.id,
        status: targetStatus,
        reason: decisionReason,
        reviewedAt: new Date()
      }
    });

    // Notifications
    const studentUser = offer.application.student.userId;
    const companyUser = offer.application.internship.company.userId;

    if (targetStatus === 'APPROVED') {
      await createNotification({
        userId: studentUser,
        type: 'OFFER_APPROVED_TNP',
        title: 'Offer Letter Approved by T&P!',
        message: `Your internship offer for ${offer.role || offer.application.internship.title} at ${offer.application.internship.company.name} has been verified and approved by the T&P Cell. Ready for mentor assignment!`
      });
      await createNotification({
        userId: companyUser,
        type: 'OFFER_APPROVED_TNP',
        title: 'Offer Verified by Institutional T&P',
        message: `The offer letter for ${offer.application.student.fullName} has been approved by the college T&P Cell.`
      });
    } else if (targetStatus === 'REJECTED') {
      await createNotification({
        userId: studentUser,
        type: 'OFFER_REJECTED_TNP',
        title: 'Offer Letter Rejected by T&P',
        message: `Institutional verification for your offer at ${offer.application.internship.company.name} was rejected. Reason: ${decisionReason}`
      });
      await createNotification({
        userId: companyUser,
        type: 'OFFER_REJECTED_TNP',
        title: 'Offer Rejected by Institutional T&P',
        message: `Institutional verification for ${offer.application.student.fullName}'s offer was rejected. Reason: ${decisionReason}`
      });
    } else if (targetStatus === 'CORRECTION_REQUIRED') {
      await createNotification({
        userId: studentUser,
        type: 'OFFER_CORRECTION_TNP',
        title: 'Offer Correction Required by T&P',
        message: `T&P Cell requires corrections on your internship terms: ${decisionReason}`
      });
      await createNotification({
        userId: companyUser,
        type: 'OFFER_CORRECTION_TNP',
        title: 'Offer Letter Correction Required by T&P',
        message: `The T&P Cell has requested modifications to the offer terms for ${offer.application.student.fullName}: ${decisionReason}`
      });
    }

    // Comprehensive Audit Log capturing T&P user, timestamp, decision, reason, previous and new status
    await createAuditLog({
      actorId: req.user!.id,
      action: `TNP_OFFER_${targetStatus}`,
      entityType: 'Offer',
      entityId: offer.id,
      reason: `Decision: ${targetStatus} | Reason: ${decisionReason} | Previous Status: ${previousStatus} | New Status: ${targetStatus}`
    });

    return res.json({
      success: true,
      data: {
        offer: updatedOffer,
        verification
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/tnp/verification-queue - Unified queue for Profiles, Offers, and Completions
router.get('/verification-queue', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const verifications = await prisma.verification.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Populate metadata dynamically for each entity type
    const populated = await Promise.all(verifications.map(async (v) => {
      let entityData: any = null;
      if (v.entityType === 'PROFILE') {
        entityData = await prisma.studentProfile.findUnique({
          where: { id: v.entityId },
          include: { user: { select: { email: true } } }
        });
      } else if (v.entityType === 'OFFER') {
        entityData = await prisma.offer.findUnique({
          where: { id: v.entityId },
          include: { application: { include: { student: true, internship: { include: { company: true } } } } }
        });
      } else if (v.entityType === 'COMPLETION') {
        entityData = await prisma.completion.findUnique({
          where: { id: v.entityId },
          include: { student: true, internship: { include: { company: true } } }
        });
      }
      return { ...v, entityData };
    }));

    return res.json({ success: true, data: populated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/tnp/verifications/:id/approve - Generic verification approval
router.post('/verifications/:id/approve', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    const v = await prisma.verification.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        verifierId: req.user!.id,
        reason: reason || 'Approved by T&P',
        reviewedAt: new Date()
      }
    });

    if (v.entityType === 'PROFILE') {
      const student = await prisma.studentProfile.update({
        where: { id: v.entityId },
        data: { profileStatus: 'VERIFIED', verificationRemark: 'Profile verified by T&P' }
      });
      await createNotification({ userId: student.userId, type: 'PROFILE_VERIFIED', title: 'Profile Verified', message: 'Your student profile has been verified by T&P.' });
    } else if (v.entityType === 'OFFER') {
      const offer = await prisma.offer.update({
        where: { id: v.entityId },
        data: { status: 'APPROVED' },
        include: { application: { include: { student: true } } }
      });
      await createNotification({ userId: offer.application.student.userId, type: 'OFFER_VERIFIED', title: 'Offer Approved by T&P', message: 'Your internship offer has been verified and approved by T&P.' });
    } else if (v.entityType === 'COMPLETION') {
      const completion = await prisma.completion.update({
        where: { id: v.entityId },
        data: { status: 'APPROVED', verifiedBy: req.user!.id, verifiedAt: new Date() },
        include: { student: true }
      });
      await createNotification({ userId: completion.student.userId, type: 'COMPLETION_VERIFIED', title: 'Internship Completion Verified', message: 'Your internship completion certificate has been verified by T&P.' });
    }

    await createAuditLog({
      actorId: req.user!.id,
      action: 'APPROVE_VERIFICATION',
      entityType: v.entityType,
      entityId: v.entityId,
      reason: reason || 'Approved'
    });

    return res.json({ success: true, data: v });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/tnp/verifications/:id/reject - Generic verification rejection
router.post('/verifications/:id/reject', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: { code: 'REASON_REQUIRED', message: 'Rejection reason is required' } });

    const v = await prisma.verification.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        verifierId: req.user!.id,
        reason,
        reviewedAt: new Date()
      }
    });

    if (v.entityType === 'PROFILE') {
      await prisma.studentProfile.update({
        where: { id: v.entityId },
        data: { profileStatus: 'REJECTED', verificationRemark: reason }
      });
    } else if (v.entityType === 'OFFER') {
      await prisma.offer.update({
        where: { id: v.entityId },
        data: { status: 'REJECTED' }
      });
    }

    await createAuditLog({
      actorId: req.user!.id,
      action: 'REJECT_VERIFICATION',
      entityType: v.entityType,
      entityId: v.entityId,
      reason
    });

    return res.json({ success: true, data: v });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
