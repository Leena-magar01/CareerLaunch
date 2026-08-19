import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import path from 'path';
import fs from 'fs';

describe('Phase 5: Student Registration, Profile & Document Management', () => {
  let studentToken: string;
  let studentUserId: string;
  let studentProfileId: string;

  let otherStudentToken: string;
  let otherStudentUserId: string;

  let tnpToken: string;

  let uploadedDocId: string;
  let resumeDocId: string;

  const testEmail = `test.student.${Date.now()}@college.edu`;
  const otherStudentEmail = `other.student.${Date.now()}@college.edu`;
  const testPassword = 'Password@123';

  beforeAll(async () => {
    // 1. Register T&P Admin or get token
    const tnpRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'tnp@college.edu', password: 'password123' });
    
    if (tnpRes.body?.data?.token) {
      tnpToken = tnpRes.body.data.token;
    } else {
      const regTnp = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: `tnp.${Date.now()}@college.edu`, password: 'password123', role: 'TNP', fullName: 'TNP Officer' });
      tnpToken = regTnp.body.data.token;
    }

    // 2. Register other student for unauthorized tests
    const otherRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: otherStudentEmail,
        password: testPassword,
        role: 'STUDENT',
        fullName: 'Other Student',
        department: 'IT',
        passingYear: 2026,
        cgpa: 7.8
      });
    otherStudentToken = otherRes.body.data.token;
    otherStudentUserId = otherRes.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up test users
    if (studentUserId) {
      await prisma.document.deleteMany({ where: { ownerUserId: studentUserId } });
      await prisma.user.delete({ where: { id: studentUserId } }).catch(() => {});
    }
    if (otherStudentUserId) {
      await prisma.document.deleteMany({ where: { ownerUserId: otherStudentUserId } });
      await prisma.user.delete({ where: { id: otherStudentUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // 1. REGISTRATION & INITIAL PROFILE CREATION
  describe('Student Registration', () => {
    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email-format',
          password: testPassword,
          role: 'STUDENT',
          fullName: 'Test Student'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with short password (< 6 chars)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `short.${Date.now()}@college.edu`,
          password: '123',
          role: 'STUDENT',
          fullName: 'Test Student'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should successfully register a new student and return token + profile with authoritative completeness', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          role: 'STUDENT',
          fullName: 'Alex Mercer',
          department: 'CSE',
          passingYear: 2026,
          cgpa: 8.4,
          backlogs: 0,
          bio: 'Aspiring software developer passionate about cloud engineering.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.user.profile.completeness).toBeDefined();
      expect(typeof res.body.data.user.profile.completeness.completenessScore).toBe('number');

      studentToken = res.body.data.token;
      studentUserId = res.body.data.user.id;
      studentProfileId = res.body.data.user.profile.id;
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          role: 'STUDENT',
          fullName: 'Duplicate Alex'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_EXISTS');
    });
  });

  // 2. PROFILE RETRIEVAL & STANDALONE COMPLETENESS
  describe('Student Profile & Completeness Calculation', () => {
    it('should retrieve current student profile with backend-calculated completeness', async () => {
      const res = await request(app)
        .get('/api/v1/students/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Alex Mercer');
      expect(res.body.data.department).toBe('CSE');
      expect(res.body.data.completeness).toBeDefined();
      expect(res.body.data.completeness.breakdown).toBeDefined();
      expect(res.body.data.completeness.breakdown.academic.completed).toBe(true);
    });

    it('should get standalone authoritative completeness breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/completeness')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.completenessScore).toBeGreaterThanOrEqual(0);
      expect(res.body.data.breakdown.personal).toBeDefined();
      expect(res.body.data.missingSections).toBeInstanceOf(Array);
    });
  });

  // 3. INPUT VALIDATION ON PROFILE UPDATE
  describe('Profile Validation Rules', () => {
    it('should reject invalid CGPA > 10.0', async () => {
      const res = await request(app)
        .put('/api/v1/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ cgpa: 11.5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject negative backlogs', async () => {
      const res = await request(app)
        .put('/api/v1/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ backlogs: -3 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // 4. PROFILE UPDATE & SECTION ENRICHMENT
  describe('Comprehensive Profile Management', () => {
    it('should update personal info, social links, preferences, and skills', async () => {
      const res = await request(app)
        .put('/api/v1/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          bio: 'Full-stack software developer with expertise in TypeScript, React, and Node.js.',
          phone: '+91 9876543210',
          linkedinUrl: 'https://linkedin.com/in/alexmercer',
          githubUrl: 'https://github.com/alexmercer',
          portfolioUrl: 'https://alexmercer.dev',
          preferredDomains: ['Web Development', 'Cloud Computing', 'AI/ML'],
          preferredMode: 'HYBRID',
          preferredLocations: ['Pune', 'Bangalore', 'Mumbai'],
          skills: [
            { skillName: 'React', proficiency: 'ADVANCED' },
            { skillName: 'Node.js', proficiency: 'ADVANCED' },
            { skillName: 'TypeScript', proficiency: 'INTERMEDIATE' },
            { skillName: 'PostgreSQL', proficiency: 'INTERMEDIATE' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe('+91 9876543210');
      expect(res.body.data.preferredMode).toBe('HYBRID');
      expect(res.body.data.skills.length).toBe(4);
      expect(res.body.data.completeness.breakdown.personal.completed).toBe(true);
      expect(res.body.data.completeness.breakdown.skills.completed).toBe(true);
    });

    it('should add a project and increase completeness score', async () => {
      const res = await request(app)
        .post('/api/v1/students/me/projects')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Enterprise Task Orchestrator',
          description: 'High-throughput distributed workflow system with Kafka and Redis.',
          technologies: 'Node.js, TypeScript, Redis, Docker',
          projectUrl: 'https://github.com/alexmercer/task-orchestrator'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Enterprise Task Orchestrator');
    });

    it('should add work experience', async () => {
      const res = await request(app)
        .post('/api/v1/students/me/experience')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          company: 'Acme Cloud Labs',
          role: 'Backend Intern',
          description: 'Built REST APIs and automated deployment pipelines.',
          startDate: '2025-06-01',
          endDate: '2025-08-31',
          isCurrent: false,
          location: 'Pune'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.company).toBe('Acme Cloud Labs');
    });

    it('should add certification', async () => {
      const res = await request(app)
        .post('/api/v1/students/me/certifications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'AWS Certified Cloud Practitioner',
          issuer: 'Amazon Web Services',
          issueDate: '2025-05-10'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('AWS Certified Cloud Practitioner');
    });
  });

  // 5. SECURE DOCUMENT STORAGE & ACCESS CONTROL
  describe('Document Storage & Access Control', () => {
    const dummyFilePath = path.resolve(__dirname, 'test-document.pdf');

    beforeAll(() => {
      fs.writeFileSync(dummyFilePath, '%PDF-1.4 Mock PDF file content for test');
    });

    afterAll(() => {
      if (fs.existsSync(dummyFilePath)) {
        fs.unlinkSync(dummyFilePath);
      }
    });

    it('should upload a verification document (COLLEGE_ID) with metadata saved to DB', async () => {
      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('documentType', 'COLLEGE_ID')
        .field('entityType', 'STUDENT')
        .attach('file', dummyFilePath);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document.documentType).toBe('COLLEGE_ID');
      expect(res.body.data.document.storageKey).toBeDefined();

      uploadedDocId = res.body.data.document.id;
    });

    it('should upload a RESUME and automatically link it to StudentProfile', async () => {
      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('documentType', 'RESUME')
        .field('entityType', 'STUDENT')
        .attach('file', dummyFilePath);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document.documentType).toBe('RESUME');

      resumeDocId = res.body.data.document.id;

      // Verify that StudentProfile.resumeDocumentId is updated
      const profileRes = await request(app)
        .get('/api/v1/students/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(profileRes.body.data.resumeDocumentId).toBe(resumeDocId);
      expect(profileRes.body.data.completeness.breakdown.resume.completed).toBe(true);
    });

    it('should allow document owner to access document metadata', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${uploadedDocId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(uploadedDocId);
    });

    it('should allow document owner to download the file', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${uploadedDocId}/file`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('should allow T&P Admin to access student documents (Governance)', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${uploadedDocId}`)
        .set('Authorization', `Bearer ${tnpToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should REJECT unauthorized student access with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${uploadedDocId}`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT unauthorized student file download with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${uploadedDocId}/file`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
