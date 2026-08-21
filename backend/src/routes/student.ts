import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { checkEligibility } from '../services/eligibilityService';
import { calculateCandidateMatch } from '../services/aiService';
import { createAuditLog } from '../services/auditService';
import { calculateProfileCompleteness } from '../services/studentProfileService';

const router = Router();

// GET /api/v1/students/me - Get full current student profile with authoritative completeness
router.get('/me', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        skills: true,
        certifications: true,
        projects: true,
        experiences: true,
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
        completions: {
          include: {
            internship: { include: { company: true } }
          }
        },
        ppos: { include: { company: true } }
      }
    });

    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    }

    // Get documents count and resume
    const documents = await prisma.document.findMany({
      where: { ownerUserId: req.user!.id }
    });

    let resumeDoc = null;
    if (profile.resumeDocumentId) {
      resumeDoc = documents.find(d => d.id === profile.resumeDocumentId) || null;
    }
    if (!resumeDoc) {
      resumeDoc = documents.find(d => d.documentType === 'RESUME') || null;
    }

    const completeness = calculateProfileCompleteness(
      {
        ...profile,
        resumeDocumentId: profile.resumeDocumentId || resumeDoc?.id
      },
      documents.length
    );

    return res.json({
      success: true,
      data: {
        ...profile,
        resumeDocument: resumeDoc,
        documents,
        completeness
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/students/me/completeness - Standalone authoritative completeness endpoint
router.get('/me/completeness', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        skills: true,
        projects: true,
        experiences: true,
        certifications: true,
      }
    });

    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    }

    const docCount = await prisma.document.count({
      where: { ownerUserId: req.user!.id }
    });

    const completeness = calculateProfileCompleteness(profile, docCount);

    return res.json({ success: true, data: completeness });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PUT /api/v1/students/me - Update profile fields (Personal, Academic, Preferences, etc.)
