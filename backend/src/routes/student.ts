import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { checkEligibility } from '../services/eligibilityService';
import { createAuditLog } from '../services/auditService';

const router = Router();

// GET /api/v1/students/me
router.get('/me', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        skills: true,
        certifications: true,
        projects: true,
        applications: {
          include: {
            internship: { include: { company: true } },
            offer: true
          }
        },
        mentorAssignments: {
          include: { mentor: true, internship: true }
        },
        progressReports: true,
        evaluations: true,
        completions: true,
        ppos: { include: { company: true } }
      }
    });

    return res.json({ success: true, data: profile });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PUT /api/v1/students/me
router.put('/me', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const { fullName, department, passingYear, cgpa, backlogs, bio, linkedinUrl, githubUrl, skills, projects, certifications } = req.body;

    let profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    // Update profile core fields
    profile = await prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        fullName: fullName ?? profile.fullName,
        department: department ?? profile.department,
        passingYear: passingYear ? parseInt(passingYear) : profile.passingYear,
        cgpa: cgpa ? parseFloat(cgpa) : profile.cgpa,
        backlogs: backlogs !== undefined ? parseInt(backlogs) : profile.backlogs,
        bio: bio ?? profile.bio,
        linkedinUrl: linkedinUrl ?? profile.linkedinUrl,
        githubUrl: githubUrl ?? profile.githubUrl,
      }
    });

    // Update skills if provided
    if (Array.isArray(skills)) {
      await prisma.studentSkill.deleteMany({ where: { studentId: profile.id } });
      await prisma.studentSkill.createMany({
        data: skills.map((s: any) => ({
          studentId: profile!.id,
          skillName: typeof s === 'string' ? s : s.skillName,
          proficiency: s.proficiency || 'INTERMEDIATE',
        }))
      });
    }

    // Update projects if provided
    if (Array.isArray(projects)) {
      await prisma.project.deleteMany({ where: { studentId: profile.id } });
      await prisma.project.createMany({
        data: projects.map((p: any) => ({
          studentId: profile!.id,
          title: p.title || 'Project',
          description: p.description || '',
          technologies: typeof p.technologies === 'string' ? p.technologies : (p.technologies || []).join(', '),
          projectUrl: p.projectUrl || null,
        }))
      });
    }

    // Update certifications if provided
    if (Array.isArray(certifications)) {
      await prisma.certification.deleteMany({ where: { studentId: profile.id } });
      await prisma.certification.createMany({
        data: certifications.map((c: any) => ({
          studentId: profile!.id,
          name: typeof c === 'string' ? c : c.name,
          issuer: c.issuer || 'Online Certification',
          issueDate: c.issueDate || '2025-01-01',
        }))
      });
    }

    const updated = await prisma.studentProfile.findUnique({
      where: { id: profile.id },
      include: { skills: true, projects: true, certifications: true }
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/students/me/submit-verification
router.post('/me/submit-verification', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

    const updated = await prisma.studentProfile.update({
      where: { id: profile.id },
      data: { profileStatus: 'SUBMITTED' }
    });

    // Create verification record for T&P
    await prisma.verification.create({
      data: {
        entityType: 'PROFILE',
        entityId: profile.id,
        status: 'PENDING',
        reason: 'Student submitted profile for verification'
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'SUBMIT_PROFILE_VERIFICATION',
      entityType: 'StudentProfile',
      entityId: profile.id
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/students/me/eligibility
router.get('/me/eligibility', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: { skills: true }
    });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

    const { internshipId } = req.query;

    if (internshipId) {
      const internship = await prisma.internship.findUnique({
        where: { id: String(internshipId) },
        include: { company: true }
      });
      if (!internship) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Internship not found' } });

      const allowedBranches = JSON.parse(internship.allowedBranches || '[]');
      const passingYears = JSON.parse(internship.passingYears || '[]');
      const requiredSkills = JSON.parse(internship.requiredSkills || '[]');

      const result = checkEligibility({
        student: {
          cgpa: student.cgpa,
          backlogs: student.backlogs,
          department: student.department,
          passingYear: student.passingYear,
          skills: student.skills.map(s => s.skillName),
        },
        internship: {
          minCgpa: internship.minCgpa,
          maxBacklogs: internship.maxBacklogs,
          allowedBranches,
          passingYears,
          requiredSkills,
        }
      });

      return res.json({ success: true, data: { internship, result } });
    }

    // Check against all open internships
    const openInternships = await prisma.internship.findMany({
      where: { status: 'OPEN' },
      include: { company: true }
    });

    const evaluations = openInternships.map(internship => {
      const allowedBranches = JSON.parse(internship.allowedBranches || '[]');
      const passingYears = JSON.parse(internship.passingYears || '[]');
      const requiredSkills = JSON.parse(internship.requiredSkills || '[]');

      const result = checkEligibility({
        student: {
          cgpa: student.cgpa,
          backlogs: student.backlogs,
          department: student.department,
          passingYear: student.passingYear,
          skills: student.skills.map(s => s.skillName),
        },
        internship: {
          minCgpa: internship.minCgpa,
          maxBacklogs: internship.maxBacklogs,
          allowedBranches,
          passingYears,
          requiredSkills,
        }
      });

      return {
        internship,
        result
      };
    });

    return res.json({ success: true, data: { student, evaluations } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
