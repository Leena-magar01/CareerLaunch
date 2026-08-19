import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.pPO.deleteMany();
  await prisma.completion.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.progressReport.deleteMany();
  await prisma.mentorAssignment.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.application.deleteMany();
  await prisma.internship.deleteMany();
  await prisma.project.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.studentSkill.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.companyProfile.deleteMany();
  await prisma.mentorProfile.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();

  const commonPasswordHash = await bcrypt.hash('password123', 10);

  // 1. Create T&P Admin User
  const tnpUser = await prisma.user.create({
    data: {
      email: 'tnp@college.edu',
      passwordHash: commonPasswordHash,
      role: 'TNP',
      status: 'ACTIVE'
    }
  });

  // 2. Create Faculty Mentor User
  const mentorUser = await prisma.user.create({
    data: {
      email: 'mentor@college.edu',
      passwordHash: commonPasswordHash,
      role: 'MENTOR',
      status: 'ACTIVE'
    }
  });

  const mentorProfile = await prisma.mentorProfile.create({
    data: {
      userId: mentorUser.id,
      fullName: 'Dr. Rajesh Verma',
      department: 'CSE',
      designation: 'Associate Professor',
      maxCapacity: 15
    }
  });

  // 3. Create Companies
  const companyUser1 = await prisma.user.create({
    data: {
      email: 'recruiter@techcorp.com',
      passwordHash: commonPasswordHash,
      role: 'COMPANY',
      status: 'ACTIVE'
    }
  });

  const company1 = await prisma.companyProfile.create({
    data: {
      userId: companyUser1.id,
      name: 'TechCorp Solutions',
      website: 'https://techcorp.example.com',
      industry: 'Information Technology',
      description: 'Leading enterprise software solutions provider.',
      contactName: 'Neha Gupta (HR Manager)',
      contactEmail: 'recruiter@techcorp.com',
      verificationStatus: 'VERIFIED'
    }
  });

  const companyUser2 = await prisma.user.create({
    data: {
      email: 'careers@innovatelabs.io',
      passwordHash: commonPasswordHash,
      role: 'COMPANY',
      status: 'ACTIVE'
    }
  });

  const company2 = await prisma.companyProfile.create({
    data: {
      userId: companyUser2.id,
      name: 'Innovate Labs',
      website: 'https://innovatelabs.example.io',
      industry: 'AI & Cloud Infrastructure',
      description: 'Cutting-edge AI research and product deployment laboratory.',
      contactName: 'Sanjay Kapoor (Talent Lead)',
      contactEmail: 'careers@innovatelabs.io',
      verificationStatus: 'VERIFIED'
    }
  });

  // 4. Create Students
  // Student 1: Rahul Sharma (Eligible & High Scorer)
  const studentUser1 = await prisma.user.create({
    data: {
      email: 'student@college.edu',
      passwordHash: commonPasswordHash,
      role: 'STUDENT',
      status: 'ACTIVE'
    }
  });

  const student1 = await prisma.studentProfile.create({
    data: {
      userId: studentUser1.id,
      studentCode: 'STU-2026-001',
      fullName: 'Rahul Sharma',
      department: 'CSE',
      passingYear: 2026,
      cgpa: 8.85,
      backlogs: 0,
      bio: 'Full-stack software engineering enthusiast with strong Java, React, and PostgreSQL background.',
      linkedinUrl: 'https://linkedin.com/in/rahulsharma',
      githubUrl: 'https://github.com/rahulsharma',
      profileStatus: 'VERIFIED'
    }
  });

  await prisma.studentSkill.createMany({
    data: [
      { studentId: student1.id, skillName: 'Java', proficiency: 'ADVANCED' },
      { studentId: student1.id, skillName: 'SQL', proficiency: 'ADVANCED' },
      { studentId: student1.id, skillName: 'React', proficiency: 'INTERMEDIATE' },
      { studentId: student1.id, skillName: 'Spring Boot', proficiency: 'INTERMEDIATE' },
    ]
  });

  await prisma.project.create({
    data: {
      studentId: student1.id,
      title: 'E-Commerce Microservices Backend',
      description: 'Scalable backend API built with Spring Boot, PostgreSQL, and Docker.',
      technologies: 'Java, Spring Boot, PostgreSQL, Docker',
      projectUrl: 'https://github.com/rahulsharma/ecommerce-api'
    }
  });

  await prisma.certification.create({
    data: {
      studentId: student1.id,
      name: 'Oracle Certified Associate Java SE Programmer',
      issuer: 'Oracle',
      issueDate: '2025-06-15'
    }
  });

  // Student 2: Priya Patel
  const studentUser2 = await prisma.user.create({
    data: {
      email: 'priya@college.edu',
      passwordHash: commonPasswordHash,
      role: 'STUDENT',
      status: 'ACTIVE'
    }
  });

  const student2 = await prisma.studentProfile.create({
    data: {
      userId: studentUser2.id,
      studentCode: 'STU-2026-002',
      fullName: 'Priya Patel',
      department: 'IT',
      passingYear: 2026,
      cgpa: 8.2,
      backlogs: 0,
      bio: 'Frontend developer and UI/UX designer focused on React and TypeScript.',
      profileStatus: 'VERIFIED'
    }
  });

  await prisma.studentSkill.createMany({
    data: [
      { studentId: student2.id, skillName: 'React', proficiency: 'ADVANCED' },
      { studentId: student2.id, skillName: 'TypeScript', proficiency: 'INTERMEDIATE' },
      { studentId: student2.id, skillName: 'SQL', proficiency: 'INTERMEDIATE' },
    ]
  });

  // 5. Create Internships / Vacancies
  const internship1 = await prisma.internship.create({
    data: {
      companyId: company1.id,
      title: 'Software Development Engineer Intern',
      description: 'Join our enterprise engineering team to build scalable REST APIs and cloud services.',
      durationMonths: 6,
      mode: 'HYBRID',
      location: 'Pune / Remote',
      stipend: 25000,
      vacancies: 3,
      deadline: '2026-10-31',
      startDate: '2026-12-01',
      status: 'OPEN',
      minCgpa: 7.5,
      maxBacklogs: 0,
      allowedBranches: JSON.stringify(['CSE', 'IT', 'ECE']),
      passingYears: JSON.stringify([2026, 2027]),
      requiredSkills: JSON.stringify(['Java', 'SQL', 'Spring Boot']),
      requiredExperience: 0
    }
  });

  const internship2 = await prisma.internship.create({
    data: {
      companyId: company2.id,
      title: 'AI & Data Science Intern',
      description: 'Develop machine learning models and data pipelines for real-time video processing.',
      durationMonths: 3,
      mode: 'REMOTE',
      location: 'Remote',
      stipend: 30000,
      vacancies: 2,
      deadline: '2026-11-15',
      startDate: '2026-12-15',
      status: 'OPEN',
      minCgpa: 8.0,
      maxBacklogs: 0,
      allowedBranches: JSON.stringify(['CSE', 'IT']),
      passingYears: JSON.stringify([2026]),
      requiredSkills: JSON.stringify(['Python', 'Machine Learning', 'SQL']),
      requiredExperience: 0
    }
  });

  // 6. Create Application for Rahul
  const application1 = await prisma.application.create({
    data: {
      internshipId: internship1.id,
      studentId: student1.id,
      status: 'SELECTED',
      eligibilityScore: 100.0,
      aiMatchScore: 94.0,
      matchExplanation: '94% Match: Strong Java and SQL skills with a relevant microservices backend project matching TechCorp requirements.'
    }
  });

  // 7. Create Offer for Rahul
  const offer1 = await prisma.offer.create({
    data: {
      applicationId: application1.id,
      studentResponse: 'ACCEPTED',
      status: 'APPROVED',
      verificationCode: 'OFFER-TECHCORP-2026-9981'
    }
  });

  // 8. T&P Verification Record
  await prisma.verification.create({
    data: {
      entityType: 'OFFER',
      entityId: offer1.id,
      verifierId: tnpUser.id,
      status: 'APPROVED',
      reason: 'Offer letter authentic and verified by T&P cell.'
    }
  });

  // 9. Assign Mentor to Rahul
  const assignment1 = await prisma.mentorAssignment.create({
    data: {
      studentId: student1.id,
      internshipId: internship1.id,
      mentorId: mentorProfile.id,
      assignedBy: tnpUser.id,
      status: 'ACTIVE'
    }
  });

  // 10. Weekly Progress Reports
  await prisma.progressReport.create({
    data: {
      internshipId: internship1.id,
      studentId: student1.id,
      mentorId: mentorProfile.id,
      weekNumber: 1,
      tasks: 'Completed onboarding, environment setup, and implemented user authentication API endpoints.',
      learning: 'Gained hands-on experience with OAuth2 and JWT token refresh architecture.',
      challenges: 'Faced minor CORS configuration issues between React client and Spring Boot server.',
      hours: 40.0,
      status: 'APPROVED',
      feedback: 'Excellent start! Keep up the good documentation.'
    }
  });

  await prisma.progressReport.create({
    data: {
      internshipId: internship1.id,
      studentId: student1.id,
      mentorId: mentorProfile.id,
      weekNumber: 2,
      tasks: 'Built database indexing strategies and optimized query performance by 35%.',
      learning: 'Learned PostgreSQL EXPLAIN ANALYZE for query debugging.',
      challenges: 'Optimizing high-concurrency connection pool settings.',
      hours: 42.0,
      status: 'APPROVED',
      feedback: 'Strong performance on query optimization.'
    }
  });

  // 11. Final Evaluation
  await prisma.evaluation.create({
    data: {
      internshipId: internship1.id,
      studentId: student1.id,
      evaluatorId: mentorProfile.id,
      evaluatorRole: 'MENTOR',
      technicalScore: 9.5,
      problemSolvingScore: 9.0,
      communicationScore: 8.5,
      professionalismScore: 9.5,
      teamworkScore: 9.0,
      overallScore: 9.1,
      comments: 'Outstanding student. High technical competency and proactive problem solver.'
    }
  });

  // 12. PPO Record
  await prisma.pPO.create({
    data: {
      internshipId: internship1.id,
      studentId: student1.id,
      companyId: company1.id,
      status: 'OFFERED',
      role: 'Software Development Engineer I',
      offeredCtc: 14.5,
      offerDate: '2026-08-15'
    }
  });

  console.log('✅ Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Credentials for All 4 Roles:');
  console.log('1. Student:       email: student@college.edu    pass: password123');
  console.log('2. Company:       email: recruiter@techcorp.com pass: password123');
  console.log('3. T&P Admin:     email: tnp@college.edu        pass: password123');
  console.log('4. Faculty Mentor: email: mentor@college.edu     pass: password123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
