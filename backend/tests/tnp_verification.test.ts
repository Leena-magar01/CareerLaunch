import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 6: T&P Verification Workflow & Institutional Tracking', () => {
  let tnpToken: string;
  let tnpUserId: string;

  let student1Token: string;
  let student1UserId: string;
  let student1ProfileId: string;

  let student2Token: string;
  let student2UserId: string;
  let student2ProfileId: string;

  beforeAll(async () => {
    // 1. Get or create T&P Admin
    const tnpRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'tnp@college.edu', password: 'password123' });

    if (tnpRes.body?.data?.token) {
      tnpToken = tnpRes.body.data.token;
      tnpUserId = tnpRes.body.data.user.id;
    } else {
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: `tnp.test.${Date.now()}@college.edu`, password: 'password123', role: 'TNP', fullName: 'TNP Admin' });
      tnpToken = reg.body.data.token;
      tnpUserId = reg.body.data.user.id;
    }

    // 2. Register Student 1 for verification
    const s1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `verify.student1.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Karan Mehra',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 8.7
      });
    student1Token = s1Res.body.data.token;
    student1UserId = s1Res.body.data.user.id;
    student1ProfileId = s1Res.body.data.user.profile.id;

    // 3. Register Student 2 for rejection / correction
    const s2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `verify.student2.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Sneha Rao',
        department: 'IT',
        passingYear: 2026,
        cgpa: 7.9
      });
    student2Token = s2Res.body.data.token;
    student2UserId = s2Res.body.data.user.id;
    student2ProfileId = s2Res.body.data.user.profile.id;
  });

  afterAll(async () => {
    if (student1UserId) {
      await prisma.notification.deleteMany({ where: { userId: student1UserId } });
      await prisma.user.delete({ where: { id: student1UserId } }).catch(() => {});
    }
    if (student2UserId) {
      await prisma.notification.deleteMany({ where: { userId: student2UserId } });
      await prisma.user.delete({ where: { id: student2UserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('T&P Verification Dashboard & Queue', () => {
    it('should submit student profile for verification', async () => {
      const res = await request(app)
        .post('/api/v1/students/me/submit-verification')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profileStatus).toBe('SUBMITTED');
    });

    it('should fetch institutional verification statistics (Verified, Rejected, Pending, Correction Required)', async () => {
      const res = await request(app)
        .get('/api/v1/tnp/students/stats')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.total).toBe('number');
      expect(typeof res.body.data.verified).toBe('number');
      expect(typeof res.body.data.pending).toBe('number');
      expect(typeof res.body.data.rejected).toBe('number');
      expect(typeof res.body.data.correctionRequired).toBe('number');
    });

    it('should list pending students with completeness scores and document lists', async () => {
      const res = await request(app)
        .get('/api/v1/tnp/students/pending')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const target = res.body.data.find((s: any) => s.id === student1ProfileId);
      expect(target).toBeDefined();
      expect(target.fullName).toBe('Karan Mehra');
      expect(target.completeness).toBeDefined();
    });

    it('should retrieve detailed review payload for a specific student', async () => {
      const res = await request(app)
        .get(`/api/v1/tnp/students/${student1ProfileId}/review`)
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.id).toBe(student1ProfileId);
      expect(res.body.data.completeness).toBeDefined();
      expect(Array.isArray(res.body.data.documents)).toBe(true);
    });
  });

  describe('T&P Verification Decision Actions', () => {
    it('should APPROVE student profile and update status to VERIFIED', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/students/${student1ProfileId}/verify`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          status: 'APPROVED',
          reason: 'Academic records and identity verified by T&P'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.profileStatus).toBe('VERIFIED');

      // Verify that student received notification
      const notif = await prisma.notification.findFirst({
        where: { userId: student1UserId, type: 'PROFILE_VERIFICATION' }
      });
      expect(notif).toBeDefined();
      expect(notif?.title).toContain('Profile Verified');
    });

    it('should request CORRECTION on student profile with itemized remarks', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/students/${student2ProfileId}/verify`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          status: 'CORRECTION_REQUIRED',
          remarks: 'Please re-upload semester 6 marksheet with higher resolution.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.profileStatus).toBe('CORRECTION_REQUIRED');
      expect(res.body.data.student.verificationRemark).toBe('Please re-upload semester 6 marksheet with higher resolution.');
    });

    it('should REJECT student profile with mandatory reason', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/students/${student2ProfileId}/verify`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          status: 'REJECTED',
          reason: 'Ineligible candidate due to institutional disciplinary policy violation.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.profileStatus).toBe('REJECTED');
      expect(res.body.data.student.verificationRemark).toContain('disciplinary policy');
    });

    it('should reject verification decision without reason when rejecting', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/students/${student2ProfileId}/verify`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          status: 'REJECTED'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('REASON_REQUIRED');
    });
  });
});
