import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 14: Internship Completion Pipeline & Verifiable Certificates', () => {
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

  let vacancyId: string;
  let applicationId: string;
  let assignmentId: string;
  let completionRecordId: string;
  let generatedCertificateId: string;

  beforeAll(async () => {
    // 1. T&P Officer
    const tnpRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `tnp.comp.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'TNP',
        fullName: 'Prof. TPO Placement Head',
        department: 'TPO'
      });
    tnpToken = tnpRes.body.data.token;
    tnpUserId = tnpRes.body.data.user.id;

    // 2. Mentor
    const mRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `mentor.comp.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Dr. Vivek Ranade',
        department: 'CSE'
      });
    mentorToken = mRes.body.data.token;
    mentorUserId = mRes.body.data.user.id;
    mentorProfileId = mRes.body.data.user.profile.id;

    // 3. Student
    const sRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.comp.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Aditya Deshmukh',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 9.3
      });
    studentToken = sRes.body.data.token;
    studentUserId = sRes.body.data.user.id;
    studentProfileId = sRes.body.data.user.profile.id;

    // 4. Company
    const cRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.comp.${Date.now()}@fintechlab.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Fintech Recruiter',
        companyName: 'Fintech Labs Global'
      });
    companyToken = cRes.body.data.token;
    companyUserId = cRes.body.data.user.id;
    companyProfileId = cRes.body.data.user.profile.id;

    // 5. Vacancy & Application & Offer
    const vRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Full Stack Engineer Intern',
        description: 'React, Node.js, and Distributed Transactions.',
        durationMonths: 6,
        stipend: 50000,
        vacancies: 2,
        minCgpa: 8.0,
        maxBacklogs: 0,
        allowedBranches: ['CSE'],
        passingYears: [2026],
        requiredSkills: ['React', 'TypeScript', 'Node.js'],
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
      await prisma.completion.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.evaluation.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.progressReport.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.mentorAssignment.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.application.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.internship.delete({ where: { id: vacancyId } }).catch(() => {});
    }
    if (studentUserId) await prisma.user.delete({ where: { id: studentUserId } }).catch(() => {});
    if (mentorUserId) await prisma.user.delete({ where: { id: mentorUserId } }).catch(() => {});
    if (companyUserId) await prisma.user.delete({ where: { id: companyUserId } }).catch(() => {});
    if (tnpUserId) await prisma.user.delete({ where: { id: tnpUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Completion Prerequisite Validations', () => {
    it('should REJECT completion recommendation when prerequisites are missing (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/completions/recommend`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          studentId: studentProfileId,
          remarks: 'Attempting completion before evaluations and reports.'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('COMPLETION_PREREQUISITES_NOT_MET');
      expect(res.body.error.missingConditions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Completion Recommendation & Approval Workflow', () => {
    it('should satisfy prerequisites (progress report + mentor eval + company eval)', async () => {
      // 1. Submit & Approve Weekly Progress Report
      const rep = await prisma.progressReport.create({
        data: {
          internshipId: vacancyId,
          studentId: studentProfileId,
          mentorId: mentorProfileId,
          weekNumber: 1,
          tasks: 'Engineered high-throughput payment processing pipeline.',
          learning: 'Kafka streams and distributed locks.',
          challenges: 'Optimizing Redis transaction latencies.',
          hours: 40,
          status: 'APPROVED'
        }
      });
      expect(rep.id).toBeDefined();

      // 2. Mentor Evaluation
      const mEval = await prisma.evaluation.create({
        data: {
          internshipId: vacancyId,
          studentId: studentProfileId,
          evaluatorId: mentorUserId,
          evaluatorRole: 'MENTOR',
          technicalScore: 9.5,
          problemSolvingScore: 9.0,
          communicationScore: 9.0,
          professionalismScore: 9.5,
          teamworkScore: 9.0,
          disciplineScore: 9.5,
          taskCompletionScore: 9.5,
          overallScore: 9.29,
          comments: 'Exemplary technical leadership throughout the semester.'
        }
      });
      expect(mEval.id).toBeDefined();

      // 3. Company Evaluation
      const cEval = await prisma.evaluation.create({
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
          disciplineScore: 9.0,
          taskCompletionScore: 9.5,
          overallScore: 9.36,
          comments: 'High performance engineer. Ready for full-time conversion.'
        }
      });
      expect(cEval.id).toBeDefined();
    });

    it('should allow Mentor or Company to RECOMMEND completion (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/completions/recommend`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({
          studentId: studentProfileId,
          remarks: 'Successfully completed 6-month internship deliverables with excellence.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RECOMMENDED');
      expect(res.body.data.prerequisitesMet).toBe(true);
      expect(res.body.data.finalScore).toBeDefined();
      expect(res.body.data.grade).toContain('A');

      completionRecordId = res.body.data.id;
    });

    it('should BLOCK certificate retrieval prior to T&P approval (400 Bad Request)', async () => {
      const res = await request(app)
        .get(`/api/v1/internships/${vacancyId}/completions/certificate/${studentProfileId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('COMPLETION_NOT_APPROVED');
    });

    it('should REJECT Student attempting to approve completion (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/completions/${completionRecordId}/verify`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow T&P to APPROVE completion and generate certificate (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/completions/${completionRecordId}/verify`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.certificateId).toBeDefined();
      expect(res.body.data.certificateId).toMatch(/^CERT-2026-/);
      expect(res.body.data.completionDate).toBeDefined();

      generatedCertificateId = res.body.data.certificateId;
    });
  });

  describe('Verifiable Certificate Retrieval & Public Verification', () => {
    it('should allow Student to retrieve verified certificate (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/internships/${vacancyId}/completions/certificate/${studentProfileId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.certificateId).toBe(generatedCertificateId);
      expect(res.body.data.studentName).toBe('Aditya Deshmukh');
      expect(res.body.data.companyName).toBe('Fintech Labs Global');
      expect(res.body.data.grade).toContain('A');
      expect(res.body.data.verificationUrl).toContain(generatedCertificateId);
    });

    it('should allow public verification of certificate without authentication (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/verify/certificate/${generatedCertificateId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verified).toBe(true);
      expect(res.body.data.certificateId).toBe(generatedCertificateId);
      expect(res.body.data.companyName).toBe('Fintech Labs Global');
      expect(res.body.data.accreditation).toContain('Autonomous Institutional Placement');
    });

    it('should return 404 for non-existent or unapproved certificate identifier', async () => {
      const res = await request(app)
        .get('/api/v1/verify/certificate/CERT-INVALID-9999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CERTIFICATE_NOT_FOUND');
    });
  });

  describe('Immutable Audit Trail Verification', () => {
    it('should verify audit logs capture completion recommendation and T&P approval', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: { entityType: 'Completion' }
      });

      const actions = auditLogs.map(l => l.action);
      expect(actions).toContain('COMPLETION_RECOMMENDED');
      expect(actions).toContain('COMPLETION_APPROVED');
    });
  });
});
