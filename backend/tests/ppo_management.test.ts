import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 15: PPO Lifecycle Management & Deterministic Verification', () => {
  let tnpToken: string;
  let tnpUserId: string;

  let student1Token: string;
  let student1UserId: string;
  let student1ProfileId: string;

  let student2Token: string;
  let student2UserId: string;
  let student2ProfileId: string;

  let companyToken: string;
  let companyUserId: string;
  let companyProfileId: string;

  let competitorCompanyToken: string;
  let competitorCompanyUserId: string;

  let vacancyId: string;
  let ppo1Id: string;
  let ppo2Id: string;

  beforeAll(async () => {
    // 1. T&P Officer
    const tnpRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `tnp.ppo.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'TNP',
        fullName: 'Prof. TPO Placement Chair',
        department: 'TPO'
      });
    tnpToken = tnpRes.body.data.token;
    tnpUserId = tnpRes.body.data.user.id;

    // 2. Student 1
    const s1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student1.ppo.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Meera Kulkarni',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 9.4
      });
    student1Token = s1Res.body.data.token;
    student1UserId = s1Res.body.data.user.id;
    student1ProfileId = s1Res.body.data.user.profile.id;

    // 3. Student 2
    const s2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student2.ppo.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Nikhil Rane',
        department: 'IT',
        passingYear: 2026,
        cgpa: 8.8
      });
    student2Token = s2Res.body.data.token;
    student2UserId = s2Res.body.data.user.id;
    student2ProfileId = s2Res.body.data.user.profile.id;

    // 4. Company
    const cRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.ppo.${Date.now()}@enterprise.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Enterprise HR Lead',
        companyName: 'Enterprise AI Systems'
      });
    companyToken = cRes.body.data.token;
    companyUserId = cRes.body.data.user.id;
    companyProfileId = cRes.body.data.user.profile.id;

    // 5. Competitor Company
    const compRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `competitor.ppo.${Date.now()}@othercorp.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Competitor HR',
        companyName: 'CompetitorCorp'
      });
    competitorCompanyToken = compRes.body.data.token;
    competitorCompanyUserId = compRes.body.data.user.id;

    // Create Vacancy & Applications
    const vRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Machine Learning Research Intern',
        description: 'NLP models and distributed training.',
        durationMonths: 6,
        stipend: 55000,
        vacancies: 2,
        minCgpa: 8.0,
        maxBacklogs: 0,
        allowedBranches: ['CSE', 'IT'],
        passingYears: [2026],
        requiredSkills: ['Python', 'PyTorch'],
        status: 'OPEN'
      });
    vacancyId = vRes.body.data.id;

    await prisma.application.create({
      data: { internshipId: vacancyId, studentId: student1ProfileId, status: 'COMPLETED' }
    });

    await prisma.application.create({
      data: { internshipId: vacancyId, studentId: student2ProfileId, status: 'COMPLETED' }
    });
  });

  afterAll(async () => {
    if (vacancyId) {
      await prisma.pPO.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.application.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.internship.delete({ where: { id: vacancyId } }).catch(() => {});
    }
    if (student1UserId) await prisma.user.delete({ where: { id: student1UserId } }).catch(() => {});
    if (student2UserId) await prisma.user.delete({ where: { id: student2UserId } }).catch(() => {});
    if (companyUserId) await prisma.user.delete({ where: { id: companyUserId } }).catch(() => {});
    if (competitorCompanyUserId) await prisma.user.delete({ where: { id: competitorCompanyUserId } }).catch(() => {});
    if (tnpUserId) await prisma.user.delete({ where: { id: tnpUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Company PPO Offer Submission', () => {
    it('should allow company to submit PPO offer for Student 1 (201 Created, status: OFFERED)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/ppo`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({
          studentId: student1ProfileId,
          role: 'Associate AI Engineer',
          offeredCtc: 16.5,
          offerDate: '2026-08-15',
          joiningDate: '2026-09-01',
          location: 'Pune / Hybrid',
          terms: 'Standard full-time employment agreement with health insurance and performance bonuses.',
          status: 'OFFERED'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('OFFERED');
      expect(res.body.data.offeredCtc).toBe(16.5);
      expect(res.body.data.role).toBe('Associate AI Engineer');
      expect(res.body.data.isVerified).toBe(false);

      ppo1Id = res.body.data.id;
    });

    it('should REJECT competitor company from submitting PPO for another company intern (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/ppo`)
        .set('Authorization', `Bearer ${competitorCompanyToken}`)
        .send({
          studentId: student1ProfileId,
          role: 'Rival Role',
          offeredCtc: 18.0
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED_COMPANY_ACCESS');
    });

    it('should allow company to submit PPO offer for Student 2 (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/ppo`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({
          studentId: student2ProfileId,
          role: 'Associate AI Engineer',
          offeredCtc: 15.0,
          status: 'OFFERED'
        });

      expect(res.status).toBe(201);
      ppo2Id = res.body.data.id;
    });
  });

  describe('T&P PPO Registry & Verification', () => {
    it('should list all institutional PPO records in T&P queue (GET /api/v1/tnp/ppo)', async () => {
      const res = await request(app)
        .get('/api/v1/tnp/ppo')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const target = res.body.data.find((p: any) => p.id === ppo1Id);
      expect(target).toBeDefined();
      expect(target.student.fullName).toBe('Meera Kulkarni');
      expect(target.offeredCtc).toBe(16.5);
    });

    it('should allow T&P to verify PPO offer (200 OK, isVerified: true)', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/ppo/${ppo1Id}/verify`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          status: 'VERIFIED',
          remarks: 'Verified against official enterprise offer letter.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isVerified).toBe(true);
      expect(res.body.data.verifiedBy).toBe(tnpUserId);
      expect(res.body.data.verificationRemarks).toContain('Verified against official');
    });

    it('should REJECT Student attempting to verify PPO (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/ppo/${ppo1Id}/verify`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ status: 'VERIFIED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Student PPO Inspection & Decision Responses', () => {
    it('should allow Student 1 to view verified PPO details (GET /api/v1/students/me/ppo)', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/ppo')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const ppo = res.body.data[0];
      expect(ppo.id).toBe(ppo1Id);
      expect(ppo.isVerified).toBe(true);
      expect(ppo.role).toBe('Associate AI Engineer');
      expect(ppo.offeredCtc).toBe(16.5);
      expect(ppo.company.name).toBe('Enterprise AI Systems');
    });

    it('should allow Student 1 to ACCEPT PPO offer (200 OK, status: ACCEPTED)', async () => {
      const res = await request(app)
        .post(`/api/v1/students/me/ppo/${ppo1Id}/respond`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          response: 'ACCEPTED',
          remarks: 'Excited to accept the pre-placement offer!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACCEPTED');
      expect(res.body.data.studentResponseDate).toBeDefined();
    });

    it('should allow Student 2 to DECLINE PPO offer (200 OK, status: DECLINED)', async () => {
      const res = await request(app)
        .post(`/api/v1/students/me/ppo/${ppo2Id}/respond`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          response: 'DECLINED',
          remarks: 'Pursuing MS in Computer Science.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DECLINED');
    });

    it('should REJECT Student 2 attempting to respond to Student 1 PPO (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/students/me/ppo/${ppo1Id}/respond`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ response: 'DECLINED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Immutable Audit Trail & Record Integrity', () => {
    it('should verify audit logs capture PPO offer, verification, acceptance, and decline', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: { entityType: 'PPO' }
      });

      const actions = auditLogs.map(l => l.action);
      expect(actions).toContain('PPO_OFFERED');
      expect(actions).toContain('PPO_VERIFIED');
      expect(actions).toContain('PPO_ACCEPTED');
      expect(actions).toContain('PPO_DECLINED');
    });
  });
});
