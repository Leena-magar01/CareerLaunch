import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { createAuditLog } from '../src/services/auditService';
import { sanitizeStudentProfile, createRateLimiter } from '../src/middleware/security';
import express from 'express';

describe('Phase 19: Security Hardening, Audit Trails & Privacy Protection', () => {
  let tnpToken: string;
  let tnpUserId: string;

  let studentToken: string;
  let studentUserId: string;

  let companyToken: string;
  let companyUserId: string;

  let mentorToken: string;
  let mentorUserId: string;

  beforeAll(async () => {
    // 1. T&P Admin
    const tnpRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `tnp.sec.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'TNP',
        fullName: 'Prof. Suresh Sharma',
        department: 'TNP_CELL'
      });
    tnpToken = tnpRes.body.data.token;
    tnpUserId = tnpRes.body.data.user.id;

    // 2. Student
    const sRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.sec.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Aditya Deshmukh',
        department: 'CSE'
      });
    studentToken = sRes.body.data.token;
    studentUserId = sRes.body.data.user.id;

    // 3. Company
    const cRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.sec.${Date.now()}@cybercorp.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'CyberCorp HR',
        companyName: 'CyberCorp Technologies'
      });
    companyToken = cRes.body.data.token;
    companyUserId = cRes.body.data.user.id;

    // 4. Mentor
    const mRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `mentor.sec.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Dr. Anand Joshi',
        department: 'CSE'
      });
    mentorToken = mRes.body.data.token;
    mentorUserId = mRes.body.data.user.id;
  });

  afterAll(async () => {
    if (tnpUserId) {
      await prisma.auditLog.deleteMany({ where: { actorId: tnpUserId } });
      await prisma.user.delete({ where: { id: tnpUserId } }).catch(() => {});
    }
    if (studentUserId) await prisma.user.delete({ where: { id: studentUserId } }).catch(() => {});
    if (companyUserId) await prisma.user.delete({ where: { id: companyUserId } }).catch(() => {});
    if (mentorUserId) await prisma.user.delete({ where: { id: mentorUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('1. HTTP Security Headers', () => {
    it('should set enterprise security headers on all responses', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('2. Sliding-Window Rate Limiting', () => {
    it('should throttle requests exceeding configured rate limit (429 Too Many Requests)', async () => {
      const testApp = express();
      const limiter = createRateLimiter({ windowMs: 1000, max: 2, message: 'Too many requests' });
      testApp.get('/test-rate-limit', limiter, (req, res) => res.json({ ok: true }));

      // Request 1: OK
      const res1 = await request(testApp).get('/test-rate-limit');
      expect(res1.status).toBe(200);

      // Request 2: OK
      const res2 = await request(testApp).get('/test-rate-limit');
      expect(res2.status).toBe(200);

      // Request 3: Blocked (429)
      const res3 = await request(testApp).get('/test-rate-limit');
      expect(res3.status).toBe(429);
      expect(res3.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res3.headers['retry-after']).toBeDefined();
    });
  });

  describe('3. Student Privacy & Sensitive Data Redaction', () => {
    it('should strip password hash and sensitive fields when viewed by recruiters or mentors', () => {
      const rawStudent = {
        id: 'student-123',
        fullName: 'Aditya Deshmukh',
        cgpa: 9.2,
        user: {
          id: 'user-123',
          email: 'aditya@college.edu',
          password: '$2a$10$e8g3j2k9l1m4n7o0p3q6r9s2t5u8v1w4x7y0z3a6b9c2d5e8f1g4'
        }
      };

      const sanitizedForCompany = sanitizeStudentProfile(rawStudent, 'COMPANY');
      expect(sanitizedForCompany.user.password).toBeUndefined();
      expect(sanitizedForCompany.user.email).toBe('aditya@college.edu');
      expect(sanitizedForCompany.fullName).toBe('Aditya Deshmukh');

      const sanitizedForMentor = sanitizeStudentProfile(rawStudent, 'MENTOR');
      expect(sanitizedForMentor.user.password).toBeUndefined();
    });
  });

  describe('4. Audit Trail Recording & T&P Audit Query API', () => {
    it('should record audit logs for sensitive operations', async () => {
      await createAuditLog({
        actorId: tnpUserId,
        action: 'VERIFY_STUDENT',
        entityType: 'StudentProfile',
        entityId: 'student-profile-123',
        newDataJson: JSON.stringify({ status: 'VERIFIED' }),
        reason: 'All academic transcripts verified'
      });

      await createAuditLog({
        actorId: tnpUserId,
        action: 'APPROVE_COMPLETION',
        entityType: 'Completion',
        entityId: 'completion-123',
        newDataJson: JSON.stringify({ status: 'APPROVED', certificateId: 'CERT-2026-999' }),
        reason: 'Satisfied all evaluation rubric prerequisites'
      });

      const logs = await prisma.auditLog.findMany({ where: { actorId: tnpUserId } });
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.some(l => l.action === 'VERIFY_STUDENT')).toBe(true);
      expect(logs.some(l => l.action === 'APPROVE_COMPLETION')).toBe(true);
    });

    it('should allow T&P to query institutional audit logs (GET /api/v1/tnp/audit-logs)', async () => {
      const res = await request(app)
        .get('/api/v1/tnp/audit-logs')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter audit logs by action (GET /api/v1/tnp/audit-logs?action=VERIFY_STUDENT)', async () => {
      const res = await request(app)
        .get('/api/v1/tnp/audit-logs?action=VERIFY_STUDENT')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every((l: any) => l.action === 'VERIFY_STUDENT')).toBe(true);
    });
  });

  describe('5. RBAC & Security Boundary Enforcement', () => {
    it('should REJECT Student from querying audit logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/tnp/audit-logs')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT Company from querying audit logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/tnp/audit-logs')
        .set('Authorization', `Bearer ${companyToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT Faculty Mentor from querying audit logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/tnp/audit-logs')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT unauthenticated access to audit logs (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/v1/tnp/audit-logs');
      expect(res.status).toBe(401);
    });
  });
});
