import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// PATCH /api/v1/internships/:id/ppo (Company records or updates PPO decision)
router.patch('/:id/ppo', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });

    const { studentId, status, role, offeredCtc, offerDate } = req.body;

    const ppo = await prisma.pPO.upsert({
      where: { id: req.body.ppoId || 'non-existent-id' },
      update: {
        status: status || 'OFFERED',
        role: role || 'Software Development Engineer',
        offeredCtc: offeredCtc ? parseFloat(offeredCtc) : 12.0,
        offerDate: offerDate || '2026-08-01'
      },
      create: {
        internshipId: req.params.id,
        studentId,
        companyId: company.id,
        status: status || 'OFFERED',
        role: role || 'Software Development Engineer',
        offeredCtc: offeredCtc ? parseFloat(offeredCtc) : 12.0,
        offerDate: offerDate || '2026-08-01'
      },
      include: { student: true }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: `UPDATE_PPO_${status || 'OFFERED'}`,
      entityType: 'PPO',
      entityId: ppo.id
    });

    await createNotification({
      userId: ppo.student.userId,
      type: 'PPO_OFFERED',
      title: 'Pre-Placement Offer (PPO) Received!',
      message: `Congratulations! ${company.name} offered you a PPO for the role of ${role || 'Software Engineer'} with CTC of ${offeredCtc || 12} LPA.`
    });

    return res.json({ success: true, data: ppo });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/tnp/ppo (T&P lists all PPOs across college)
router.get('/tnp/ppo', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req, res) => {
  try {
    const ppos = await prisma.pPO.findMany({
      include: {
        student: true,
        company: true,
        internship: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json({ success: true, data: ppos });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
