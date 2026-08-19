import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 16: Institutional T&P Analytics & Multi-Dimensional Reporting', () => {
  let tnpToken: string;
  let tnpUserId: string;

  let mentorToken: string;
  let mentorUserId: string;
  let mentorProfileId: string;

  let studentToken: string;
  let studentUserId: string;
  let studentProfileId: string;

  let companyToken: string;
  let companyUserId: string;
  let companyProfileId: string;

  let competitorCompanyToken: string;
  let competitorCompanyUserId: string;
  let competitorCompanyProfileId: string;

  let vacancyId: string;

  beforeAll(async () => {
    // 1. T&P Officer
    const tnpRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `tnp.analytics.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'TNP',
        fullName: 'Prof. TPO Dean of Placements',
        department: 'TPO'
      });
    tnpToken = tnpRes.body.data.token;
    tnpUserId = tnpRes.body.data.user.id;

    // 2. Faculty Mentor
    const mRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `mentor.analytics.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Dr. Anand Deshpande',
        department: 'CSE'
      });
    mentorToken = mRes.body.data.token;
    mentorUserId = mRes.body.data.user.id;
    mentorProfileId = mRes.body.data.user.profile.id;

    // 3. Student (CSE)
    const sRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.analytics.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Pooja Hegde',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 9.5
      });
    studentToken = sRes.body.data.token;
    studentUserId = sRes.body.data.user.id;
    studentProfileId = sRes.body.data.user.profile.id;

    // Mark student verified
    await prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: { profileStatus: 'VERIFIED' }
    });

    // 4. Company
    const cRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.analytics.${Date.now()}@alphatech.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'AlphaTech Recruiter',
        companyName: 'AlphaTech Cloud'
      });
    companyToken = cRes.body.data.token;
    companyUserId = cRes.body.data.user.id;
    companyProfileId = cRes.body.data.user.profile.id;

    // 5. Competitor Company
    const compRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `competitor.analytics.${Date.now()}@betacorp.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'BetaCorp Recruiter',
        companyName: 'BetaCorp Global'
      });
    competitorCompanyToken = compRes.body.data.token;
    competitorCompanyUserId = compRes.body.data.user.id;
    competitorCompanyProfileId = compRes.body.data.user.profile.id;

    // Create Vacancy & Application & Assignment & Completion & PPO
    const vRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Cloud DevOps Intern',
        description: 'Kubernetes, Terraform, and CI/CD automation.',
        durationMonths: 6,
        stipend: 60000,
        vacancies: 2,
        minCgpa: 8.0,
        maxBacklogs: 0,
        allowedBranches: ['CSE'],
        passingYears: [2026],
        requiredSkills: ['Kubernetes', 'AWS'],
        status: 'OPEN'
      });
    vacancyId = vRes.body.data.id;

    await prisma.application.create({
      data: { internshipId: vacancyId, studentId: studentProfileId, status: 'COMPLETED' }
    });

    await prisma.mentorAssignment.create({
      data: {
        internshipId: vacancyId,
        studentId: studentProfileId,
        mentorId: mentorProfileId,
        assignedBy: tnpUserId,
        status: 'COMPLETED'
      }
    });

    await prisma.completion.create({
      data: {
        internshipId: vacancyId,
        studentId: studentProfileId,
        certificateId: `CERT-2026-${Date.now()}`,
        status: 'APPROVED',
        completionDate: new Date(),
        finalScore: 9.5,
        grade: 'A+ (Outstanding)'
      }
    });

    await prisma.pPO.create({
      data: {
        internshipId: vacancyId,
        studentId: studentProfileId,
        companyId: companyProfileId,
        role: 'DevOps Engineer',
        offeredCtc: 18.0,
        status: 'OFFERED',
        isVerified: true
      }
    });

    await prisma.evaluation.create({
      data: {
        internshipId: vacancyId,
        studentId: studentProfileId,
        evaluatorId: companyUserId,
        evaluatorRole: 'COMPANY',
        technicalScore: 9.5,
        problemSolvingScore: 9.5,
        communicationScore: 9.0,
        professionalismScore: 9.5,
        teamworkScore: 9.5,
        disciplineScore: 9.5,
        taskCompletionScore: 9.5,
        overallScore: 9.43
      }
    });
  });

  afterAll(async () => {
    if (vacancyId) {
      await prisma.evaluation.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.pPO.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.completion.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.mentorAssignment.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.application.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.internship.delete({ where: { id: vacancyId } }).catch(() => {});
    }
    if (studentUserId) await prisma.user.delete({ where: { id: studentUserId } }).catch(() => {});
    if (mentorUserId) await prisma.user.delete({ where: { id: mentorUserId } }).catch(() => {});
    if (companyUserId) await prisma.user.delete({ where: { id: companyUserId } }).catch(() => {});
    if (competitorCompanyUserId) await prisma.user.delete({ where: { id: competitorCompanyUserId } }).catch(() => {});
    if (tnpUserId) await prisma.user.delete({ where: { id: tnpUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Institutional Dashboard Analytics', () => {
    it('should return institutional dashboard metrics (GET /api/v1/analytics/dashboard)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { metrics, funnel, departmentDistribution, stipendStats } = res.body.data;
      expect(metrics.totalStudents).toBeGreaterThanOrEqual(1);
      expect(metrics.verifiedStudents).toBeGreaterThanOrEqual(1);
      expect(metrics.eligibleStudents).toBeGreaterThanOrEqual(1);
      expect(metrics.completedInternships).toBeGreaterThanOrEqual(1);
      expect(metrics.completionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.ppoCount).toBeGreaterThanOrEqual(1);
      expect(metrics.ppoRate).toBeGreaterThanOrEqual(0);

      expect(funnel.length).toBe(8);
      expect(departmentDistribution.length).toBeGreaterThanOrEqual(1);
      expect(stipendStats.max).toBeGreaterThanOrEqual(60000);
    });

    it('should support department-level filtering (GET /api/v1/analytics/dashboard?department=CSE)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard?department=CSE')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.totalStudents).toBeGreaterThanOrEqual(1);
    });

    it('should support batch-level filtering (GET /api/v1/analytics/dashboard?passingYear=2026)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard?passingYear=2026')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.totalStudents).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Company Analytics Reporting', () => {
    it('should return all companies analytics for T&P (GET /api/v1/analytics/companies)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/companies')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const alpha = res.body.data.find((c: any) => c.companyId === companyProfileId);
      expect(alpha).toBeDefined();
      expect(alpha.internshipsPosted).toBeGreaterThanOrEqual(1);
      expect(alpha.completedInternships).toBeGreaterThanOrEqual(1);
      expect(alpha.pposOffered).toBeGreaterThanOrEqual(1);
      expect(alpha.avgEvaluationScore).toBeGreaterThanOrEqual(9.0);
    });

    it('should allow company to view own analytics (GET /api/v1/analytics/companies/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/companies/${companyProfileId}`)
        .set('Authorization', `Bearer ${companyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe('AlphaTech Cloud');
      expect(res.body.data.avgEvaluationScore).toBeGreaterThanOrEqual(9.0);
    });

    it('should REJECT company from viewing competitor company analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/companies/${companyProfileId}`)
        .set('Authorization', `Bearer ${competitorCompanyToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Mentor Workload & Performance Analytics', () => {
    it('should return all mentors analytics for T&P (GET /api/v1/analytics/mentors)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/mentors')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const target = res.body.data.find((m: any) => m.mentorId === mentorProfileId);
      expect(target).toBeDefined();
      expect(target.mentorName).toBe('Dr. Anand Deshpande');
      expect(target.assignedStudents).toBeGreaterThanOrEqual(1);
      expect(target.completionRate).toBe(100.0);
    });

    it('should allow mentor to view own workload analytics (GET /api/v1/analytics/mentors/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/mentors/${mentorProfileId}`)
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mentorName).toBe('Dr. Anand Deshpande');
      expect(res.body.data.assignedStudents).toBeGreaterThanOrEqual(1);
    });
  });

  describe('RBAC Protection', () => {
    it('should REJECT Student from accessing institutional analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT Faculty Mentor from accessing institutional analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
