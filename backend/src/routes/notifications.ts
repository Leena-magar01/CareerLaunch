import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/v1/notifications (Fetch user notifications)
router.get('/', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const { unreadOnly, page = '1', pageSize = '20' } = req.query;
    const p = Math.max(1, parseInt(String(page), 10));
    const ps = Math.max(1, Math.min(100, parseInt(String(pageSize), 10)));

    const where: any = { userId: req.user!.id };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } })
    ]);

    return res.json({
      success: true,
      data: notifications,
      meta: {
        total,
        unreadCount,
        page: p,
        pageSize: ps,
        totalPages: Math.ceil(total / ps)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/notifications/unread-count
router.get('/unread-count', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false }
    });

    return res.json({ success: true, data: { unreadCount } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/v1/notifications/:id/read (Mark single notification as read)
router.patch('/:id/read', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    }

    // Ownership check
    if (notification.userId !== req.user!.id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/v1/notifications/read-all (Mark all user notifications as read)
router.patch('/read-all', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// DELETE /api/v1/notifications/:id (Delete notification)
router.delete('/:id', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    }

    if (notification.userId !== req.user!.id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    await prisma.notification.delete({ where: { id: notification.id } });

    return res.json({ success: true, message: 'Notification deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
