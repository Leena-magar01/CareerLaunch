import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 7: Company Portal & Internship Vacancy Management', () => {
  let companyAToken: string;
  let companyAUserId: string;
  let companyAProfileId: string;

  let companyBToken: string;
  let companyBUserId: string;
  let companyBProfileId: string;

  let vacancyAId: string;

  beforeAll(async () => {
    // 1. Register Company A
    const compARes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `comp.a.${Date.now()}@techcorp.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'TechCorp Recruiter',
        companyName: 'TechCorp Solutions',
        industry: 'Software & Cloud',
        website: 'https://techcorp.com',
        location: 'Bengaluru, India'
      });
    companyAToken = compARes.body.data.token;
    companyAUserId = compARes.body.data.user.id;
    companyAProfileId = compARes.body.data.user.profile.id;

    // 2. Register Company B (for unauthorized access tests)
    const compBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `comp.b.${Date.now()}@innovate.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'Innovate HR',
        companyName: 'Innovate Labs',
        industry: 'FinTech',
        website: 'https://innovatelabs.io',
        location: 'Mumbai, India'
      });
    companyBToken = compBRes.body.data.token;
    companyBUserId = compBRes.body.data.user.id;
    companyBProfileId = compBRes.body.data.user.profile.id;
  });

  afterAll(async () => {
    if (companyAProfileId) {
      await prisma.internship.deleteMany({ where: { companyId: companyAProfileId } });
    }
    if (companyBProfileId) {
      await prisma.internship.deleteMany({ where: { companyId: companyBProfileId } });
    }
    if (companyAUserId) {
      await prisma.user.delete({ where: { id: companyAUserId } }).catch(() => {});
    }
    if (companyBUserId) {
      await prisma.user.delete({ where: { id: companyBUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('Company Profile Management', () => {
    it('should retrieve authenticated company profile with statistics', async () => {
      const res = await request(app)
        .get('/api/v1/companies/me')
        .set('Authorization', `Bearer ${companyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(companyAProfileId);
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.totalVacancies).toBe(0);
    });

    it('should update company profile details with validation', async () => {
      const res = await request(app)
        .put('/api/v1/companies/me')
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({
          name: 'TechCorp Global Systems',
          industry: 'Enterprise Cloud & AI',
          website: 'https://techcorpglobal.com',
          location: 'Pune / Remote',
          phone: '+91 9876543210',
          contactName: 'Priya Sharma',
          contactEmail: 'priya.sharma@techcorp.com',
          description: 'Global provider of enterprise cloud infrastructure and ML pipelines.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('TechCorp Global Systems');
      expect(res.body.data.location).toBe('Pune / Remote');
      expect(res.body.data.phone).toBe('+91 9876543210');
    });

    it('should reject company update with invalid email format', async () => {
      const res = await request(app)
        .put('/api/v1/companies/me')
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({
          contactEmail: 'invalid-email-address'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Vacancy Creation & Multi-Factor Validation', () => {
    it('should reject vacancy creation with missing or short title (< 3 chars)', async () => {
      const res = await request(app)
        .post('/api/v1/internships')
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({
          title: 'AI',
          durationMonths: 6,
          stipend: 25000,
          vacancies: 3
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('at least 3 characters');
    });

    it('should reject vacancy creation with negative stipend', async () => {
      const res = await request(app)
        .post('/api/v1/internships')
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({
          title: 'Full Stack Engineer Intern',
          durationMonths: 6,
          stipend: -500,
          vacancies: 2
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('non-negative number');
    });

    it('should reject vacancy creation with invalid CGPA (> 10.0)', async () => {
      const res = await request(app)
        .post('/api/v1/internships')
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({
          title: 'Full Stack Engineer Intern',
          durationMonths: 6,
          stipend: 25000,
          vacancies: 2,
          minCgpa: 11.5
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('CGPA');
    });

    it('should successfully create vacancy with multi-factor eligibility criteria', async () => {
      const res = await request(app)
        .post('/api/v1/internships')
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({
          title: 'Cloud DevOps Intern',
          description: 'Build CI/CD pipelines, container orchestration, and AWS infrastructure.',
          durationMonths: 6,
          mode: 'HYBRID',
          location: 'Pune / Remote',
          stipend: 30000,
          vacancies: 4,
          deadline: '2026-11-30',
          startDate: '2026-12-15',
          minCgpa: 7.5,
          maxBacklogs: 0,
          allowedBranches: ['CSE', 'IT', 'AI/DS'],
          passingYears: [2026, 2027],
          requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'Python'],
          responsibilities: 'Deploy Terraform scripts, maintain microservices monitoring.',
          requirements: 'Hands-on experience with Linux CLI and Git version control.',
          status: 'OPEN'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Cloud DevOps Intern');
      expect(res.body.data.stipend).toBe(30000);
      expect(res.body.data.mode).toBe('HYBRID');
      expect(res.body.data.status).toBe('OPEN');

      vacancyAId = res.body.data.id;
    });
  });

  describe('Vacancy Modification & Lifecycle State Transitions', () => {
    it('should allow company owner to edit their own vacancy', async () => {
      const res = await request(app)
        .put(`/api/v1/internships/${vacancyAId}`)
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({
          stipend: 35000,
          vacancies: 5,
          description: 'Updated description: Build next-generation cloud infra and CI/CD pipelines.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stipend).toBe(35000);
      expect(res.body.data.vacancies).toBe(5);
    });

    it('should PAUSE a vacancy (status: PAUSED)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyAId}/pause`)
        .set('Authorization', `Bearer ${companyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PAUSED');
    });

    it('should PUBLISH / REOPEN a paused vacancy (status: OPEN)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyAId}/publish`)
        .set('Authorization', `Bearer ${companyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('OPEN');
    });

    it('should CLOSE a vacancy (status: CLOSED)', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyAId}/close`)
        .set('Authorization', `Bearer ${companyAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CLOSED');
    });
  });

  describe('Strict Ownership & Access Control Authorization', () => {
    it('should REJECT Company B attempting to edit Company A vacancy with 403 Forbidden', async () => {
      const res = await request(app)
        .put(`/api/v1/internships/${vacancyAId}`)
        .set('Authorization', `Bearer ${companyBToken}`)
        .send({
          title: 'Hacked Title by Company B'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT Company B attempting to publish Company A vacancy with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyAId}/publish`)
        .set('Authorization', `Bearer ${companyBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT Company B attempting to pause Company A vacancy with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyAId}/pause`)
        .set('Authorization', `Bearer ${companyBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT Company B attempting to close Company A vacancy with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/internships/${vacancyAId}/close`)
        .set('Authorization', `Bearer ${companyBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should REJECT Company B attempting to delete Company A vacancy with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/v1/internships/${vacancyAId}`)
        .set('Authorization', `Bearer ${companyBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Multi-Factor Search, Filtering, Sorting & Pagination', () => {
    beforeAll(async () => {
      // Re-open vacancy A
      await request(app)
        .post(`/api/v1/internships/${vacancyAId}/publish`)
        .set('Authorization', `Bearer ${companyAToken}`);

      // Create Vacancy 2 (Remote AI/ML)
      await request(app)
        .post('/api/v1/internships')
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({
          title: 'Machine Learning Research Intern',
          description: 'Train PyTorch LLM models and fine-tune diffusion models.',
          durationMonths: 6,
          mode: 'REMOTE',
          location: 'Remote',
          stipend: 50000,
          vacancies: 2,
          allowedBranches: ['CSE', 'AI/DS'],
          requiredSkills: ['PyTorch', 'Python', 'Transformers'],
          status: 'OPEN'
        });

      // Create Vacancy 3 (On-Site Android)
      await request(app)
        .post('/api/v1/internships')
        .set('Authorization', `Bearer ${companyAToken}`)
        .send({
          title: 'Android Kotlin Developer Intern',
          description: 'Develop native mobile applications with Jetpack Compose.',
          durationMonths: 3,
          mode: 'ON_SITE',
          location: 'Mumbai Office',
          stipend: 20000,
          vacancies: 1,
          allowedBranches: ['CSE', 'IT'],
          requiredSkills: ['Kotlin', 'Android', 'Jetpack Compose'],
          status: 'OPEN'
        });
    });

    it('should search vacancies by keyword (e.g. "DevOps" or "Machine Learning")', async () => {
      const res = await request(app)
        .get('/api/v1/internships?search=DevOps');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].title).toContain('DevOps');
    });

    it('should filter vacancies by work mode (REMOTE)', async () => {
      const res = await request(app)
        .get('/api/v1/internships?mode=REMOTE');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach((item: any) => {
        expect(item.mode).toBe('REMOTE');
      });
    });

    it('should filter vacancies by minimum stipend threshold', async () => {
      const res = await request(app)
        .get('/api/v1/internships?minStipend=40000');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach((item: any) => {
        expect(item.stipend).toBeGreaterThanOrEqual(40000);
      });
    });

    it('should sort vacancies by stipend descending', async () => {
      const res = await request(app)
        .get('/api/v1/internships?sortBy=stipend&sortOrder=desc');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const stipends = res.body.data.map((i: any) => i.stipend);
      for (let i = 0; i < stipends.length - 1; i++) {
        expect(stipends[i]).toBeGreaterThanOrEqual(stipends[i + 1]);
      }
    });

    it('should paginate vacancies list with page, pageSize, and total metadata', async () => {
      const res = await request(app)
        .get('/api/v1/internships?page=1&pageSize=2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(2);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });
  });
});
