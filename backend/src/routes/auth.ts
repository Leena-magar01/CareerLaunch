import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { ENV } from '../config/env';
import { authenticateJwt, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, fullName, studentCode, department, passingYear, companyName, mentorTitle } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email, password and role are required' } });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, error: { code: 'USER_EXISTS', message: 'Email already registered' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        status: 'ACTIVE'
      }
    });

    // Create role profile
    if (role === 'STUDENT') {
      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          studentCode: studentCode || `STU-${Math.floor(100000 + Math.random() * 900000)}`,
          fullName: fullName || 'New Student',
          department: department || 'CSE',
          passingYear: parseInt(passingYear) || 2026,
          cgpa: 8.0,
          backlogs: 0,
        }
      });
    } else if (role === 'COMPANY') {
      await prisma.companyProfile.create({
        data: {
          userId: user.id,
          name: companyName || fullName || 'New Company Corp',
          contactName: fullName || 'Company HR',
          contactEmail: email,
        }
      });
    } else if (role === 'MENTOR') {
      await prisma.mentorProfile.create({
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
        user: { id: user.id, email: user.email, role: user.role }
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password required' } });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
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
    if (user.role === 'STUDENT') profileData = user.studentProfile;
    if (user.role === 'COMPANY') profileData = user.companyProfile;
    if (user.role === 'MENTOR') profileData = user.mentorProfile;

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
          include: { skills: true, certifications: true, projects: true }
        },
        companyProfile: true,
        mentorProfile: true,
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        studentProfile: user.studentProfile,
        companyProfile: user.companyProfile,
        mentorProfile: user.mentorProfile,
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

export default router;
