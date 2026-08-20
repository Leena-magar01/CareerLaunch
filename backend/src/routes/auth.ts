import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/db';
import { ENV } from '../config/env';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { calculateProfileCompleteness } from '../services/studentProfileService';

const googleClient = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);

const router = Router();

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      role,
      fullName,
      studentCode,
      department,
      passingYear,
      cgpa,
      backlogs,
      bio,
      phone,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      preferredDomains,
      preferredMode,
      preferredLocations,
      skills,
      companyName,
      industry,
      location,
      website,
      description,
      mentorTitle
    } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email, password and role are required' }
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid email address format' }
      });
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters long' }
      });
    }

    // Allowed roles
    const allowedRoles = ['STUDENT', 'COMPANY', 'TNP', 'MENTOR', 'ADMIN'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` }
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ success: false, error: { code: 'USER_EXISTS', message: 'Email already registered' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
        status: 'ACTIVE'
      }
    });

    let profileData: any = null;

    // Create role profile
    if (role === 'STUDENT') {
      const parsedCgpa = cgpa !== undefined ? parseFloat(cgpa) : 8.0;
      const parsedBacklogs = backlogs !== undefined ? parseInt(backlogs) : 0;
      const parsedYear = passingYear !== undefined ? parseInt(passingYear) : 2026;

      const domainsStr = Array.isArray(preferredDomains) ? JSON.stringify(preferredDomains) : (preferredDomains || null);
      const locsStr = Array.isArray(preferredLocations) ? JSON.stringify(preferredLocations) : (preferredLocations || null);

      const studentProfile = await prisma.studentProfile.create({
        data: {
          userId: user.id,
          studentCode: studentCode || `STU-${Math.floor(100000 + Math.random() * 900000)}`,
          fullName: fullName || 'New Student',
          department: department || 'CSE',
          passingYear: isNaN(parsedYear) ? 2026 : parsedYear,
          cgpa: isNaN(parsedCgpa) ? 8.0 : parsedCgpa,
          backlogs: isNaN(parsedBacklogs) ? 0 : parsedBacklogs,
          bio: bio || null,
          phone: phone || null,
          linkedinUrl: linkedinUrl || null,
          githubUrl: githubUrl || null,
          portfolioUrl: portfolioUrl || null,
          preferredDomains: domainsStr,
          preferredMode: preferredMode || 'ANY',
          preferredLocations: locsStr,
        }
      });

      // Add skills if provided at registration
      if (Array.isArray(skills) && skills.length > 0) {
        await prisma.studentSkill.createMany({
          data: skills.map((s: any) => ({
            studentId: studentProfile.id,
            skillName: typeof s === 'string' ? s : s.skillName,
            proficiency: typeof s === 'object' && s.proficiency ? s.proficiency : 'INTERMEDIATE'
          })).filter(s => s.skillName && s.skillName.trim().length > 0)
        });
      }

      const fullStudent = await prisma.studentProfile.findUnique({
        where: { id: studentProfile.id },
        include: { skills: true, projects: true, experiences: true, certifications: true }
      });

      const completeness = calculateProfileCompleteness(fullStudent, 0);
      profileData = { ...fullStudent, completeness };
    } else if (role === 'COMPANY') {
      profileData = await prisma.companyProfile.create({
        data: {
          userId: user.id,
          name: companyName || fullName || 'New Company Corp',
          industry: industry || null,
          location: location || null,
          website: website || null,
          phone: phone || null,
          description: description || null,
          contactName: fullName || 'Company HR',
          contactEmail: email,
        }
      });
    } else if (role === 'MENTOR') {
      profileData = await prisma.mentorProfile.create({
        data: {
          userId: user.id,
          fullName: fullName || 'Faculty Mentor',
          department: department || 'CSE',
          designation: mentorTitle || 'Assistant Professor',
        }
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: profileData
        }
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// POST /api/v1/auth/google
router.post('/google', async (req, res) => {
  try {
    const { email, name, googleId, role } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email is required for Google sign-in' }
      });
    }

    const googleEmail = email.toLowerCase();
    const googleName = name || googleEmail.split('@')[0];

    let user = await prisma.user.findUnique({
      where: { email: googleEmail },
      include: {
        studentProfile: { include: { skills: true, projects: true, experiences: true, certifications: true } },
        companyProfile: true,
        mentorProfile: true,
      }
    });

    if (!user) {
      // New user — role must be supplied by the frontend (selected on portal card)
      const assignedRole = (role || 'STUDENT').toUpperCase();
      const allowedRoles = ['STUDENT', 'COMPANY', 'TNP', 'MENTOR'];
      if (!allowedRoles.includes(assignedRole)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` }
        });
      }

      // Generate a random unusable password hash — Google users never use password login
      const passwordHash = await bcrypt.hash(`google_${googleId || Date.now()}_${Math.random()}`, 10);

      user = await prisma.user.create({
        data: {
          email: googleEmail,
          passwordHash,
          role: assignedRole,
          status: 'ACTIVE',
        },
        include: {
          studentProfile: true,
          companyProfile: true,
          mentorProfile: true,
        }
      }) as any;

      // Create matching role profile
      if (assignedRole === 'STUDENT') {
        const studentCode = 'STU-' + Math.floor(100000 + Math.random() * 900000);
        await prisma.studentProfile.create({
          data: {
            userId: user!.id,
            fullName: googleName,
            studentCode,
            department: 'CSE',
            passingYear: 2026,
            cgpa: 8.5,
            backlogs: 0,
          }
        });
      } else if (assignedRole === 'COMPANY') {
        await prisma.companyProfile.create({
          data: {
            userId: user!.id,
            name: `${googleName} Enterprise`,
            industry: 'Technology',
            location: 'India',
            contactName: googleName,
            contactEmail: googleEmail,
          }
        });
      } else if (assignedRole === 'MENTOR') {
        await prisma.mentorProfile.create({
          data: {
            userId: user!.id,
            fullName: googleName,
            department: 'CSE',
            designation: 'Assistant Professor',
          }
        });
      }

      // Re-fetch with profiles included
      user = await prisma.user.findUnique({
        where: { id: user!.id },
        include: {
          studentProfile: { include: { skills: true, projects: true, experiences: true, certifications: true } },
          companyProfile: true,
          mentorProfile: true,
        }
      }) as any;
    }

    // Build profile data with completeness score for students
    let profileData: any = null;
    if (user!.role === 'STUDENT' && user!.studentProfile) {
      const docCount = await prisma.document.count({ where: { ownerUserId: user!.id } });
      const completeness = calculateProfileCompleteness(user!.studentProfile, docCount);
      profileData = { ...user!.studentProfile, completeness };
    } else if (user!.role === 'COMPANY') {
      profileData = user!.companyProfile;
    } else if (user!.role === 'MENTOR') {
      profileData = user!.mentorProfile;
    }

    // Sign JWT with same shape as /login for consistency
    const token = jwt.sign(
      { id: user!.id, email: user!.email, role: user!.role },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user!.id,
          email: user!.email,
          role: user!.role,
          profile: profileData,
          studentProfile: user!.studentProfile,
          companyProfile: user!.companyProfile,
          mentorProfile: user!.mentorProfile,
        }
      }
    });
  } catch (error: any) {
    console.error('Google Auth error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to authenticate with Google' }
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password required' } });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        studentProfile: {
          include: { skills: true, projects: true, experiences: true, certifications: true }
        },
        companyProfile: true,
        mentorProfile: true,
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, { expiresIn: '7d' });

    let profileData: any = null;
    if (user.role === 'STUDENT' && user.studentProfile) {
      const docCount = await prisma.document.count({ where: { ownerUserId: user.id } });
      const completeness = calculateProfileCompleteness(user.studentProfile, docCount);
      profileData = { ...user.studentProfile, completeness };
    } else if (user.role === 'COMPANY') {
      profileData = user.companyProfile;
    } else if (user.role === 'MENTOR') {
      profileData = user.mentorProfile;
    }

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: profileData
        }
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        studentProfile: {
          include: { skills: true, certifications: true, projects: true, experiences: true }
        },
        companyProfile: true,
        mentorProfile: true,
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    let studentProfileWithCompleteness = user.studentProfile;
    if (user.studentProfile) {
      const docCount = await prisma.document.count({ where: { ownerUserId: user.id } });
      const completeness = calculateProfileCompleteness(user.studentProfile, docCount);
      studentProfileWithCompleteness = { ...user.studentProfile, completeness } as any;
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        studentProfile: studentProfileWithCompleteness,
        companyProfile: user.companyProfile,
        mentorProfile: user.mentorProfile,
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

export default router;
