import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 17: AI Features, Assistant Layer & Anti-Hallucination Guardrails', () => {
  let studentToken: string;
  let studentUserId: string;
  let studentProfileId: string;

  let mentorToken: string;
  let mentorUserId: string;
  let mentorProfileId: string;

  let companyToken: string;
  let companyUserId: string;

  let vacancyId: string;

  beforeAll(async () => {
    // 1. Mentor
    const mRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `mentor.ai.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Prof. Ramesh Kulkarni',
        department: 'CSE'
      });
    mentorToken = mRes.body.data.token;
    mentorUserId = mRes.body.data.user.id;
    mentorProfileId = mRes.body.data.user.profile.id;

    // 2. Student
    const sRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.ai.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Karan Sharma',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 9.1
      });
    studentToken = sRes.body.data.token;
    studentUserId = sRes.body.data.user.id;
    studentProfileId = sRes.body.data.user.profile.id;

    // Add student skills, projects, and experiences
    await prisma.studentSkill.createMany({
      data: [
        { studentId: studentProfileId, skillName: 'React' },
        { studentId: studentProfileId, skillName: 'TypeScript' },
        { studentId: studentProfileId, skillName: 'Node.js' }
      ]
    });

    await prisma.project.create({
      data: {
        studentId: studentProfileId,
        title: 'Microservices E-Commerce Portal',
        technologies: 'React, Node.js, Redis, Docker',
        description: 'Engineered high-concurrency order placement engine.'
      }
    });

    // 3. Company
    const cRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.ai.${Date.now()}@nexustech.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Nexus Recruiter',
        companyName: 'Nexus Cloud Innovations'
      });
    companyToken = cRes.body.data.token;
    companyUserId = cRes.body.data.user.id;

    // Create Vacancy
    const vRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Full Stack Web Developer Intern',
        description: 'React, TypeScript, GraphQL, and microservice architectures.',
        durationMonths: 6,
        stipend: 45000,
        vacancies: 2,
        minCgpa: 8.0,
        maxBacklogs: 0,
        allowedBranches: ['CSE'],
        passingYears: [2026],
        requiredSkills: ['React', 'TypeScript', 'Node.js', 'Docker', 'GraphQL'],
        status: 'OPEN'
      });
    vacancyId = vRes.body.data.id;

    // Create Progress Reports
    await prisma.progressReport.create({
      data: {
        internshipId: vacancyId,
        studentId: studentProfileId,
        mentorId: mentorProfileId,
        weekNumber: 1,
        tasks: 'Setup React TypeScript project and integrated authentication.',
        learning: 'JWT session management and stateful routing.',
        challenges: 'Configuring Docker development containers.',
        hours: 40,
        status: 'APPROVED'
      }
    });
  });

  afterAll(async () => {
    if (vacancyId) {
      await prisma.progressReport.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.internship.delete({ where: { id: vacancyId } }).catch(() => {});
    }
    if (studentUserId) await prisma.user.delete({ where: { id: studentUserId } }).catch(() => {});
    if (mentorUserId) await prisma.user.delete({ where: { id: mentorUserId } }).catch(() => {});
    if (companyUserId) await prisma.user.delete({ where: { id: companyUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('1. Candidate Matching & Internship Recommendations', () => {
    it('should compute explainable multi-factor candidate match (POST /api/v1/ai/match)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/match')
        .set('Authorization', `Bearer ${companyToken}`)
        .send({
          studentId: studentProfileId,
          internshipId: vacancyId
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.matchScore).toBeGreaterThanOrEqual(60);
      expect(res.body.data.factors.skillMatch).toBeGreaterThan(0);
      expect(res.body.data.factors.academicFit).toBeGreaterThan(0);
      expect(res.body.data.explanation).toBeDefined();
    });

    it('should rank open vacancies for student (GET /api/v1/ai/recommendations)', async () => {
      const res = await request(app)
        .get('/api/v1/ai/recommendations')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].matchScore).toBeDefined();
      expect(res.body.data[0].explanation).toBeDefined();
    });
  });

  describe('2. Skill-Gap & Resume Analysis', () => {
    it('should identify missing skills and prioritized learning roadmap (POST /api/v1/ai/skill-gap)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/skill-gap')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ internshipId: vacancyId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.missingSkills).toBeDefined();
      expect(res.body.data.recommendations.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.aiAdvice).toBeDefined();
    });

    it('should analyze resume text for strengths, weaknesses, and suggestions (POST /api/v1/ai/resume-analyze)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/resume-analyze')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          resumeText: 'Full Stack Engineer with React, TypeScript, Node.js. Built scalable e-commerce systems with Redis caching.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBeGreaterThan(50);
      expect(res.body.data.strengths.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.suggestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Report Summarization, Mentor Insights & Career Paths', () => {
    it('should summarize weekly progress reports for mentor (GET /api/v1/ai/weekly-report-summary/:id/:studentId)', async () => {
      const res = await request(app)
        .get(`/api/v1/ai/weekly-report-summary/${vacancyId}/${studentProfileId}`)
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reportsCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.keyMilestones.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate mentor insights and mentee consistency tracking (GET /api/v1/ai/mentor-insights/:studentId)', async () => {
      const res = await request(app)
        .get(`/api/v1/ai/mentor-insights/${studentProfileId}`)
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.menteeName).toBe('Karan Sharma');
      expect(res.body.data.consistencyStatus).toBe('ON_TRACK');
      expect(res.body.data.recommendations.length).toBeGreaterThanOrEqual(1);
    });

    it('should recommend career paths matching student profile (GET /api/v1/ai/career-recommendations)', async () => {
      const res = await request(app)
        .get('/api/v1/ai/career-recommendations')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recommendedPaths.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.recommendedPaths[0].role).toBeDefined();
    });
  });

  describe('4. Grounded AI Copilot & Anti-Hallucination Guardrails', () => {
    it('should provide grounded context answers for student eligibility query (POST /api/v1/ai/copilot)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/copilot')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ query: 'Am I eligible for 8.0 CGPA internships?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sourceGrounded).toBe(true);
      expect(res.body.data.answer).toContain('9.1');
    });

    it('should return "I don\'t have enough information." for out-of-bounds/missing data query', async () => {
      const res = await request(app)
        .post('/api/v1/ai/copilot')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ query: 'What is the private revenue and salary of CEO at Google?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.answer).toContain("I don't have enough information.");
    });

    it('should REJECT unauthenticated copilot request (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/copilot')
        .send({ query: 'Test query' });

      expect(res.status).toBe(401);
    });
  });
});
