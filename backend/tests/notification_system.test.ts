import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { notifyUser } from '../src/services/notifications/notificationService';

describe('Phase 18: Centralized Notification System & Multi-Channel Delivery', () => {
  let user1Token: string;
  let user1Id: string;

  let user2Token: string;
  let user2Id: string;

  let notif1Id: string;
  let notif2Id: string;

  beforeAll(async () => {
    // 1. User 1 (Student)
    const u1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.notif1.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Rohit Kulkarni',
        department: 'CSE'
      });
    user1Token = u1Res.body.data.token;
    user1Id = u1Res.body.data.user.id;

    // 2. User 2 (Mentor)
    const u2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `mentor.notif2.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Dr. Sunita Rao',
        department: 'CSE'
      });
    user2Token = u2Res.body.data.token;
    user2Id = u2Res.body.data.user.id;
  });

  afterAll(async () => {
    if (user1Id) {
      await prisma.notification.deleteMany({ where: { userId: user1Id } });
      await prisma.user.delete({ where: { id: user1Id } }).catch(() => {});
    }
    if (user2Id) {
      await prisma.notification.deleteMany({ where: { userId: user2Id } });
      await prisma.user.delete({ where: { id: user2Id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('Centralized Event-Driven Notification Dispatch', () => {
    it('should dispatch notifications for distinct business events', async () => {
      // 1. REGISTRATION
      await notifyUser({
        userId: user1Id,
        type: 'REGISTRATION',
        templateParams: { userName: 'Rohit Kulkarni' }
      });

      // 2. OFFER
      await notifyUser({
        userId: user1Id,
        type: 'OFFER',
        templateParams: { companyName: 'CloudCorp Global', internshipTitle: 'Backend Engineer' }
      });

      // 3. TNP_APPROVAL
      await notifyUser({
        userId: user1Id,
        type: 'TNP_APPROVAL',
        templateParams: { companyName: 'CloudCorp Global' }
      });

      // 4. MENTOR_ASSIGNMENT
      await notifyUser({
        userId: user1Id,
        type: 'MENTOR_ASSIGNMENT',
        templateParams: { mentorName: 'Dr. Sunita Rao' }
      });

      // 5. CERTIFICATE
      await notifyUser({
        userId: user1Id,
        type: 'CERTIFICATE',
        templateParams: { certificateId: 'CERT-2026-ABCD-1234' }
      });

      // 6. PPO
      await notifyUser({
        userId: user1Id,
        type: 'PPO',
        templateParams: { companyName: 'CloudCorp Global', roleName: 'Associate Engineer', ctc: 14.0, status: 'OFFERED' }
      });

      const user1Notifs = await prisma.notification.findMany({ where: { userId: user1Id } });
      expect(user1Notifs.length).toBeGreaterThanOrEqual(6);

      const types = user1Notifs.map(n => n.type);
      expect(types).toContain('REGISTRATION');
      expect(types).toContain('OFFER');
      expect(types).toContain('TNP_APPROVAL');
      expect(types).toContain('MENTOR_ASSIGNMENT');
      expect(types).toContain('CERTIFICATE');
      expect(types).toContain('PPO');

      notif1Id = user1Notifs[0].id;
      notif2Id = user1Notifs[1].id;
    });
  });

  describe('Notification Management API', () => {
    it('should list user in-app notifications (GET /api/v1/notifications)', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(6);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(6);
      expect(res.body.meta.unreadCount).toBeGreaterThanOrEqual(6);
    });

    it('should fetch unread notifications count (GET /api/v1/notifications/unread-count)', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(6);
    });

    it('should mark a single notification as read (PATCH /api/v1/notifications/:id/read)', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${notif1Id}/read`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).toBeDefined();
    });

    it('should filter unread notifications only (GET /api/v1/notifications?unreadOnly=true)', async () => {
      const res = await request(app)
        .get('/api/v1/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const readItem = res.body.data.find((n: any) => n.id === notif1Id);
      expect(readItem).toBeUndefined();
    });

    it('should mark all notifications as read (PATCH /api/v1/notifications/read-all)', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const countRes = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(countRes.body.data.unreadCount).toBe(0);
    });

    it('should delete a notification (DELETE /api/v1/notifications/:id)', async () => {
      const res = await request(app)
        .delete(`/api/v1/notifications/${notif2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await prisma.notification.findUnique({ where: { id: notif2Id } });
      expect(check).toBeNull();
    });
  });

  describe('Security & Ownership Boundaries', () => {
    it('should REJECT User 2 from marking User 1 notification as read (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${notif1Id}/read`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT User 2 from deleting User 1 notification (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/notifications/${notif1Id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT unauthenticated access to notification endpoints (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });
  });
});
