import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 9: Company Selection & Offer Management', () => {
  let student1Token: string;
  let student1UserId: string;
  let student1ProfileId: string;

  let student2Token: string;
  let student2UserId: string;
  let student2ProfileId: string;

  let companyAToken: string;
  let companyAUserId: string;
  let companyAProfileId: string;

  let companyBToken: string;
  let companyBUserId: string;
  let companyBProfileId: string;

  let vacancyId: string;
  let app1Id: string;
  let app2Id: string;
  let offer1Id: string;
  let offer2Id: string;

  beforeAll(async () => {
    // 1. Register Student 1
    const s1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.sel1.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Devansh Kulkarni',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 9.1
      });
    student1Token = s1Res.body.data.token;
    student1UserId = s1Res.body.data.user.id;
    student1ProfileId = s1Res.body.data.user.profile.id;

    await request(app)
      .put('/api/v1/students/me')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'] });

    // 2. Register Student 2
    const s2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.sel2.${Date.now()}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Pooja Patil',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 8.4
      });
    student2Token = s2Res.body.data.token;
    student2UserId = s2Res.body.data.user.id;
    student2ProfileId = s2Res.body.data.user.profile.id;

    await request(app)
      .put('/api/v1/students/me')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ skills: ['React', 'Node.js', 'PostgreSQL'] });

    // 3. Register Company A
    const cARes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.a.${Date.now()}@nexustech.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Nexus Recruiter',
        companyName: 'Nexus Tech Labs',
        industry: 'Software Engineering'
      });
    companyAToken = cARes.body.data.token;
    companyAUserId = cARes.body.data.user.id;
    companyAProfileId = cARes.body.data.user.profile.id;

    // 4. Register Company B
    const cBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.b.${Date.now()}@rivalcorp.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Rival Recruiter',
        companyName: 'Rival Corp',
        industry: 'Consulting'
      });
    companyBToken = cBRes.body.data.token;
    companyBUserId = cBRes.body.data.user.id;
    companyBProfileId = cBRes.body.data.user.profile.id;

    // 5. Company A creates vacancy
    const vacRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        title: 'Full Stack Engineering Intern',
        description: 'React, Node, and TypeScript backend microservices.',
        durationMonths: 6,
        stipend: 40000,
        vacancies: 2,
        minCgpa: 7.0,
        maxBacklogs: 0,
        allowedBranches: ['CSE', 'IT'],
        passingYears: [2026],
        requiredSkills: ['React', 'Node.js'],
        status: 'OPEN'
      });
    vacancyId = vacRes.body.data.id;

    // 6. Both students apply
    const a1Res = await request(app)
      .post(`/api/v1/internships/${vacancyId}/apply`)
      .set('Authorization', `Bearer ${student1Token}`);
    app1Id = a1Res.body.data.id;

    const a2Res = await request(app)
      .post(`/api/v1/internships/${vacancyId}/apply`)
      .set('Authorization', `Bearer ${student2Token}`);
    app2Id = a2Res.body.data.id;
  });

  afterAll(async () => {
    if (vacancyId) {
      await prisma.application.deleteMany({ where: { internshipId: vacancyId } });
      await prisma.internship.delete({ where: { id: vacancyId } }).catch(() => {});
    }
    if (student1UserId) await prisma.user.delete({ where: { id: student1UserId } }).catch(() => {});
    if (student2UserId) await prisma.user.delete({ where: { id: student2UserId } }).catch(() => {});
    if (companyAUserId) await prisma.user.delete({ where: { id: companyAUserId } }).catch(() => {});
    if (companyBUserId) await prisma.user.delete({ where: { id: companyBUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Candidate Review & State Machine Transitions', () => {
    it('should transition Student 1 from APPLIED -> UNDER_REVIEW (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${app1Id}/status`)
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({ status: 'UNDER_REVIEW' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UNDER_REVIEW');
    });

    it('should transition Student 1 from UNDER_REVIEW -> SHORTLISTED (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${app1Id}/status`)
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({ status: 'SHORTLISTED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SHORTLISTED');
    });

    it('should transition Student 1 from SHORTLISTED -> SELECTED (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${app1Id}/status`)
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({ status: 'SELECTED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SELECTED');
    });

    it('should transition Student 2 from APPLIED -> REJECTED (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${app2Id}/status`)
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({ status: 'REJECTED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('REJECTED');
    });

    it('should REJECT invalid state transition from REJECTED -> SHORTLISTED (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${app2Id}/status`)
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({ status: 'SHORTLISTED' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('Strict Cross-Company Authorization', () => {
    it('should REJECT Company B attempting to shortlist Company A candidate (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${app1Id}/status`)
        .set('Authorization', `Bearer ${companyBToken}`)
        .send({ status: 'SHORTLISTED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT Company B attempting to issue offer for Company A candidate (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${app1Id}/offer`)
        .set('Authorization', `Bearer ${companyBToken}`)
        .send({
          stipend: 50000,
          startDate: '2026-07-01'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Offer Generation & Details Verification', () => {
    it('should REJECT issuing offer for REJECTED candidate Student 2 (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${app2Id}/offer`)
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({
          role: 'Full Stack Engineering Intern',
          stipend: 40000
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_FOR_OFFER');
    });

    it('should successfully issue formal offer for selected Student 1 (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${app1Id}/offer`)
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({
          role: 'Lead Full Stack Engineering Intern',
          startDate: '2026-06-01',
          endDate: '2026-12-01',
          stipend: 45000,
          location: 'Pune Tech Center',
          terms: 'Standard IP assignment & 40hr work week.',
          acceptanceDeadline: '2026-12-31'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('Lead Full Stack Engineering Intern');
      expect(res.body.data.stipend).toBe(45000);
      expect(res.body.data.location).toBe('Pune Tech Center');
      expect(res.body.data.status).toBe('ISSUED');
      expect(res.body.data.studentResponse).toBe('PENDING');
      expect(res.body.data.verificationCode).toBeDefined();

      offer1Id = res.body.data.id;
    });

    it('should retrieve offer in student offer feed (GET /api/v1/offers/me)', async () => {
      const res = await request(app)
        .get('/api/v1/offers/me')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const targetOffer = res.body.data.find((o: any) => o.id === offer1Id);
      expect(targetOffer).toBeDefined();
      expect(targetOffer.role).toBe('Lead Full Stack Engineering Intern');
    });
  });

  describe('Student Offer Response Workflow', () => {
    it('should REJECT Student 2 from responding to Student 1 offer (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/offers/${offer1Id}/respond`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ response: 'ACCEPTED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow Student 1 to ACCEPT offer (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/offers/${offer1Id}/respond`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ response: 'ACCEPTED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentResponse).toBe('ACCEPTED');
      expect(res.body.data.status).toBe('TNP_REVIEW'); // Queued for T&P review

      // Verify application status updated to OFFER_ACCEPTED
      const appRecord = await prisma.application.findUnique({ where: { id: app1Id } });
      expect(appRecord?.status).toBe('OFFER_ACCEPTED');
    });

    it('should REJECT re-responding to an already accepted offer (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/offers/${offer1Id}/respond`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ response: 'DECLINED' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ALREADY_RESPONDED');
    });
  });

  describe('Student Offer Decline Workflow', () => {
    let declineVacId: string;
    beforeAll(async () => {
      // Create a fresh vacancy and application for decline testing
      const decVac = await prisma.internship.create({
        data: {
          companyId: companyAProfileId,
          title: 'Frontend Testing Intern',
          description: 'UI automated testing and quality assurance.',
          location: 'Pune',
          deadline: '2026-12-31',
          allowedBranches: JSON.stringify(['CSE']),
          passingYears: JSON.stringify([2026]),
          requiredSkills: JSON.stringify(['React']),
          durationMonths: 3,
          stipend: 30000,
          vacancies: 1,
          status: 'OPEN'
        }
      });
      declineVacId = decVac.id;

      const newApp = await prisma.application.create({
        data: {
          internshipId: declineVacId,
          studentId: student2ProfileId,
          status: 'SELECTED'
        }
      });
      const newOffer = await prisma.offer.create({
        data: {
          applicationId: newApp.id,
          role: 'Frontend Testing Intern',
          stipend: 30000,
          status: 'ISSUED',
          studentResponse: 'PENDING'
        }
      });
      offer2Id = newOffer.id;
    });

    afterAll(async () => {
      if (declineVacId) {
        await prisma.application.deleteMany({ where: { internshipId: declineVacId } });
        await prisma.internship.delete({ where: { id: declineVacId } }).catch(() => {});
      }
    });

    it('should allow Student 2 to DECLINE offer (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/offers/${offer2Id}/respond`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ response: 'DECLINED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentResponse).toBe('DECLINED');
      expect(res.body.data.status).toBe('DECLINED');
    });
  });

  describe('Comprehensive Audit Trail Verification', () => {
    it('should verify audit logs were written for all key selection & offer transitions', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          OR: [
            { entityId: app1Id },
            { entityId: app2Id },
            { entityId: offer1Id }
          ]
        }
      });

      const actions = auditLogs.map(l => l.action);
      expect(actions).toContain('APPLICATION_SHORTLISTED');
      expect(actions).toContain('APPLICATION_SELECTED');
      expect(actions).toContain('APPLICATION_REJECTED');
      expect(actions).toContain('ISSUE_OFFER');
      expect(actions).toContain('OFFER_ACCEPTED');
    });
  });
});
