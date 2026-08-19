import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// POST /api/v1/applications/:id/offer (Company issues offer)
router.post('/applications/:id/offer', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const { documentId, acceptanceDeadline } = req.body;

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { student: true, internship: true }
    });
    if (!application) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });

    // Create or update offer
    const offer = await prisma.offer.upsert({
      where: { applicationId: application.id },
      update: {
        documentId: documentId || null,
        acceptanceDeadline: acceptanceDeadline || '2026-12-31',
        status: 'ISSUED',
        studentResponse: 'PENDING'
      },
      create: {
        applicationId: application.id,
        documentId: documentId || null,
        acceptanceDeadline: acceptanceDeadline || '2026-12-31',
        status: 'ISSUED',
        studentResponse: 'PENDING'
      }
    });

    await prisma.application.update({
      where: { id: application.id },
      data: { status: 'SELECTED' }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'ISSUE_OFFER',
      entityType: 'Offer',
      entityId: offer.id
    });

    await createNotification({
      userId: application.student.userId,
      type: 'OFFER_ISSUED',
      title: 'Congratulations! Internship Offer Received',
      message: `You have received an offer letter for ${application.internship.title}.`
    });

    return res.status(201).json({ success: true, data: offer });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/offers/:id/respond (Student accepts or declines offer)
router.post('/offers/:id/respond', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const { response } = req.body; // ACCEPTED or DECLINED
    if (!['ACCEPTED', 'DECLINED'].includes(response)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_RESPONSE', message: 'Response must be ACCEPTED or DECLINED' } });
    }

    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { application: { include: { student: true, internship: { include: { company: true } } } } }
    });
    if (!offer) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } });

    const updatedOffer = await prisma.offer.update({
      where: { id: offer.id },
      data: {
        studentResponse: response,
        status: response === 'ACCEPTED' ? 'TNP_REVIEW' : 'REJECTED'
      }
    });

    if (response === 'ACCEPTED') {
      // Create T&P verification record
      await prisma.verification.create({
        data: {
          entityType: 'OFFER',
          entityId: offer.id,
          status: 'PENDING',
          reason: `Student accepted offer for ${offer.application.internship.title}`
        }
      });
    }

    await createAuditLog({
      actorId: req.user!.id,
      action: `OFFER_RESPONSE_${response}`,
      entityType: 'Offer',
      entityId: offer.id
    });

    return res.json({ success: true, data: updatedOffer });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
