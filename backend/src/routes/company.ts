import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog } from '../services/auditService';

const router = Router();

// GET /api/v1/companies/me - Retrieve authenticated company profile with statistics
router.get('/me', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        internships: {
          include: {
            applications: { include: { student: true, offer: true } },
            completions: true,
            ppos: true,
            _count: { select: { applications: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        ppos: {
          include: { student: true, internship: true },
          orderBy: { updatedAt: 'desc' }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company profile not found' } });
    }

    const totalVacancies = company.internships ? company.internships.length : 0;
    const activeVacancies = company.internships ? company.internships.filter(i => i.status === 'OPEN').length : 0;
    const totalApplications = company.internships ? company.internships.reduce((acc: number, curr: any) => acc + (curr._count?.applications || 0), 0) : 0;
    const totalPPOs = company.ppos ? company.ppos.length : 0;

    return res.json({
      success: true,
      data: {
        ...company,
        stats: {
          totalVacancies,
          activeVacancies,
          totalApplications,
          totalPPOs
        }
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PUT /api/v1/companies/me - Update company profile
router.put('/me', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const { name, website, industry, description, location, phone, contactName, contactEmail } = req.body;
    let company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
    }

    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Company name must be at least 2 characters' }
      });
    }

    if (contactEmail !== undefined && contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid contact email format' }
      });
    }

    company = await prisma.companyProfile.update({
      where: { id: company.id },
      data: {
        name: name !== undefined ? name.trim() : company.name,
        website: website !== undefined ? website : company.website,
        industry: industry !== undefined ? industry : company.industry,
        description: description !== undefined ? description : company.description,
        location: location !== undefined ? location : company.location,
        phone: phone !== undefined ? phone : company.phone,
        contactName: contactName !== undefined ? contactName : company.contactName,
        contactEmail: contactEmail !== undefined ? contactEmail : company.contactEmail,
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'UPDATE_COMPANY_PROFILE',
      entityType: 'CompanyProfile',
      entityId: company.id
    });

    return res.json({ success: true, data: company });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/companies/me/internships - List company's own vacancies with pagination & filtering
router.get('/me/internships', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company profile not found' } });
    }

    const { status, search, page = '1', pageSize = '10', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(pageSize)) || 10));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = { companyId: company.id };
    if (status && status !== 'ALL') {
      whereClause.status = String(status);
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
        { requiredSkills: { contains: String(search) } }
      ];
    }

    const allowedSortFields = ['createdAt', 'stipend', 'deadline', 'title', 'vacancies'];
    const sortField = allowedSortFields.includes(String(sortBy)) ? String(sortBy) : 'createdAt';
    const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, internships] = await Promise.all([
      prisma.internship.count({ where: whereClause }),
      prisma.internship.findMany({
        where: whereClause,
        include: {
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

// GET /api/v1/companies/:id - Public/Institutional Company Profile
router.get('/:id', async (req, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({
      where: { id: req.params.id },
      include: {
        internships: {
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company profile not found' } });
    }

    return res.json({ success: true, data: company });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
