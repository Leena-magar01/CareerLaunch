import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 8: Eligible Matching & Student Applications', () => {
  let studentAToken: string;
  let studentAUserId: string;
  let studentAProfileId: string;

  let studentBToken: string;
  let studentBUserId: string;
  let studentBProfileId: string;

  let companyToken: string;
  let companyUserId: string;
  let companyProfileId: string;

  let openVacancyId: string;
  let closedVacancyId: string;
  let applicationId: string;

  beforeAll(async () => {
    // 1. Register High-Performing Eligible Student A
    const s1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.a.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Aarav Sharma',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 8.9
      });
    studentAToken = s1Res.body.data.token;
    studentAUserId = s1Res.body.data.user.id;
    studentAProfileId = s1Res.body.data.user.profile.id;

    // Update Student A skills & preferences
    await request(app)
      .put('/api/v1/students/me')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        skills: ['Java', 'Docker', 'Python', 'AWS', 'SQL'],
        preferredDomains: ['Cloud/DevOps', 'Full-Stack'],
        preferredMode: 'HYBRID',
        bio: 'Aspiring Cloud Architect and Backend Developer with hands-on container orchestration experience.'
      });

    // Add a project for Student A
    await request(app)
      .post('/api/v1/students/me/projects')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        title: 'Kubernetes Cloud Deployment Engine',
        technologies: 'Java, Docker, Kubernetes, AWS',
        description: 'Automated CI/CD deployment tool for microservices.'
      });

    // 2. Register Ineligible Student B (Low CGPA, Backlogs, MECH)
    const s2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.b.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Rohan Verma',
        department: 'MECH',
        passingYear: 2028,
        cgpa: 5.5
      });
    studentBToken = s2Res.body.data.token;
    studentBUserId = s2Res.body.data.user.id;
    studentBProfileId = s2Res.body.data.user.profile.id;

    // Set backlogs = 2 for Student B
    await request(app)
      .put('/api/v1/students/me')
      .set('Authorization', `Bearer ${studentBToken}`)
      .send({
        backlogs: 2,
        skills: ['AutoCAD', 'SolidWorks']
      });

    // 3. Register Company
    const compRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.match.${Date.now()}@cloudtech.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'CloudTech Talent Team',
        companyName: 'CloudTech Systems',
        industry: 'Cloud Infrastructure'
      });
    companyToken = compRes.body.data.token;
    companyUserId = compRes.body.data.user.id;
    companyProfileId = compRes.body.data.user.profile.id;

    // 4. Create Open Vacancy
    const openVacRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Cloud DevOps Associate Intern',
        description: 'Work with AWS, Docker, and Kubernetes pipelines.',
        durationMonths: 6,
        mode: 'HYBRID',
        location: 'Pune',
        stipend: 35000,
        vacancies: 3,
        deadline: '2026-12-31',
        minCgpa: 7.5,
        maxBacklogs: 0,
        allowedBranches: ['CSE', 'IT'],
        passingYears: [2026, 2027],
        requiredSkills: ['Java', 'Docker', 'AWS'],
        status: 'OPEN'
      });
    openVacancyId = openVacRes.body.data.id;

    // 5. Create Closed Vacancy
    const closedVacRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Legacy Systems Intern',
        durationMonths: 3,
        stipend: 15000,
        vacancies: 1,
        minCgpa: 6.0,
        status: 'CLOSED'
      });
    closedVacancyId = closedVacRes.body.data.id;
  });

  afterAll(async () => {
    if (studentAProfileId) {
      await prisma.application.deleteMany({ where: { studentId: studentAProfileId } });
    }
    if (studentBProfileId) {
      await prisma.application.deleteMany({ where: { studentId: studentBProfileId } });
    }
    if (companyProfileId) {
      await prisma.internship.deleteMany({ where: { companyId: companyProfileId } });
    }
    if (studentAUserId) await prisma.user.delete({ where: { id: studentAUserId } }).catch(() => {});
    if (studentBUserId) await prisma.user.delete({ where: { id: studentBUserId } }).catch(() => {});
    if (companyUserId) await prisma.user.delete({ where: { id: companyUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Deterministic Eligibility Filtering & Discovery', () => {
    it('should list open vacancies annotated with hard eligibility and match scores for Student A', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/eligible-internships')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const target = res.body.data.find((item: any) => item.internship.id === openVacancyId);
      expect(target).toBeDefined();
      expect(target.isEligible).toBe(true);
      expect(target.eligibility.eligible).toBe(true);
      expect(target.match.matchScore).toBeGreaterThanOrEqual(70);
      expect(target.match.factors.skillMatch).toBe(100); // Has Java, Docker, AWS
      expect(target.hasApplied).toBe(false);
    });

    it('should mark Vacancy 1 as INELIGIBLE for Student B with itemized reasons', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/eligible-internships')
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const target = res.body.data.find((item: any) => item.internship.id === openVacancyId);
      expect(target).toBeDefined();
      expect(target.isEligible).toBe(false);
      expect(target.eligibility.failedRules.length).toBeGreaterThan(0);
      expect(target.eligibility.reasons.some((r: string) => r.includes('CGPA'))).toBe(true);
      expect(target.eligibility.reasons.some((r: string) => r.includes('Department') || r.includes('Branch'))).toBe(true);
    });
  });

  describe('Application Submission & Guardrails', () => {
    it('should REJECT ineligible Student B from submitting application (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${openVacancyId}/apply`)
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INELIGIBLE');
      expect(Array.isArray(res.body.error.details)).toBe(true);
    });

    it('should REJECT application to a CLOSED vacancy (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${closedVacancyId}/apply`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VACANCY_CLOSED');
    });

    it('should successfully submit application for eligible Student A (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${openVacancyId}/apply`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPLIED');
      expect(res.body.data.aiMatchScore).toBeGreaterThanOrEqual(70);
      expect(res.body.data.matchExplanation).toBeDefined();

      applicationId = res.body.data.id;
    });

    it('should PREVENT duplicate applications by Student A (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${openVacancyId}/apply`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_APPLICATION');
    });
  });

  describe('Application Tracking & Withdrawal Lifecycle', () => {
    it('should list submitted applications for student with status and vacancy info', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/applications')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const appRec = res.body.data.find((a: any) => a.id === applicationId);
      expect(appRec).toBeDefined();
      expect(appRec.internship.title).toBe('Cloud DevOps Associate Intern');
      expect(appRec.status).toBe('APPLIED');
    });

    it('should REJECT Student B attempting to withdraw Student A application (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${applicationId}/withdraw`)
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow Student A to withdraw their own pending application (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${applicationId}/withdraw`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('WITHDRAWN');
    });

    it('should reject withdrawing an already withdrawn application', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${applicationId}/withdraw`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ALREADY_WITHDRAWN');
    });
  });

  describe('Company Recruiter Candidate Ranking & Review', () => {
    beforeAll(async () => {
      // Re-apply Student A after test
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'APPLIED' }
      });
    });

    it('should retrieve ranked applicants for company vacancy', async () => {
      const res = await request(app)
        .get(`/api/v1/internships/${openVacancyId}/applications`)
        .set('Authorization', `Bearer ${companyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const candidate = res.body.data[0];
      expect(candidate.student.fullName).toBe('Aarav Sharma');
      expect(candidate.aiMatchScore).toBeGreaterThanOrEqual(70);
      expect(candidate.completeness).toBeDefined();
    });

    it('should allow company to SHORTLIST candidate', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({ status: 'SHORTLISTED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SHORTLISTED');
    });
  });
});
