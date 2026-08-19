import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';

const router = Router();

// GET /api/v1/tnp/audit-logs - Institutional Audit Trail Query
router.get('/', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { page = '1', pageSize = '25', action, entityType, actorId } = req.query;
    const p = Math.max(1, parseInt(String(page), 10));
    const ps = Math.max(1, Math.min(100, parseInt(String(pageSize), 10)));

    const where: any = {};
    if (action) where.action = String(action);
    if (entityType) where.entityType = String(entityType);
    if (actorId) where.actorId = String(actorId);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps
      }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({
      success: true,
      data: logs,
      meta: {
        total,
        page: p,
        pageSize: ps,
        totalPages: Math.ceil(total / ps)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
