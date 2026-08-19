import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog } from '../services/auditService';

const router = Router();

// POST /api/v1/internships/:id/completion-document (Company uploads completion cert)
router.post('/:id/completion-document', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const { studentId, certificateDocumentId } = req.body;

    const completion = await prisma.completion.create({
      data: {
        internshipId: req.params.id,
        studentId,
        certificateDocumentId: certificateDocumentId || null,
        status: 'PENDING'
      }
    });

    // Create T&P verification record
    await prisma.verification.create({
      data: {
        entityType: 'COMPLETION',
        entityId: completion.id,
        status: 'PENDING',
        reason: 'Company submitted completion certificate for T&P verification'
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'UPLOAD_COMPLETION_CERTIFICATE',
      entityType: 'Completion',
      entityId: completion.id
    });

    return res.status(201).json({ success: true, data: completion });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
