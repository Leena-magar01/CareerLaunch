import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 13: Structured Mentor & Company Evaluation Rubrics & Deterministic Aggregation', () => {
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

  beforeAll(async () => {
    // 1. T&P Officer
    const tnpRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `tnp.eval.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'TNP',
        fullName: 'Prof. TPO Dean',
        department: 'TPO'
      });
    tnpToken = tnpRes.body.data.token;
    tnpUserId = tnpRes.body.data.user.id;

    // 2. Assigned Mentor
    const mRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `mentor.eval.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Dr. Suresh Patil',
        department: 'CSE'
      });
    mentorToken = mRes.body.data.token;
    mentorUserId = mRes.body.data.user.id;
    mentorProfileId = mRes.body.data.user.profile.id;

    // 3. Unassigned Mentor
    const umRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `unassigned.eval.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Prof. Neha Gupta',
        department: 'ECE'
      });
    unassignedMentorToken = umRes.body.data.token;
    unassignedMentorUserId = umRes.body.data.user.id;

    // 4. Student
    const sRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.eval.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Sameer Joshi',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 9.1
      });
    studentToken = sRes.body.data.token;
    studentUserId = sRes.body.data.user.id;
    studentProfileId = sRes.body.data.user.profile.id;

    // 5. Company
    const cRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.eval.${Date.now()}@cybercorp.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'CyberCorp Lead',
        companyName: 'CyberCorp Security'
      });
    companyToken = cRes.body.data.token;
    companyUserId = cRes.body.data.user.id;
    companyProfileId = cRes.body.data.user.profile.id;

    // 6. Competitor Company
    const compRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `competitor.eval.${Date.now()}@rivalcorp.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Rival Recruiter',
        companyName: 'RivalCorp'
      });
    competitorCompanyToken = compRes.body.data.token;
    competitorCompanyUserId = compRes.body.data.user.id;

    // Create Vacancy & Application
    const vRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Cybersecurity Analyst Intern',
        description: 'Threat hunting, SOC analysis, and penetration testing.',
        durationMonths: 6,
        stipend: 45000,
        vacancies: 2,
        minCgpa: 8.0,
        maxBacklogs: 0,
        allowedBranches: ['CSE'],
        passingYears: [2026],
        requiredSkills: ['SIEM', 'Python', 'Networking'],
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
      await prisma.evaluation.deleteMany({ where: { internshipId: vacancyId } });
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

  describe('Evaluation Validation & Error Guardrails', () => {
    it('should REJECT incomplete evaluation missing core criteria (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/evaluations`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          studentId: studentProfileId,
          technicalScore: 8.5,
          problemSolvingScore: 8.0
          // Missing communicationScore, professionalismScore, teamworkScore
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INCOMPLETE_EVALUATION');
    });

    it('should REJECT evaluation with invalid score range (<0 or >10) (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/evaluations`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          studentId: studentProfileId,
          technicalScore: 12.0, // Invalid: > 10
          problemSolvingScore: -2.0, // Invalid: < 0
          communicationScore: 8.5,
          professionalismScore: 9.0,
          teamworkScore: 8.5
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_SCORE_RANGE');
    });

    it('should REJECT Unassigned Mentor from evaluating student (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/evaluations`)
        .set('Authorization', `Bearer ${unassignedMentorToken}`)
        .send({
          studentId: studentProfileId,
          technicalScore: 8.0,
          problemSolvingScore: 8.0,
          communicationScore: 8.0,
          professionalismScore: 8.0,
          teamworkScore: 8.0
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNASSIGNED_MENTOR_ACCESS');
    });

    it('should REJECT competitor company from submitting evaluation (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/evaluations`)
        .set('Authorization', `Bearer ${competitorCompanyToken}`)
        .send({
          studentId: studentProfileId,
          technicalScore: 8.0,
          problemSolvingScore: 8.0,
          communicationScore: 8.0,
          professionalismScore: 8.0,
          teamworkScore: 8.0
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED_COMPANY_ACCESS');
    });
  });

  describe('Structured Evaluation Submissions', () => {
    it('should allow assigned Mentor to submit evaluation (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/evaluations`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          studentId: studentProfileId,
          technicalScore: 9.0,
          problemSolvingScore: 8.5,
          communicationScore: 9.0,
          professionalismScore: 9.5,
          teamworkScore: 8.5,
          disciplineScore: 9.0,
          taskCompletionScore: 9.0,
          comments: 'Exceptional theoretical knowledge and diligent project documentation.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evaluatorRole).toBe('MENTOR');
      expect(res.body.data.overallScore).toBe(8.93);
    });

    it('should PREVENT duplicate mentor evaluation for the same student (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/evaluations`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          studentId: studentProfileId,
          technicalScore: 9.0,
          problemSolvingScore: 8.5,
          communicationScore: 9.0,
          professionalismScore: 9.5,
          teamworkScore: 8.5
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_EVALUATION');
    });

    it('should allow Company to submit employer evaluation (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/evaluations`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({
          studentId: studentProfileId,
          technicalScore: 9.5,
          problemSolvingScore: 9.0,
          communicationScore: 8.5,
          professionalismScore: 9.0,
          teamworkScore: 9.0,
          disciplineScore: 8.5,
          taskCompletionScore: 9.5,
          comments: 'Outstanding practical contribution to SOC incident response workflows.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evaluatorRole).toBe('COMPANY');
      expect(res.body.data.overallScore).toBe(9.0);
    });

    it('should PREVENT duplicate company evaluation for the same student (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyId}/evaluations`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({
          studentId: studentProfileId,
          technicalScore: 9.0,
          problemSolvingScore: 9.0,
          communicationScore: 9.0,
          professionalismScore: 9.0,
          teamworkScore: 9.0
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_EVALUATION');
    });
  });

  describe('Deterministic Aggregation & Final Evaluation Summary', () => {
    it('should aggregate final evaluation score deterministically (40% Mentor + 60% Company)', async () => {
      const res = await request(app)
        .get(`/api/v1/internships/${vacancyId}/evaluations/summary/${studentProfileId}`)
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isComplete).toBe(true);

      // Mentor overall: 8.93, Company overall: 9.00
      // Weighted: (8.93 * 0.40) + (9.00 * 0.60) = 3.572 + 5.4 = 8.97
      expect(res.body.data.finalScore).toBe(8.97);
      expect(res.body.data.grade).toContain('A');
      expect(res.body.data.aiFeedbackSummary).toContain('Exceptional theoretical knowledge');
      expect(res.body.data.aiFeedbackSummary).toContain('SOC incident response');
    });
  });

  describe('Immutable Audit Trail Verification', () => {
    it('should verify audit logs capture mentor and company evaluations', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: { entityType: 'Evaluation' }
      });

      expect(auditLogs.length).toBeGreaterThanOrEqual(2);
      const actions = auditLogs.map(l => l.action);
      expect(actions).toContain('EVALUATION_SUBMITTED');
    });
  });
});
