import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// GET /api/v1/tnp/verification-queue
router.get('/verification-queue', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const verifications = await prisma.verification.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Populate metadata dynamically for each entity type
    const populated = await Promise.all(verifications.map(async (v) => {
      let entityData: any = null;
      if (v.entityType === 'PROFILE') {
        entityData = await prisma.studentProfile.findUnique({ where: { id: v.entityId } });
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

// POST /api/v1/tnp/verifications/:id/approve
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

// POST /api/v1/tnp/verifications/:id/reject
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
