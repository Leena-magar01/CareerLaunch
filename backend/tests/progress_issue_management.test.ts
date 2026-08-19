import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 12: Internship Progress Management & Multi-Stakeholder Issue Tracking', () => {
  let tnpToken: string;
  let tnpUserId: string;

  let mentorToken: string;
  let mentorUserId: string;
  let mentorProfileId: string;

  let unassignedMentorToken: string;
  let unassignedMentorUserId: string;

  let studentToken: string;
  let studentUserId: string;
  let studentProfileId: string;

  let companyToken: string;
  let companyUserId: string;
  let companyProfileId: string;

  let competitorCompanyToken: string;
  let competitorCompanyUserId: string;

  let vacancyId: string;
  let applicationId: string;
  let assignmentId: string;

  let report1Id: string;
  let report2Id: string;
  let issueId: string;

  beforeAll(async () => {
    // 1. T&P Officer
    const tnpRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `tnp.progress.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'TNP',
        fullName: 'Prof. TPO Lead',
        department: 'TPO'
      });
    tnpToken = tnpRes.body.data.token;
    tnpUserId = tnpRes.body.data.user.id;

    // 2. Assigned Mentor
    const mRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `mentor.prog.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Dr. Rajesh Iyer',
        department: 'CSE'
      });
    mentorToken = mRes.body.data.token;
    mentorUserId = mRes.body.data.user.id;
    mentorProfileId = mRes.body.data.user.profile.id;

    // 3. Unassigned Mentor
    const umRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `unassigned.mentor.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Prof. Kavita Rao',
        department: 'Mechanical'
      });
    unassignedMentorToken = umRes.body.data.token;
    unassignedMentorUserId = umRes.body.data.user.id;

    // 4. Student
    const sRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.prog.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Pooja Kulkarni',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 8.9
      });
    studentToken = sRes.body.data.token;
    studentUserId = sRes.body.data.user.id;
    studentProfileId = sRes.body.data.user.profile.id;

    // 5. Company
    const cRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.prog.${Date.now()}@fintech.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Fintech Recruiter',
        companyName: 'Fintech Solutions'
      });
    companyToken = cRes.body.data.token;
    companyUserId = cRes.body.data.user.id;
    companyProfileId = cRes.body.data.user.profile.id;

    // 6. Competitor Company
    const compRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `competitor.${Date.now()}@othercorp.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Other Recruiter',
        companyName: 'OtherCorp'
      });
    competitorCompanyToken = compRes.body.data.token;
    competitorCompanyUserId = compRes.body.data.user.id;

    // Create Vacancy & Application
    const vRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Backend Systems Engineer Intern',
        description: 'Microservices architecture with Node.js and PostgreSQL.',
        durationMonths: 6,
        stipend: 40000,
        vacancies: 2,
        minCgpa: 7.5,
        maxBacklogs: 0,
        allowedBranches: ['CSE'],
        passingYears: [2026],
        requiredSkills: ['Node.js', 'PostgreSQL'],
        status: 'OPEN'
      });
    vacancyId = vRes.body.data.id;

    const appRecord = await prisma.application.create({
      data: { internshipId: vacancyId, studentId: studentProfileId, status: 'OFFER_ACCEPTED' }
    });
    applicationId = appRecord.id;

    const asg = await prisma.mentorAssignment.create({
      data: {
        internshipId: vacancyId,
        studentId: studentProfileId,
        mentorId: mentorProfileId,
        assignedBy: tnpUserId,
        status: 'ACTIVE'
      }
    });
    assignmentId = asg.id;
  });

  afterAll(async () => {
    if (vacancyId) {
      await prisma.issue.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.progressReport.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.mentorAssignment.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.application.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.internship.delete({ where: { id: vacancyId } }).catch(() => {});
    }
    if (studentUserId) await prisma.user.delete({ where: { id: studentUserId } }).catch(() => {});
    if (mentorUserId) await prisma.user.delete({ where: { id: mentorUserId } }).catch(() => {});
    if (unassignedMentorUserId) await prisma.user.delete({ where: { id: unassignedMentorUserId } }).catch(() => {});
    if (companyUserId) await prisma.user.delete({ where: { id: companyUserId } }).catch(() => {});
    if (competitorCompanyUserId) await prisma.user.delete({ where: { id: competitorCompanyUserId } }).catch(() => {});
    if (tnpUserId) await prisma.user.delete({ where: { id: tnpUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Student Weekly Progress Report Submission', () => {
    it('should allow student to submit Week 1 progress report (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/progress-reports`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          weekNumber: 1,
          startDate: '2026-08-01',
          endDate: '2026-08-07',
          tasks: 'Setup local development environment, initialized database schemas, and configured Docker containers.',
          learning: 'Learned Docker multi-stage builds and Redis connection pooling.',
          challenges: 'Encountered network port conflicts with local database instance.',
          hours: 40
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.weekNumber).toBe(1);
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.taskVerificationStatus).toBe('PENDING');

      report1Id = res.body.data.id;
    });

    it('should PREVENT duplicate submission for the same week (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/progress-reports`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          weekNumber: 1,
          tasks: 'Duplicate attempt for week 1.'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WEEK_REPORT_EXISTS');
    });

    it('should allow student to submit Week 2 progress report (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/progress-reports`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          weekNumber: 2,
          tasks: 'Implemented JWT authentication and RBAC middlewares.',
          learning: 'Learned token refresh rotators.',
          challenges: 'Handling token expiry edge conditions.',
          hours: 42
        });

      expect(res.status).toBe(201);
      expect(res.body.data.weekNumber).toBe(2);
      report2Id = res.body.data.id;
    });
  });

  describe('Faculty Mentor Progress Review & Feedback', () => {
    it('should list submitted reports in Mentor queue (GET /api/v1/mentors/me/progress-reports)', async () => {
      const res = await request(app)
        .get('/api/v1/mentors/me/progress-reports')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow assigned Mentor to APPROVE Week 1 report (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/v1/reports/${report1Id}/review`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          status: 'APPROVED',
          feedback: 'Excellent progress on environment configuration and containerization.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.feedback).toContain('Excellent progress');
      expect(res.body.data.reviewedAt).toBeDefined();
    });

    it('should allow assigned Mentor to request CHANGES_REQUIRED on Week 2 report (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/v1/reports/${report2Id}/review`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          status: 'CHANGES_REQUIRED',
          feedback: 'Please attach test coverage metrics and API documentation.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CHANGES_REQUIRED');
    });

    it('should REJECT Unassigned Mentor attempting to review report (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/reports/${report1Id}/review`)
        .set('Authorization', `Bearer ${unassignedMentorToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNASSIGNED_MENTOR_ACCESS');
    });
  });

  describe('Company Supervisor Task Verification & Feedback', () => {
    it('should allow company to verify deliverables and provide observations (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/progress-reports/${report1Id}/company-feedback`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({
          taskVerificationStatus: 'VERIFIED',
          companyFeedback: 'Tasks completed as per sprint backlog with high code quality.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.taskVerificationStatus).toBe('VERIFIED');
      expect(res.body.data.companyFeedback).toContain('sprint backlog');
    });

    it('should REJECT competitor company from submitting feedback (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/progress-reports/${report1Id}/company-feedback`)
        .set('Authorization', `Bearer ${competitorCompanyToken}`)
        .send({ taskVerificationStatus: 'VERIFIED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED_COMPANY_ACCESS');
    });
  });

  describe('Multi-Stakeholder Issue Tracking & Resolution Workflow', () => {
    it('should allow Student to raise an internship issue (201 Created, status: OPEN)', async () => {
      const res = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          internshipId: vacancyId,
          priority: 'HIGH',
          title: 'Database access credentials delay',
          description: 'Awaiting staging database credentials from infrastructure team.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('OPEN');
      expect(res.body.data.priority).toBe('HIGH');

      issueId = res.body.data.id;
    });

    it('should list issues with filters (GET /api/v1/issues)', async () => {
      const res = await request(app)
        .get('/api/v1/issues?status=OPEN')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow Mentor or T&P to mark issue IN_PROGRESS', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('should allow resolving the issue with resolution notes (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          status: 'RESOLVED',
          resolution: 'Coordinated with Fintech DevOps team. IAM role provisioned.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RESOLVED');
      expect(res.body.data.resolution).toContain('IAM role provisioned');
      expect(res.body.data.resolvedAt).toBeDefined();
    });

    it('should allow closing the issue (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'CLOSED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CLOSED');
    });
  });

  describe('Immutable Audit Trail Verification', () => {
    it('should verify audit logs capture progress report submission, reviews, and issue lifecycles', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: { in: ['ProgressReport', 'Issue'] }
        }
      });

      const actions = auditLogs.map(l => l.action);
      expect(actions).toContain('PROGRESS_REPORT_SUBMITTED');
      expect(actions).toContain('PROGRESS_REPORT_APPROVED');
      expect(actions).toContain('PROGRESS_REPORT_CHANGES_REQUIRED');
      expect(actions).toContain('COMPANY_PROGRESS_FEEDBACK');
      expect(actions).toContain('ISSUE_CREATED');
      expect(actions).toContain('ISSUE_RESOLVED');
      expect(actions).toContain('ISSUE_CLOSED');
    });
  });
});
