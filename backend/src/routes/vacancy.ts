import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog } from '../services/auditService';

const router = Router();

// GET /api/v1/internships
router.get('/', async (req, res) => {
  try {
    const { status, mode, search, branch, minStipend } = req.query;

    const whereClause: any = {};
    if (status) whereClause.status = String(status);
    else whereClause.status = 'OPEN'; // default to open vacancies for public discovery

    if (mode) whereClause.mode = String(mode);
    if (minStipend) whereClause.stipend = { gte: parseFloat(String(minStipend)) };
    if (search) {
      whereClause.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
        { company: { name: { contains: String(search) } } }
      ];
    }

    const internships = await prisma.internship.findMany({
      where: whereClause,
      include: {
        company: true,
        _count: { select: { applications: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: internships });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/internships/:id
router.get('/:id', async (req, res) => {
  try {
    const internship = await prisma.internship.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        applications: {
          include: { student: { include: { skills: true, projects: true } } }
        }
      }
    });

    if (!internship) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Internship not found' } });
    return res.json({ success: true, data: internship });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/internships (Company only)
router.post('/', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company profile not found' } });

    const {
      title, description, durationMonths, mode, location, stipend, vacancies,
      deadline, startDate, minCgpa, maxBacklogs, allowedBranches, passingYears,
      requiredSkills, requiredExperience
    } = req.body;

    const internship = await prisma.internship.create({
      data: {
        companyId: company.id,
        title: title || 'Internship Vacancy',
        description: description || '',
        durationMonths: durationMonths ? parseInt(durationMonths) : 3,
        mode: mode || 'ON_SITE',
        location: location || 'Remote / Office',
        stipend: stipend ? parseFloat(stipend) : 15000,
        vacancies: vacancies ? parseInt(vacancies) : 2,
        deadline: deadline || '2026-12-31',
        startDate: startDate || '2026-06-01',
        status: 'OPEN',
        minCgpa: minCgpa !== undefined ? parseFloat(minCgpa) : 7.0,
        maxBacklogs: maxBacklogs !== undefined ? parseInt(maxBacklogs) : 0,
        allowedBranches: JSON.stringify(Array.isArray(allowedBranches) ? allowedBranches : ['CSE', 'IT']),
        passingYears: JSON.stringify(Array.isArray(passingYears) ? passingYears : [2026, 2027]),
        requiredSkills: JSON.stringify(Array.isArray(requiredSkills) ? requiredSkills : ['Java', 'SQL']),
        requiredExperience: requiredExperience ? parseInt(requiredExperience) : 0,
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'CREATE_VACANCY',
      entityType: 'Internship',
      entityId: internship.id
    });

    return res.status(201).json({ success: true, data: internship });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/internships/:id/publish
router.post('/:id/publish', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const internship = await prisma.internship.update({
      where: { id: req.params.id },
      data: { status: 'OPEN' }
    });

    return res.json({ success: true, data: internship });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/internships/:id/close
router.post('/:id/close', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const internship = await prisma.internship.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' }
    });

    return res.json({ success: true, data: internship });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
