import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';

const router = Router();

// GET /api/v1/companies/me
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
          }
        }
      }
    });

    return res.json({ success: true, data: company });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PUT /api/v1/companies/me
router.put('/me', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const { name, website, industry, description, contactName, contactEmail } = req.body;
    let company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });

    company = await prisma.companyProfile.update({
      where: { id: company.id },
      data: {
        name: name ?? company.name,
        website: website ?? company.website,
        industry: industry ?? company.industry,
        description: description ?? company.description,
        contactName: contactName ?? company.contactName,
        contactEmail: contactEmail ?? company.contactEmail,
      }
    });

    return res.json({ success: true, data: company });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