router.put('/me', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const {
      fullName,
      department,
      passingYear,
      cgpa,
      backlogs,
      bio,
      phone,
      address,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      preferredDomains,
      preferredMode,
      preferredLocations,
      resumeDocumentId,
      skills,
      projects,
      experiences,
      certifications
    } = req.body;

    let profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    // Input Validation
    if (cgpa !== undefined) {
      const numCgpa = parseFloat(cgpa);
      if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'CGPA must be a valid number between 0.0 and 10.0' }
        });
      }
    }

    if (backlogs !== undefined) {
      const numBacklogs = parseInt(backlogs);
      if (isNaN(numBacklogs) || numBacklogs < 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Backlogs count cannot be negative' }
        });
      }
    }

    if (passingYear !== undefined) {
      const numYear = parseInt(passingYear);
      if (isNaN(numYear) || numYear < 2000 || numYear > 2100) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Passing year must be a valid 4-digit academic year' }
        });
      }
    }

    const domainsString = Array.isArray(preferredDomains)
      ? JSON.stringify(preferredDomains)
      : typeof preferredDomains === 'string' ? preferredDomains : profile.preferredDomains;

    const locationsString = Array.isArray(preferredLocations)
      ? JSON.stringify(preferredLocations)
      : typeof preferredLocations === 'string' ? preferredLocations : profile.preferredLocations;

    // Update profile core & contact fields
    profile = await prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        fullName: fullName !== undefined ? fullName : profile.fullName,
        department: department !== undefined ? department : profile.department,
        passingYear: passingYear !== undefined ? parseInt(passingYear) : profile.passingYear,
        cgpa: cgpa !== undefined ? parseFloat(cgpa) : profile.cgpa,
        backlogs: backlogs !== undefined ? parseInt(backlogs) : profile.backlogs,
        bio: bio !== undefined ? bio : profile.bio,
        phone: phone !== undefined ? phone : profile.phone,
        address: address !== undefined ? address : profile.address,
        linkedinUrl: linkedinUrl !== undefined ? linkedinUrl : profile.linkedinUrl,
        githubUrl: githubUrl !== undefined ? githubUrl : profile.githubUrl,
        portfolioUrl: portfolioUrl !== undefined ? portfolioUrl : profile.portfolioUrl,
        preferredDomains: domainsString,
        preferredMode: preferredMode !== undefined ? preferredMode : profile.preferredMode,
        preferredLocations: locationsString,
        resumeDocumentId: resumeDocumentId !== undefined ? resumeDocumentId : profile.resumeDocumentId,
      }
    });

    // Update skills if provided
    if (Array.isArray(skills)) {
      await prisma.studentSkill.deleteMany({ where: { studentId: profile.id } });
      if (skills.length > 0) {
        await prisma.studentSkill.createMany({
          data: skills.map((s: any) => ({
            studentId: profile!.id,
            skillName: typeof s === 'string' ? s : (s.skillName || ''),
            proficiency: typeof s === 'object' && s.proficiency ? s.proficiency : 'INTERMEDIATE',
            evidence: typeof s === 'object' && s.evidence ? s.evidence : null
          })).filter(s => s.skillName.trim().length > 0)
        });
      }
    }

    // Update projects if provided
    if (Array.isArray(projects)) {
      await prisma.project.deleteMany({ where: { studentId: profile.id } });
      if (projects.length > 0) {
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
    }

    // Update experiences if provided
    if (Array.isArray(experiences)) {
      await prisma.experience.deleteMany({ where: { studentId: profile.id } });
      if (experiences.length > 0) {
        await prisma.experience.createMany({
          data: experiences.map((exp: any) => ({
            studentId: profile!.id,
            company: exp.company || 'Company',
            role: exp.role || 'Intern',
            description: exp.description || '',
            startDate: exp.startDate || null,
            endDate: exp.endDate || null,
            isCurrent: Boolean(exp.isCurrent),
            location: exp.location || null
          }))
        });
      }
    }

    // Update certifications if provided
    if (Array.isArray(certifications)) {
      await prisma.certification.deleteMany({ where: { studentId: profile.id } });
      if (certifications.length > 0) {
        await prisma.certification.createMany({
          data: certifications.map((c: any) => ({
            studentId: profile!.id,
            name: typeof c === 'string' ? c : (c.name || 'Certification'),
            issuer: c.issuer || 'Issuer',
            issueDate: c.issueDate || null,
            expiryDate: c.expiryDate || null,
            documentId: c.documentId || null
          }))
        });
      }
    }

    const updated = await prisma.studentProfile.findUnique({
      where: { id: profile.id },
      include: {
        skills: true,
        projects: true,
        experiences: true,
        certifications: true
      }
    });

    const docCount = await prisma.document.count({
      where: { ownerUserId: req.user!.id }
    });

    const completeness = calculateProfileCompleteness(updated, docCount);

    await createAuditLog({
      actorId: req.user!.id,
      action: 'UPDATE_STUDENT_PROFILE',
      entityType: 'StudentProfile',
      entityId: profile.id
    });

    return res.json({
      success: true,
      data: {
        ...updated,
        completeness
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/students/me/projects - Add a single project
router.post('/me/projects', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const { title, description, technologies, projectUrl } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Project title is required' } });
    }

    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

    const project = await prisma.project.create({
      data: {
        studentId: profile.id,
        title,
        description: description || '',
        technologies: typeof technologies === 'string' ? technologies : (technologies || []).join(', '),
        projectUrl: projectUrl || null
      }
    });

    return res.status(201).json({ success: true, data: project });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// DELETE /api/v1/students/me/projects/:id - Delete a single project
router.delete('/me/projects/:id', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project || project.studentId !== profile.id) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found or not owned by student' } });
    }

    await prisma.project.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/students/me/experience - Add a single experience
router.post('/me/experience', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const { company, role, description, startDate, endDate, isCurrent, location } = req.body;
    if (!company || !role) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Company and role are required' } });
    }

    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

    const exp = await prisma.experience.create({
      data: {
        studentId: profile.id,
        company,
        role,
        description: description || '',
        startDate: startDate || null,
        endDate: endDate || null,
        isCurrent: Boolean(isCurrent),
        location: location || null
      }
    });

    return res.status(201).json({ success: true, data: exp });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// DELETE /api/v1/students/me/experience/:id - Delete experience
router.delete('/me/experience/:id', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

    const exp = await prisma.experience.findUnique({ where: { id: req.params.id } });
    if (!exp || exp.studentId !== profile.id) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Experience not found or not owned by student' } });
    }

    await prisma.experience.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Experience deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/students/me/certifications - Add certification
router.post('/me/certifications', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const { name, issuer, issueDate, expiryDate, documentId } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Certification name is required' } });
    }

    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

    const cert = await prisma.certification.create({
      data: {
        studentId: profile.id,
        name,
        issuer: issuer || 'Issuer',
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        documentId: documentId || null
      }
    });

    return res.status(201).json({ success: true, data: cert });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// DELETE /api/v1/students/me/certifications/:id - Delete certification
router.delete('/me/certifications/:id', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

    const cert = await prisma.certification.findUnique({ where: { id: req.params.id } });
    if (!cert || cert.studentId !== profile.id) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Certification not found or not owned by student' } });
    }

    await prisma.certification.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Certification deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/students/me/documents - List all documents owned by student
router.get('/me/documents', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: { ownerUserId: req.user!.id },
      orderBy: { uploadedAt: 'desc' }
    });

    return res.json({ success: true, data: documents });
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

// GET /api/v1/students/me/eligible-internships - List open vacancies with deterministic eligibility & explainable match scores
router.get('/me/eligible-internships', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        skills: true,
        projects: true,
        experiences: true,
        certifications: true,
        applications: {
          select: { id: true, internshipId: true, status: true, aiMatchScore: true, appliedAt: true }
        }
      }
    });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

    const studentDocs = await prisma.document.findMany({
      where: { ownerUserId: req.user!.id }
    });

    const { eligibleOnly, search, mode, minStipend } = req.query;

    const whereClause: any = { status: 'OPEN' };
    if (mode && String(mode).toUpperCase() !== 'ALL') {
      whereClause.mode = String(mode).toUpperCase();
    }
    if (minStipend) {
      whereClause.stipend = { gte: parseFloat(String(minStipend)) };
    }
    if (search) {
      const q = String(search).trim();
      whereClause.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { requiredSkills: { contains: q } },
        { company: { name: { contains: q } } }
      ];
    }

    const openInternships = await prisma.internship.findMany({
      where: whereClause,
      include: {
        company: true,
        _count: { select: { applications: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const parsedArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim().length > 0) {
        try { return JSON.parse(val); } catch { return val.split(',').map((s: string) => s.trim()).filter(Boolean); }
      }
      return [];
    };

    const evaluated = await Promise.all(openInternships.map(async (internship) => {
      const allowedBranches = parsedArray(internship.allowedBranches);
      const passingYears = parsedArray(internship.passingYears).map(Number);
      const requiredSkills = parsedArray(internship.requiredSkills);

      // 1. Deterministic Hard Eligibility Check (Zero AI)
      const eligibility = checkEligibility({
        student: {
          cgpa: student.cgpa,
          backlogs: student.backlogs,
          department: student.department,
          passingYear: student.passingYear,
          skills: (student.skills || []).map(s => s.skillName),
          documents: studentDocs,
          resumeDocumentId: student.resumeDocumentId,
          profileStatus: student.profileStatus
        },
        internship: {
          minCgpa: internship.minCgpa,
          maxBacklogs: internship.maxBacklogs,
          allowedBranches,
          passingYears,
          requiredSkills
        }
      });

      // 2. Explainable Multi-Factor Candidate Match Scoring
      const matchResult = await calculateCandidateMatch({
        student: {
          fullName: student.fullName,
          department: student.department,
          cgpa: student.cgpa,
          backlogs: student.backlogs,
          skills: (student.skills || []).map(s => s.skillName),
          projects: student.projects || [],
          experiences: student.experiences || [],
          certifications: (student.certifications || []).map(c => c.name),
          preferredDomains: student.preferredDomains || undefined,
          preferredMode: student.preferredMode || undefined
        },
        internship: {
          title: internship.title,
          description: internship.description,
          requiredSkills,
          minCgpa: internship.minCgpa,
          mode: internship.mode
        }
      });

      const existingApp = (student.applications || []).find(a => a.internshipId === internship.id);

      return {
        internship,
        isEligible: eligibility.eligible,
        eligibility,
        match: matchResult,
        hasApplied: Boolean(existingApp),
        application: existingApp || null
      };
    }));

    let results = evaluated;
    if (eligibleOnly === 'true' || eligibleOnly === '1') {
      results = evaluated.filter(e => e.isEligible);
    }

    return res.json({ success: true, data: results });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/students/me/applications - Track own applications
router.get('/me/applications', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: {
        internship: {
          include: {
            company: true
          }
        },
        offer: true
      },
      orderBy: { appliedAt: 'desc' }
    });

    return res.json({ success: true, data: applications });
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

// GET /api/v1/students/:id - View profile by ID (Admin, TNP, Mentor, Company)
router.get('/:id', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: req.params.id },
      include: {
        skills: true,
        projects: true,
        experiences: true,
        certifications: true,
        user: { select: { id: true, email: true, role: true } }
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    }

    const docCount = await prisma.document.count({
      where: { ownerUserId: student.userId }
    });

    const completeness = calculateProfileCompleteness(student, docCount);

    return res.json({
      success: true,
      data: {
        ...student,
        completeness
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
