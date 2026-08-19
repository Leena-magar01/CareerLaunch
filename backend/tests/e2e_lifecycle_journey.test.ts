import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';

describe('Phase 20: Master End-to-End (E2E) Internship Lifecycle Journey Test', () => {
  // Tokens and IDs across all 4 platform roles
  let tnpToken: string;
  let tnpUserId: string;

  let companyToken: string;
  let companyUserId: string;
  let companyProfileId: string;

  let mentorToken: string;
  let mentorUserId: string;
  let mentorProfileId: string;

  let studentToken: string;
  let studentUserId: string;
  let studentProfileId: string;

  let vacancyId: string;
  let applicationId: string;
  let offerId: string;
  let reportId: string;
  let completionId: string;
  let certificateId: string;
  let ppoId: string;

  const timestamp = Date.now();

  beforeAll(async () => {
    // 1. T&P Officer Registration
    const tnpRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `tnp.e2e.${timestamp}@college.edu`,
        password: 'Password@123',
        role: 'TNP',
        fullName: 'Prof. Arvind Deshmukh',
        department: 'TNP_CELL'
      });
    tnpToken = tnpRes.body.data.token;
    tnpUserId = tnpRes.body.data.user.id;

    // 2. Company Recruiter Registration
    const compRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `recruiter.e2e.${timestamp}@alphatech.com`,
        password: 'Password@123',
        role: 'COMPANY',
        fullName: 'AlphaTech Talent Lead',
        companyName: 'AlphaTech Innovations'
      });
    companyToken = compRes.body.data.token;
    companyUserId = compRes.body.data.user.id;
    companyProfileId = compRes.body.data.user.profile.id;

    // 3. Faculty Mentor Registration
    const mentorRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `mentor.e2e.${timestamp}@college.edu`,
        password: 'Password@123',
        role: 'MENTOR',
        fullName: 'Dr. Priya Nair',
        department: 'CSE'
      });
    mentorToken = mentorRes.body.data.token;
    mentorUserId = mentorRes.body.data.user.id;
    mentorProfileId = mentorRes.body.data.user.profile.id;

    // 4. Student Registration
    const studRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `student.e2e.${timestamp}@college.edu`,
        password: 'Password@123',
        role: 'STUDENT',
        fullName: 'Rohan Joshi',
        department: 'CSE',
        passingYear: 2026,
        cgpa: 9.3
      });
    studentToken = studRes.body.data.token;
    studentUserId = studRes.body.data.user.id;
    studentProfileId = studRes.body.data.user.profile.id;
  });

  afterAll(async () => {
    if (vacancyId) {
      await prisma.pPO.deleteMany({ where: { internshipId: vacancyId } });
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

  test('Step 1: Student Completes Profile & Submits for Institutional Verification', async () => {
    const updateRes = await request(app)
      .put('/api/v1/students/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        phone: '9876543210',
        passingYear: 2026,
        department: 'CSE',
        cgpa: 9.3,
        backlogs: 0,
        skills: ['React', 'TypeScript', 'Node.js', 'Docker', 'PostgreSQL'],
        preferredDomains: ['Cloud & Web Systems'],
        preferredMode: 'HYBRID'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);

    const submitRes = await request(app)
      .post('/api/v1/students/me/submit-verification')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.profileStatus).toBe('SUBMITTED');
  });

  test('Step 2: T&P Officer Verifies and Approves Student Academic Record', async () => {
    const verifyRes = await request(app)
      .post(`/api/v1/tnp/students/${studentProfileId}/verify`)
      .set('Authorization', `Bearer ${tnpToken}`)
      .send({
        status: 'VERIFIED',
        remarks: 'All 6 semester marksheets and enrollment records verified.'
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.student.profileStatus).toBe('VERIFIED');
  });

  test('Step 3: Company Creates & Publishes High-Value Internship Vacancy', async () => {
    const createRes = await request(app)
      .post('/api/v1/internships')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Full Stack Cloud Infrastructure Engineer Intern',
        description: 'Design and implement robust microservices, GraphQL APIs, and React TypeScript portals.',
        location: 'Bengaluru / Hybrid',
        mode: 'HYBRID',
        durationMonths: 6,
        stipend: 50000,
        vacancies: 3,
        minCgpa: 8.5,
        maxBacklogs: 0,
        allowedBranches: ['CSE', 'IT'],
        passingYears: [2026],
        requiredSkills: ['React', 'TypeScript', 'Node.js', 'Docker'],
        status: 'DRAFT'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    vacancyId = createRes.body.data.id;

    const pubRes = await request(app)
      .post(`/api/v1/internships/${vacancyId}/publish`)
      .set('Authorization', `Bearer ${companyToken}`);

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.success).toBe(true);
    expect(pubRes.body.data.status).toBe('OPEN');
  });

  test('Step 4: Student Evaluates Eligibility and Applies for Vacancy', async () => {
    const eligRes = await request(app)
      .get('/api/v1/students/me/eligible-internships')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(eligRes.status).toBe(200);
    expect(eligRes.body.success).toBe(true);
    const matched = eligRes.body.data.find((item: any) => item.internship.id === vacancyId);
    expect(matched).toBeDefined();
    expect(matched.isEligible).toBe(true);

    const applyRes = await request(app)
      .post(`/api/v1/internships/${vacancyId}/apply`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.success).toBe(true);
    applicationId = applyRes.body.data.id;
    expect(applyRes.body.data.status).toBe('APPLIED');
  });

  test('Step 5: Company Shortlists and Selects Candidate', async () => {
    const shortlistRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'SHORTLISTED' });

    expect(shortlistRes.status).toBe(200);
    expect(shortlistRes.body.data.status).toBe('SHORTLISTED');

    const selectRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'SELECTED' });

    expect(selectRes.status).toBe(200);
    expect(selectRes.body.data.status).toBe('SELECTED');
  });

  test('Step 6: Company Issues Official Offer Letter', async () => {
    const offerRes = await request(app)
      .post(`/api/v1/applications/${applicationId}/offer`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        role: 'Full Stack Cloud Infrastructure Engineer Intern',
        stipend: 50000,
        startDate: '2026-09-01',
        endDate: '2027-03-01',
        location: 'Bengaluru',
        terms: 'Mandatory completion of weekly progress logbooks and mentor evaluations.'
      });

    expect(offerRes.status).toBe(201);
    expect(offerRes.body.success).toBe(true);
    offerId = offerRes.body.data.id;
    expect(offerRes.body.data.status).toBe('ISSUED');
  });

  test('Step 7: T&P Officer Verifies and Approves Internship Offer', async () => {
    const verifyOfferRes = await request(app)
      .post(`/api/v1/tnp/offers/${offerId}/verify`)
      .set('Authorization', `Bearer ${tnpToken}`)
      .send({
        status: 'APPROVED',
        remarks: 'Institutional compliance verified; stipend and duration meet college guidelines.'
      });

    expect(verifyOfferRes.status).toBe(200);
    expect(verifyOfferRes.body.success).toBe(true);
    expect(verifyOfferRes.body.data.offer.status).toBe('APPROVED');
  });

  test('Step 8: T&P Assigns Faculty Mentor to Supervise Intern', async () => {
    const assignRes = await request(app)
      .post('/api/v1/tnp/assignments')
      .set('Authorization', `Bearer ${tnpToken}`)
      .send({
        mentorId: mentorProfileId,
        studentId: studentProfileId,
        internshipId: vacancyId
      });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.success).toBe(true);
    expect(assignRes.body.data.status).toBe('ASSIGNED');
  });

  test('Step 9: Student Submits Weekly Progress Report & Mentor Approves', async () => {
    const reportRes = await request(app)
      .post(`/api/v1/internships/${vacancyId}/progress-reports`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        weekNumber: 1,
        startDate: '2026-09-01',
        endDate: '2026-09-07',
        tasks: 'Architected GraphQL microservices and integrated Prisma ORM.',
        learning: 'Mastered schema stitching and distributed tracing.',
        challenges: 'Docker network isolation issues resolved via docker-compose bridge network.',
        hours: 42
      });

    expect(reportRes.status).toBe(201);
    expect(reportRes.body.success).toBe(true);
    reportId = reportRes.body.data.id;

    const reviewRes = await request(app)
      .patch(`/api/v1/reports/${reportId}/review`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        status: 'APPROVED',
        feedback: 'Excellent technical progress on microservices architecture.'
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.success).toBe(true);
    expect(reviewRes.body.data.status).toBe('APPROVED');
  });

  test('Step 10: Faculty Mentor & Company Submit Structured Performance Rubrics', async () => {
    const mentorEvalRes = await request(app)
      .post(`/api/v1/internships/${vacancyId}/evaluations`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        studentId: studentProfileId,
        technicalScore: 9.5,
        problemSolvingScore: 9.2,
        communicationScore: 9.0,
        professionalismScore: 9.5,
        teamworkScore: 9.0,
        disciplineScore: 9.8,
        taskCompletionScore: 9.5,
        comments: 'Outstanding performance throughout the internship tenure.'
      });

    expect(mentorEvalRes.status).toBe(201);
    expect(mentorEvalRes.body.success).toBe(true);

    const compEvalRes = await request(app)
      .post(`/api/v1/internships/${vacancyId}/evaluations`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        studentId: studentProfileId,
        technicalScore: 9.8,
        problemSolvingScore: 9.5,
        communicationScore: 9.2,
        professionalismScore: 9.8,
        teamworkScore: 9.4,
        disciplineScore: 9.9,
        taskCompletionScore: 9.8,
        comments: 'Top 5% intern in our engineering cohort.'
      });

    expect(compEvalRes.status).toBe(201);
    expect(compEvalRes.body.success).toBe(true);
  });

  test('Step 11: Internship Completion Workflow & Verifiable Certificate Generation', async () => {
    const recommendRes = await request(app)
      .post(`/api/v1/internships/${vacancyId}/completions/recommend`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        studentId: studentProfileId,
        remarks: 'All requirements, weekly reports, and evaluations successfully satisfied.'
      });

    expect(recommendRes.status).toBe(201);
    expect(recommendRes.body.success).toBe(true);
    completionId = recommendRes.body.data.id;
    expect(recommendRes.body.data.status).toBe('RECOMMENDED');

    const verifyCompRes = await request(app)
      .post(`/api/v1/tnp/completions/${completionId}/verify`)
      .set('Authorization', `Bearer ${tnpToken}`)
      .send({
        status: 'APPROVED',
        remarks: 'T&P verification complete. Verified certificate generated.'
      });

    expect(verifyCompRes.status).toBe(200);
    expect(verifyCompRes.body.success).toBe(true);
    expect(verifyCompRes.body.data.status).toBe('APPROVED');
    expect(verifyCompRes.body.data.certificateId).toMatch(/^CERT-2026-/);
    certificateId = verifyCompRes.body.data.certificateId;
  });

  test('Step 12: Public Certificate Verification Endpoint', async () => {
    const certLookupRes = await request(app)
      .get(`/api/v1/verify/certificate/${certificateId}`);

    expect(certLookupRes.status).toBe(200);
    expect(certLookupRes.body.success).toBe(true);
    expect(certLookupRes.body.data.verified).toBe(true);
    expect(certLookupRes.body.data.certificateId).toBe(certificateId);
    expect(certLookupRes.body.data.companyName).toBe('AlphaTech Innovations');
  });

  test('Step 13: Company Extends PPO, T&P Verifies, Student Accepts', async () => {
    const ppoRes = await request(app)
      .post(`/api/v1/internships/${vacancyId}/ppo`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        studentId: studentProfileId,
        role: 'Full Stack Software Engineer',
        offeredCtc: 16.5,
        offerDate: '2026-08-19',
        joiningDate: '2026-10-01',
        location: 'Bengaluru',
        terms: 'Full-time employment offer upon degree completion.'
      });

    expect(ppoRes.status).toBe(201);
    expect(ppoRes.body.success).toBe(true);
    ppoId = ppoRes.body.data.id;

    const verifyPpoRes = await request(app)
      .post(`/api/v1/tnp/ppo/${ppoId}/verify`)
      .set('Authorization', `Bearer ${tnpToken}`)
      .send({
        status: 'VERIFIED',
        remarks: 'Verified offer package against college tier-1 placement guidelines.'
      });

    expect(verifyPpoRes.status).toBe(200);
    expect(verifyPpoRes.body.success).toBe(true);
    expect(verifyPpoRes.body.data.isVerified).toBe(true);

    const acceptRes = await request(app)
      .post(`/api/v1/students/me/ppo/${ppoId}/respond`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        response: 'ACCEPTED',
        remarks: 'Delighted to accept full-time offer at AlphaTech Innovations!'
      });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.status).toBe('ACCEPTED');
  });

  test('Step 14: Institutional T&P Analytics & Funnel Verification', async () => {
    const dashRes = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${tnpToken}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.success).toBe(true);
    expect(dashRes.body.data.metrics.totalStudents).toBeGreaterThanOrEqual(1);
    expect(dashRes.body.data.metrics.completedInternships).toBeGreaterThanOrEqual(1);
    expect(dashRes.body.data.metrics.ppoCount).toBeGreaterThanOrEqual(1);
    expect(dashRes.body.data.metrics.completionRate).toBeGreaterThan(0);
    expect(dashRes.body.data.metrics.ppoRate).toBeGreaterThan(0);
  });

  test('Step 15: Negative Testing & Privilege Boundary Enforcement', async () => {
    // 1. Student cannot access T&P analytics (403)
    const sAnalytic = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(sAnalytic.status).toBe(403);

    // 2. Company cannot approve its own offers (403)
    const cApprove = await request(app)
      .post(`/api/v1/tnp/offers/${offerId}/verify`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'APPROVED' });
    expect(cApprove.status).toBe(403);

    // 3. Unauthenticated requests are rejected (401)
    const unauth = await request(app).get('/api/v1/students/me');
    expect(unauth.status).toBe(401);
  });
});
