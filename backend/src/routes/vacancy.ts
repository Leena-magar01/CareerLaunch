import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog } from '../services/auditService';

const router = Router();

// GET /api/v1/internships - Multi-Factor Search, Filter, Sort & Pagination
router.get('/', async (req, res) => {
  try {
    const {
      status,
      mode,
      search,
      branch,
      department,
      minStipend,
      maxStipend,
      minCgpa,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      pageSize = '10',
      limit
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit || pageSize)) || 10));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    // Status Filter (defaults to OPEN unless specified or set to ALL)
    if (status && String(status).toUpperCase() !== 'ALL') {
      whereClause.status = String(status).toUpperCase();
    } else if (!status) {
      whereClause.status = 'OPEN';
    }

    // Work Mode Filter
    if (mode && String(mode).toUpperCase() !== 'ALL') {
      whereClause.mode = String(mode).toUpperCase();
    }

    // Stipend Range Filter
    if (minStipend !== undefined && minStipend !== '') {
      whereClause.stipend = { ...whereClause.stipend, gte: parseFloat(String(minStipend)) };
    }
    if (maxStipend !== undefined && maxStipend !== '') {
      whereClause.stipend = { ...whereClause.stipend, lte: parseFloat(String(maxStipend)) };
    }

    // Max CGPA requirement filter
    if (minCgpa !== undefined && minCgpa !== '') {
      whereClause.minCgpa = { lte: parseFloat(String(minCgpa)) };
    }

    // Department / Branch filter (search in JSON string or ALL)
    const targetBranch = branch || department;
    if (targetBranch && String(targetBranch).toUpperCase() !== 'ALL') {
      const bStr = String(targetBranch).trim();
      whereClause.OR = [
        { allowedBranches: { contains: bStr } },
        { allowedBranches: { contains: 'ALL' } }
      ];
    }

    // Keyword Search
    if (search) {
      const q = String(search).trim();
      const searchConditions = [
        { title: { contains: q } },
        { description: { contains: q } },
        { location: { contains: q } },
        { requiredSkills: { contains: q } },
        { company: { name: { contains: q } } }
      ];
      if (whereClause.OR) {
        whereClause.AND = [{ OR: searchConditions }, { OR: whereClause.OR }];
        delete whereClause.OR;
      } else {
        whereClause.OR = searchConditions;
      }
    }

    // Sorting
    const allowedSortFields = ['createdAt', 'stipend', 'deadline', 'title', 'vacancies'];
    const sortField = allowedSortFields.includes(String(sortBy)) ? String(sortBy) : 'createdAt';
    const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, internships] = await Promise.all([
      prisma.internship.count({ where: whereClause }),
      prisma.internship.findMany({
        where: whereClause,
        include: {
          company: true,
          _count: { select: { applications: true } }
        },
        orderBy: { [sortField]: orderDirection },
        skip,
        take: limitNum
      })
    ]);

    return res.json({
      success: true,
      data: internships,
      pagination: {
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/internships/:id - Vacancy details
router.get('/:id', async (req, res) => {
  try {
    const internship = await prisma.internship.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        applications: {
          include: { student: { include: { skills: true, projects: true } } }
        },
        _count: { select: { applications: true } }
      }
    });

    if (!internship) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Internship not found' } });
    }
    return res.json({ success: true, data: internship });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/internships - Create vacancy (Company only)
router.post('/', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company profile not found' } });
    }

    const {
      title, description, durationMonths, mode, location, stipend, vacancies,
      deadline, startDate, minCgpa, maxBacklogs, allowedBranches, passingYears,
      requiredSkills, requiredExperience, responsibilities, requirements, status
    } = req.body;

    // Strict Validations
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Title is required and must be at least 3 characters' }
      });
    }

    if (durationMonths !== undefined && (isNaN(Number(durationMonths)) || Number(durationMonths) <= 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Duration must be a positive number of months' }
      });
    }

    if (stipend !== undefined && (isNaN(Number(stipend)) || Number(stipend) < 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Stipend must be a non-negative number' }
      });
    }

    if (vacancies !== undefined && (isNaN(Number(vacancies)) || Number(vacancies) <= 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Openings/vacancies count must be a positive integer' }
      });
    }

    if (minCgpa !== undefined && (isNaN(Number(minCgpa)) || Number(minCgpa) < 0 || Number(minCgpa) > 10)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Minimum CGPA requirement must be between 0.00 and 10.00' }
      });
    }

    if (maxBacklogs !== undefined && (isNaN(Number(maxBacklogs)) || Number(maxBacklogs) < 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Maximum backlogs limit must be a non-negative integer' }
      });
    }

    if (mode !== undefined && !['REMOTE', 'HYBRID', 'ON_SITE'].includes(String(mode).toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Mode must be REMOTE, HYBRID, or ON_SITE' }
      });
    }

    const vacancyStatus = status && ['DRAFT', 'PUBLISHED', 'OPEN', 'PAUSED', 'CLOSED'].includes(String(status).toUpperCase())
      ? String(status).toUpperCase()
      : 'OPEN';

    const internship = await prisma.internship.create({
      data: {
        companyId: company.id,
        title: title.trim(),
        description: description || '',
        durationMonths: durationMonths ? parseInt(durationMonths) : 3,
        mode: mode ? String(mode).toUpperCase() : 'ON_SITE',
        location: location || 'Remote / Office',
        stipend: stipend !== undefined ? parseFloat(stipend) : 15000,
        vacancies: vacancies !== undefined ? parseInt(vacancies) : 2,
        deadline: deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        startDate: startDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: vacancyStatus,
        minCgpa: minCgpa !== undefined ? parseFloat(minCgpa) : 0.0,
        maxBacklogs: maxBacklogs !== undefined ? parseInt(maxBacklogs) : 0,
        allowedBranches: typeof allowedBranches === 'string' ? allowedBranches : JSON.stringify(Array.isArray(allowedBranches) ? allowedBranches : ['CSE', 'IT']),
        passingYears: typeof passingYears === 'string' ? passingYears : JSON.stringify(Array.isArray(passingYears) ? passingYears : [2026, 2027]),
        requiredSkills: typeof requiredSkills === 'string' ? requiredSkills : JSON.stringify(Array.isArray(requiredSkills) ? requiredSkills : []),
        requiredExperience: requiredExperience ? parseInt(requiredExperience) : 0,
        responsibilities: responsibilities || null,
        requirements: requirements || null,
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

// Helper for verifying vacancy ownership
async function getCompanyAndVerifyOwnership(userId: string, internshipId: string) {
  const company = await prisma.companyProfile.findUnique({ where: { userId } });
  if (!company) return { error: { status: 404, code: 'NOT_FOUND', message: 'Company profile not found' } };

  const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
  if (!internship) return { error: { status: 404, code: 'NOT_FOUND', message: 'Internship vacancy not found' } };

  if (internship.companyId !== company.id) {
    return { error: { status: 403, code: 'FORBIDDEN', message: 'You are not authorized to modify another company\'s vacancy' } };
  }

  return { company, internship };
}

// PUT /api/v1/internships/:id - Edit vacancy (Company only + Ownership check)
router.put('/:id', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const authCheck = await getCompanyAndVerifyOwnership(req.user!.id, req.params.id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({ success: false, error: { code: authCheck.error.code, message: authCheck.error.message } });
    }

    const {
      title, description, durationMonths, mode, location, stipend, vacancies,
      deadline, startDate, minCgpa, maxBacklogs, allowedBranches, passingYears,
      requiredSkills, requiredExperience, responsibilities, requirements, status
    } = req.body;

    // Field Validations
    if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Title must be at least 3 characters' }
      });
    }

    if (durationMonths !== undefined && (isNaN(Number(durationMonths)) || Number(durationMonths) <= 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Duration must be a positive number of months' }
      });
    }

    if (stipend !== undefined && (isNaN(Number(stipend)) || Number(stipend) < 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Stipend must be a non-negative number' }
      });
    }

    if (vacancies !== undefined && (isNaN(Number(vacancies)) || Number(vacancies) <= 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Openings count must be a positive integer' }
      });
    }

    if (minCgpa !== undefined && (isNaN(Number(minCgpa)) || Number(minCgpa) < 0 || Number(minCgpa) > 10)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Minimum CGPA must be between 0.00 and 10.00' }
      });
    }

    if (maxBacklogs !== undefined && (isNaN(Number(maxBacklogs)) || Number(maxBacklogs) < 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Maximum backlogs limit must be a non-negative integer' }
      });
    }

    if (mode !== undefined && !['REMOTE', 'HYBRID', 'ON_SITE'].includes(String(mode).toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Mode must be REMOTE, HYBRID, or ON_SITE' }
      });
    }

    const updated = await prisma.internship.update({
      where: { id: req.params.id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description : undefined,
        durationMonths: durationMonths !== undefined ? parseInt(durationMonths) : undefined,
        mode: mode !== undefined ? String(mode).toUpperCase() : undefined,
        location: location !== undefined ? location : undefined,
        stipend: stipend !== undefined ? parseFloat(stipend) : undefined,
        vacancies: vacancies !== undefined ? parseInt(vacancies) : undefined,
        deadline: deadline !== undefined ? deadline : undefined,
        startDate: startDate !== undefined ? startDate : undefined,
        status: status !== undefined ? String(status).toUpperCase() : undefined,
        minCgpa: minCgpa !== undefined ? parseFloat(minCgpa) : undefined,
        maxBacklogs: maxBacklogs !== undefined ? parseInt(maxBacklogs) : undefined,
        allowedBranches: allowedBranches !== undefined ? (typeof allowedBranches === 'string' ? allowedBranches : JSON.stringify(allowedBranches)) : undefined,
        passingYears: passingYears !== undefined ? (typeof passingYears === 'string' ? passingYears : JSON.stringify(passingYears)) : undefined,
        requiredSkills: requiredSkills !== undefined ? (typeof requiredSkills === 'string' ? requiredSkills : JSON.stringify(requiredSkills)) : undefined,
        requiredExperience: requiredExperience !== undefined ? parseInt(requiredExperience) : undefined,
        responsibilities: responsibilities !== undefined ? responsibilities : undefined,
        requirements: requirements !== undefined ? requirements : undefined,
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'UPDATE_VACANCY',
      entityType: 'Internship',
      entityId: updated.id
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/internships/:id/publish - Publish vacancy (status: OPEN)
router.post('/:id/publish', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const authCheck = await getCompanyAndVerifyOwnership(req.user!.id, req.params.id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({ success: false, error: { code: authCheck.error.code, message: authCheck.error.message } });
    }

    const updated = await prisma.internship.update({
      where: { id: req.params.id },
      data: { status: 'OPEN' }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'PUBLISH_VACANCY',
      entityType: 'Internship',
      entityId: updated.id
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/internships/:id/pause - Pause vacancy (status: PAUSED)
router.post('/:id/pause', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const authCheck = await getCompanyAndVerifyOwnership(req.user!.id, req.params.id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({ success: false, error: { code: authCheck.error.code, message: authCheck.error.message } });
    }

    const updated = await prisma.internship.update({
      where: { id: req.params.id },
      data: { status: 'PAUSED' }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'PAUSE_VACANCY',
      entityType: 'Internship',
      entityId: updated.id
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/internships/:id/close - Close vacancy (status: CLOSED)
router.post('/:id/close', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const authCheck = await getCompanyAndVerifyOwnership(req.user!.id, req.params.id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({ success: false, error: { code: authCheck.error.code, message: authCheck.error.message } });
    }

    const updated = await prisma.internship.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'CLOSE_VACANCY',
      entityType: 'Internship',
      entityId: updated.id
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// DELETE /api/v1/internships/:id - Delete vacancy (Company only + Ownership check)
router.delete('/:id', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const authCheck = await getCompanyAndVerifyOwnership(req.user!.id, req.params.id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({ success: false, error: { code: authCheck.error.code, message: authCheck.error.message } });
    }

    await prisma.internship.delete({ where: { id: req.params.id } });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'DELETE_VACANCY',
      entityType: 'Internship',
      entityId: req.params.id
    });

    return res.json({ success: true, message: 'Vacancy deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
