import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 10: T&P Offer Verification & Institutional Governance', () => {
  let tnpToken: string;
  let tnpUserId: string;

  let studentToken: string;
  let studentUserId: string;
  let studentProfileId: string;

  let companyToken: string;
  let companyUserId: string;
  let companyProfileId: string;

  let vacancyId: string;
  let app1Id: string;
  let offer1Id: string;

  let app2Id: string;
  let offer2Id: string;

  let app3Id: string;
  let offer3Id: string;

  beforeAll(async () => {
    // 1. Register T&P Officer
    const tnpRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `tnp.officer.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'TNP',
        fullName: 'Prof. Ramesh Sharma',
        department: 'TPO'
      });
    tnpToken = tnpRes.body.data.token;
    tnpUserId = tnpRes.body.data.user.id;

    // 2. Register Student
    const sRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.offer.tnp.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Siddharth Joshi',
        department: 'IT',
        passingYear: 2026,
        cgpa: 8.8
      });
    studentToken = sRes.body.data.token;
    studentUserId = sRes.body.data.user.id;
    studentProfileId = sRes.body.data.user.profile.id;

    await request(app)
      .put('/api/v1/students/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ skills: ['Python', 'Django', 'Docker'] });

    // 3. Register Company
    const cRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.tnp.${Date.now()}@fintechglobal.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Fintech HR',
        companyName: 'Fintech Global Labs',
        industry: 'Banking & Financial Technology'
      });
    companyToken = cRes.body.data.token;
    companyUserId = cRes.body.data.user.id;
    companyProfileId = cRes.body.data.user.profile.id;

    // 4. Company creates vacancy
    const vacRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Backend Cloud Security Intern',
        description: 'Design and test secure API gateways.',
        durationMonths: 6,
        stipend: 48000,
        vacancies: 3,
        minCgpa: 7.5,
        maxBacklogs: 0,
        allowedBranches: ['CSE', 'IT'],
        passingYears: [2026],
        requiredSkills: ['Python', 'Docker'],
        status: 'OPEN'
      });
    vacancyId = vacRes.body.data.id;

    // 5. Student applies to vacancy
    const a1Res = await request(app)
      .post(`/api/v1/internships/${vacancyId}/apply`)
      .set('Authorization', `Bearer ${studentToken}`);
    app1Id = a1Res.body.data.id;

    // Shortlist candidate
    await request(app)
      .patch(`/api/v1/applications/${app1Id}/status`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'SHORTLISTED' });

    // 6. Company issues formal offer 1
    const off1Res = await request(app)
      .post(`/api/v1/applications/${app1Id}/offer`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        role: 'Backend Cloud Security Intern',
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        stipend: 48000,
        location: 'Mumbai Financial Centre',
        terms: 'NDA & full-time hybrid attendance.',
        acceptanceDeadline: '2026-12-31'
      });
    offer1Id = off1Res.body.data.id;

    // Student accepts offer 1 -> moves to TNP_REVIEW
    await request(app)
      .post(`/api/v1/offers/${offer1Id}/respond`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ response: 'ACCEPTED' });

    // Setup Offer 2 for Rejection test (Student 2)
    const s2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.offer2.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Aakash Verma',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 7.9
      });
    const s2ProfileId = s2Res.body.data.user.profile.id;

    const app2 = await prisma.application.create({
      data: {
        internshipId: vacancyId,
        studentId: s2ProfileId,
        status: 'SELECTED'
      }
    });
    app2Id = app2.id;
    const off2 = await prisma.offer.create({
      data: {
        applicationId: app2Id,
        role: 'Unaccredited Role',
        stipend: 15000,
        status: 'TNP_REVIEW',
        studentResponse: 'ACCEPTED'
      }
    });
    offer2Id = off2.id;

    // Setup Offer 3 for Correction test (Student 3)
    const s3Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.offer3.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Neha Kadam',
        department: 'IT',
        passingYear: 2026,
        cgpa: 8.2
      });
    const s3ProfileId = s3Res.body.data.user.profile.id;

    const app3 = await prisma.application.create({
      data: {
        internshipId: vacancyId,
        studentId: s3ProfileId,
        status: 'SELECTED'
      }
    });
    app3Id = app3.id;
    const off3 = await prisma.offer.create({
      data: {
        applicationId: app3Id,
        role: 'Junior DevOps Intern',
        stipend: 25000,
        status: 'TNP_REVIEW',
        studentResponse: 'ACCEPTED'
      }
    });
    offer3Id = off3.id;
  });

  afterAll(async () => {
    if (vacancyId) {
      await prisma.application.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.internship.delete({ where: { id: vacancyId } }).catch(() => {});
    }
    if (studentUserId) await prisma.user.delete({ where: { id: studentUserId } }).catch(() => {});
    if (companyUserId) await prisma.user.delete({ where: { id: companyUserId } }).catch(() => {});
    if (tnpUserId) await prisma.user.delete({ where: { id: tnpUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('T&P Offer Queue & Review Dossier', () => {
    it('should list pending offers for institutional review (GET /api/v1/tnp/offers/pending)', async () => {
      const res = await request(app)
        .get('/api/v1/tnp/offers/pending')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const target = res.body.data.find((o: any) => o.id === offer1Id);
      expect(target).toBeDefined();
      expect(target.application.student.fullName).toBe('Siddharth Joshi');
      expect(target.application.internship.company.name).toBe('Fintech Global Labs');
      expect(target.studentCompleteness).toBeDefined();
    });

    it('should provide deep review dossier for an individual offer (GET /api/v1/tnp/offers/:id/review)', async () => {
      const res = await request(app)
        .get(`/api/v1/tnp/offers/${offer1Id}/review`)
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.offer.id).toBe(offer1Id);
      expect(res.body.data.student.department).toBe('IT');
      expect(res.body.data.company.industry).toBe('Banking & Financial Technology');
      expect(res.body.data.internship.title).toBe('Backend Cloud Security Intern');
      expect(res.body.data.studentCompleteness.completenessScore).toBeGreaterThan(0);
    });
  });

  describe('T&P Decision: Approval Workflow', () => {
    it('should allow T&P to APPROVE verified offer (POST /api/v1/tnp/offers/:id/verify)', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/offers/${offer1Id}/verify`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          status: 'APPROVED',
          reason: 'Verified with company HR and matched degree credits.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.offer.status).toBe('APPROVED');
      expect(res.body.data.verification.status).toBe('APPROVED');

      // Verify Application is OFFER_ACCEPTED
      const appRecord = await prisma.application.findUnique({ where: { id: app1Id } });
      expect(appRecord?.status).toBe('OFFER_ACCEPTED');
    });
  });

  describe('T&P Decision: Rejection Workflow', () => {
    it('should REJECT without reason with 400 Bad Request (REASON_REQUIRED)', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/offers/${offer2Id}/verify`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          status: 'REJECTED'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('REASON_REQUIRED');
    });

    it('should allow T&P to REJECT offer with valid reason (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/offers/${offer2Id}/verify`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          status: 'REJECTED',
          reason: 'Company not accredited under university MoUs.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.offer.status).toBe('REJECTED');
      expect(res.body.data.verification.status).toBe('REJECTED');

      // Verify Application is REJECTED
      const appRecord = await prisma.application.findUnique({ where: { id: app2Id } });
      expect(appRecord?.status).toBe('REJECTED');
    });
  });

  describe('T&P Decision: Request Correction Workflow', () => {
    it('should allow T&P to request correction on offer terms (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/offers/${offer3Id}/verify`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          status: 'CORRECTION_REQUIRED',
          remarks: 'Stipend must be updated to meet minimum college guideline of ₹30,000/mo.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.offer.status).toBe('CORRECTION_REQUIRED');
      expect(res.body.data.verification.status).toBe('CORRECTION_REQUIRED');
    });
  });

  describe('RBAC & Role Restrictions', () => {
    it('should REJECT Student attempting to verify offer (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/offers/${offer1Id}/verify`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT Company attempting to verify offer (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/offers/${offer1Id}/verify`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT T&P attempting to submit company performance evaluation (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/evaluations`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          studentId: studentProfileId,
          technicalScore: 10
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Immutable Audit Trail Verification', () => {
    it('should verify audit logs capture T&P user, timestamp, decision, reason, previous and new status', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          OR: [
            { entityId: offer1Id },
            { entityId: offer2Id },
            { entityId: offer3Id }
          ]
        }
      });

      const actions = auditLogs.map(l => l.action);
      expect(actions).toContain('TNP_OFFER_APPROVED');
      expect(actions).toContain('TNP_OFFER_REJECTED');
      expect(actions).toContain('TNP_OFFER_CORRECTION_REQUIRED');

      const approvedLog = auditLogs.find(l => l.action === 'TNP_OFFER_APPROVED');
      expect(approvedLog?.actorId).toBe(tnpUserId);
      expect(approvedLog?.reason).toContain('Decision: APPROVED');
      expect(approvedLog?.reason).toContain('Previous Status: TNP_REVIEW');
      expect(approvedLog?.reason).toContain('New Status: APPROVED');
    });
  });
});
