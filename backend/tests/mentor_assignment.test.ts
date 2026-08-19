import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 11: Faculty Mentor Assignment & Governance', () => {
  let tnpToken: string;
  let tnpUserId: string;

  let mentor1Token: string;
  let mentor1UserId: string;
  let mentor1ProfileId: string;

  let mentor2Token: string;
  let mentor2UserId: string;
  let mentor2ProfileId: string;

  let student1Token: string;
  let student1UserId: string;
  let student1ProfileId: string;

  let student2Token: string;
  let student2UserId: string;
  let student2ProfileId: string;

  let companyToken: string;
  let companyUserId: string;
  let companyProfileId: string;

  let vacancyId: string;
  let app1Id: string;
  let app2Id: string;

  let assignment1Id: string;
  let assignment2Id: string;

  beforeAll(async () => {
    // 1. Register T&P Officer
    const tnpRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `tnp.mentor.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'TNP',
        fullName: 'Dr. S. K. Mahajan',
        department: 'TPO'
      });
    tnpToken = tnpRes.body.data.token;
    tnpUserId = tnpRes.body.data.user.id;

    // 2. Register Mentor 1 (CSE)
    const m1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `prof.cse.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Prof. Anjali Deshmukh',
        department: 'CSE',
        mentorTitle: 'Associate Professor'
      });
    mentor1Token = m1Res.body.data.token;
    mentor1UserId = m1Res.body.data.user.id;
    mentor1ProfileId = m1Res.body.data.user.profile.id;

    // 3. Register Mentor 2 (IT)
    const m2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `prof.it.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Prof. Vikram Rao',
        department: 'IT',
        mentorTitle: 'Assistant Professor'
      });
    mentor2Token = m2Res.body.data.token;
    mentor2UserId = m2Res.body.data.user.id;
    mentor2ProfileId = m2Res.body.data.user.profile.id;

    // 4. Register Student 1
    const s1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `mentee1.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Kunal Shinde',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 8.7
      });
    student1Token = s1Res.body.data.token;
    student1UserId = s1Res.body.data.user.id;
    student1ProfileId = s1Res.body.data.user.profile.id;

    // 5. Register Student 2
    const s2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `mentee2.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Tanvi Gaikwad',
        department: 'IT',
        passingYear: 2026,
        cgpa: 8.4
      });
    student2Token = s2Res.body.data.token;
    student2UserId = s2Res.body.data.user.id;
    student2ProfileId = s2Res.body.data.user.profile.id;

    // 6. Register Company & Create Vacancy
    const cRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.mentor.${Date.now()}@cloudtech.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Cloud Recruiter',
        companyName: 'CloudTech Systems',
        industry: 'Cloud Infrastructure'
      });
    companyToken = cRes.body.data.token;
    companyUserId = cRes.body.data.user.id;
    companyProfileId = cRes.body.data.user.profile.id;

    const vacRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Cloud DevOps Intern',
        description: 'Kubernetes, Terraform, and AWS CI/CD pipelines.',
        durationMonths: 6,
        stipend: 35000,
        vacancies: 3,
        minCgpa: 7.0,
        maxBacklogs: 0,
        allowedBranches: ['CSE', 'IT'],
        passingYears: [2026],
        requiredSkills: ['Docker', 'AWS'],
        status: 'OPEN'
      });
    vacancyId = vacRes.body.data.id;

    // Applications & Offers
    const a1 = await prisma.application.create({
      data: { internshipId: vacancyId, studentId: student1ProfileId, status: 'OFFER_ACCEPTED' }
    });
    app1Id = a1.id;
    await prisma.offer.create({
      data: { applicationId: app1Id, role: 'Cloud DevOps Intern', stipend: 35000, status: 'APPROVED', studentResponse: 'ACCEPTED' }
    });

    const a2 = await prisma.application.create({
      data: { internshipId: vacancyId, studentId: student2ProfileId, status: 'OFFER_ACCEPTED' }
    });
    app2Id = a2.id;
    await prisma.offer.create({
      data: { applicationId: app2Id, role: 'Cloud DevOps Intern', stipend: 35000, status: 'APPROVED', studentResponse: 'ACCEPTED' }
    });
  });

  afterAll(async () => {
    if (vacancyId) {
      await prisma.mentorAssignment.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.application.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.internship.delete({ where: { id: vacancyId } }).catch(() => {});
    }
    if (student1UserId) await prisma.user.delete({ where: { id: student1UserId } }).catch(() => {});
    if (student2UserId) await prisma.user.delete({ where: { id: student2UserId } }).catch(() => {});
    if (mentor1UserId) await prisma.user.delete({ where: { id: mentor1UserId } }).catch(() => {});
    if (mentor2UserId) await prisma.user.delete({ where: { id: mentor2UserId } }).catch(() => {});
    if (companyUserId) await prisma.user.delete({ where: { id: companyUserId } }).catch(() => {});
    if (tnpUserId) await prisma.user.delete({ where: { id: tnpUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('T&P Mentor Workload & Overview', () => {
    it('should retrieve faculty mentors with workload metrics (GET /api/v1/tnp/mentors/workload)', async () => {
      const res = await request(app)
        .get('/api/v1/tnp/mentors/workload')
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const m1 = res.body.data.find((m: any) => m.id === mentor1ProfileId);
      expect(m1).toBeDefined();
      expect(m1.fullName).toBe('Prof. Anjali Deshmukh');
      expect(m1.workloadPercentage).toBeDefined();
    });
  });

  describe('Mentor Assignment Lifecycle & Duplicate Guardrails', () => {
    it('should allow T&P to assign Mentor 1 to Student 1 (201 Created)', async () => {
      const res = await request(app)
        .post('/api/v1/tnp/assignments')
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          studentId: student1ProfileId,
          internshipId: vacancyId,
          mentorId: mentor1ProfileId,
          remarks: 'Assigned for Cloud DevOps semester internship.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ASSIGNED');
      expect(res.body.data.mentor.fullName).toBe('Prof. Anjali Deshmukh');

      assignment1Id = res.body.data.id;
    });

    it('should PREVENT duplicate active assignment for the same student (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/tnp/assignments')
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          studentId: student1ProfileId,
          internshipId: vacancyId,
          mentorId: mentor2ProfileId
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ACTIVE_ASSIGNMENT_EXISTS');
    });
  });

  describe('Mentor Workspace & Assignment Responses', () => {
    it('should list assignment in Mentor 1 workspace (GET /api/v1/mentors/me/assignments)', async () => {
      const res = await request(app)
        .get('/api/v1/mentors/me/assignments')
        .set('Authorization', `Bearer ${mentor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const target = res.body.data.find((a: any) => a.id === assignment1Id);
      expect(target).toBeDefined();
      expect(target.student.fullName).toBe('Kunal Shinde');
      expect(target.internship.title).toBe('Cloud DevOps Intern');
    });

    it('should allow Mentor 1 to ACCEPT assignment (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/mentors/assignments/${assignment1Id}/respond`)
        .set('Authorization', `Bearer ${mentor1Token}`)
        .send({ response: 'ACCEPTED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACCEPTED');
      expect(res.body.data.acceptedAt).toBeDefined();
    });

    it('should allow Mentor 2 to REJECT an assignment (200 OK)', async () => {
      // Assign Mentor 2 to Student 2 first
      const assignRes = await request(app)
        .post('/api/v1/tnp/assignments')
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          studentId: student2ProfileId,
          internshipId: vacancyId,
          mentorId: mentor2ProfileId
        });
      assignment2Id = assignRes.body.data.id;

      const res = await request(app)
        .post(`/api/v1/mentors/assignments/${assignment2Id}/respond`)
        .set('Authorization', `Bearer ${mentor2Token}`)
        .send({
          response: 'REJECTED',
          remarks: 'On research sabbatical this semester.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('REJECTED');
      expect(res.body.data.rejectedAt).toBeDefined();
    });
  });

  describe('T&P Mentor Reassignment Workflow', () => {
    it('should allow T&P to reassign Student 2 from Mentor 2 to Mentor 1 (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/tnp/assignments/${assignment2Id}/reassign`)
        .set('Authorization', `Bearer ${tnpToken}`)
        .send({
          newMentorId: mentor1ProfileId,
          reason: 'Reassigned due to faculty sabbatical leave.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ASSIGNED');
      expect(res.body.data.mentorId).toBe(mentor1ProfileId);

      // Verify old assignment is REASSIGNED
      const oldAssignment = await prisma.mentorAssignment.findUnique({ where: { id: assignment2Id } });
      expect(oldAssignment?.status).toBe('REASSIGNED');
      expect(oldAssignment?.reassignedAt).toBeDefined();
    });
  });

  describe('Unassigned Mentor Access Protection & RBAC', () => {
    it('should REJECT Mentor 2 attempting to view Student 1 dossier (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/mentors/me/students/${student1ProfileId}`)
        .set('Authorization', `Bearer ${mentor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNASSIGNED_MENTOR_ACCESS');
    });

    it('should ALLOW assigned Mentor 1 to view Student 1 dossier (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/mentors/me/students/${student1ProfileId}`)
        .set('Authorization', `Bearer ${mentor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.id).toBe(student1ProfileId);
      expect(res.body.data.assignment).toBeDefined();
    });

    it('should REJECT Student attempting to assign mentors (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/tnp/assignments')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          studentId: student2ProfileId,
          internshipId: vacancyId,
          mentorId: mentor1ProfileId
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT Mentor 2 attempting to respond to Mentor 1 assignment (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/mentors/assignments/${assignment1Id}/respond`)
        .set('Authorization', `Bearer ${mentor2Token}`)
        .send({ response: 'ACCEPTED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Immutable Audit Trail Verification', () => {
    it('should verify audit logs capture mentor assignment, accept, reject, and reassign', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: { entityType: 'MentorAssignment' }
      });

      const actions = auditLogs.map(l => l.action);
      expect(actions).toContain('MENTOR_ASSIGNED');
      expect(actions).toContain('MENTOR_ASSIGNMENT_ACCEPTED');
      expect(actions).toContain('MENTOR_ASSIGNMENT_REJECTED');
      expect(actions).toContain('MENTOR_REASSIGNED');
    });
  });
});
