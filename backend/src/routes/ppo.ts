import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// ============================================================
// 1. COMPANY PPO SUBMISSION & LIFECYCLE
// ============================================================

// POST /api/v1/internships/:id/ppo & POST /api/v1/companies/ppo & PATCH /api/v1/internships/:id/ppo
const handleCompanySubmitPPO = async (req: AuthRequest, res: any) => {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company profile not found' } });

    const internshipId = req.params.id || req.body.internshipId;
    const { studentId, role, offeredCtc, offerDate, joiningDate, location, terms, documentId, status } = req.body;

    if (!internshipId || !studentId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'internshipId and studentId are required' }
      });
    }

    const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
    if (!internship) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Internship not found' } });

    // Ownership check: Verify internship belongs to authenticated company
    if (internship.companyId !== company.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED_COMPANY_ACCESS',
          message: 'You cannot submit PPO decisions for another company\'s internship vacancy.'
        }
      });
    }

    const student = await prisma.studentProfile.findUnique({ where: { id: studentId }, include: { user: true } });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const targetStatus = status || 'OFFERED';
    const ctc = offeredCtc !== undefined ? parseFloat(offeredCtc) : 12.0;

    let ppo = await prisma.pPO.findFirst({
      where: { internshipId, studentId }
    });

    if (ppo) {
      ppo = await prisma.pPO.update({
        where: { id: ppo.id },
        data: {
          status: targetStatus,
          role: role || 'Software Development Engineer',
          offeredCtc: ctc,
          offerDate: offerDate || new Date().toISOString().split('T')[0],
          joiningDate: joiningDate || null,
          location: location || internship.location,
          terms: terms || null,
          documentId: documentId || ppo.documentId,
          isVerified: false // Resets on update for T&P re-verification
        },
        include: { student: true, company: true, internship: true }
      });
    } else {
      ppo = await prisma.pPO.create({
        data: {
          internshipId,
          studentId,
          companyId: company.id,
          status: targetStatus,
          role: role || 'Software Development Engineer',
          offeredCtc: ctc,
          offerDate: offerDate || new Date().toISOString().split('T')[0],
          joiningDate: joiningDate || null,
          location: location || internship.location,
          terms: terms || null,
          documentId: documentId || null,
          isVerified: false
        },
        include: { student: true, company: true, internship: true }
      });
    }

    // Create / Update T&P Verification Queue Entry
    const existingVerif = await prisma.verification.findFirst({
      where: { entityType: 'PPO', entityId: ppo.id }
    });
    if (!existingVerif) {
      await prisma.verification.create({
        data: {
          entityType: 'PPO',
          entityId: ppo.id,
          status: 'PENDING',
          reason: `${company.name} offered PPO (${ppo.role} @ ₹${ctc} LPA) to ${student.fullName}`
        }
      });
    }

    await createAuditLog({
      actorId: req.user!.id,
      action: `PPO_${targetStatus}`,
      entityType: 'PPO',
      entityId: ppo.id,
      reason: `${company.name} submitted PPO offer for ${student.fullName} (Role: ${ppo.role}, CTC: ₹${ctc} LPA)`
    });

    // Notify Student
    if (targetStatus === 'OFFERED') {
      await createNotification({
        userId: student.userId,
        type: 'PPO_OFFERED',
        title: '🎉 Pre-Placement Offer (PPO) Received!',
        message: `Congratulations! ${company.name} has extended a PPO for the role of ${ppo.role} with an offered CTC of ₹${ctc} LPA.`
      });
    }

    return res.status(201).json({ success: true, data: ppo });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.post('/:id/ppo', authenticateJwt, authorizeRoles('COMPANY'), handleCompanySubmitPPO);
router.patch('/:id/ppo', authenticateJwt, authorizeRoles('COMPANY'), handleCompanySubmitPPO);
router.post('/companies/ppo', authenticateJwt, authorizeRoles('COMPANY'), handleCompanySubmitPPO);

// ============================================================
// 2. T&P PPO VERIFICATION & REGISTRY
// ============================================================

// GET /api/v1/tnp/ppo (T&P lists all institutional PPOs)
router.get('/tnp/ppo', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status, isVerified, department } = req.query;
    const whereClause: any = {};

    if (status) whereClause.status = String(status);
    if (isVerified !== undefined) whereClause.isVerified = isVerified === 'true';
    if (department) whereClause.student = { department: String(department) };

    const ppos = await prisma.pPO.findMany({
      where: whereClause,
      include: {
        student: true,
        company: true,
        internship: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json({ success: true, data: ppos });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/tnp/ppo/:id/verify (T&P verifies or rejects PPO record)
router.post('/tnp/ppo/:id/verify', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status, remarks } = req.body;
    const targetStatus = String(status || 'VERIFIED').toUpperCase();

    if (!['VERIFIED', 'REJECTED'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be VERIFIED or REJECTED' }
      });
    }

    const ppo = await prisma.pPO.findUnique({
      where: { id: req.params.id },
      include: {
        student: { include: { user: true } },
        company: { include: { user: true } },
        internship: true
      }
    });

    if (!ppo) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PPO record not found' } });
    }

    const isVerified = targetStatus === 'VERIFIED';

    const updated = await prisma.pPO.update({
      where: { id: ppo.id },
      data: {
        isVerified,
        verifiedBy: req.user!.id,
        verifiedAt: new Date(),
        verificationRemarks: remarks || null
      },
      include: { student: true, company: true, internship: true }
    });

    // Update Verification Queue Record
    const verif = await prisma.verification.findFirst({
      where: { entityType: 'PPO', entityId: ppo.id }
    });
    if (verif) {
      await prisma.verification.update({
        where: { id: verif.id },
        data: {
          status: isVerified ? 'APPROVED' : 'REJECTED',
          verifierId: req.user!.id,
          reviewedAt: new Date(),
          reason: remarks || (isVerified ? 'PPO record verified by T&P cell' : 'PPO verification rejected')
        }
      });
    }

    await createAuditLog({
      actorId: req.user!.id,
      action: isVerified ? 'PPO_VERIFIED' : 'PPO_REJECTED',
      entityType: 'PPO',
      entityId: ppo.id,
      reason: remarks || (isVerified ? 'T&P cell verified PPO offer' : 'T&P cell rejected PPO record')
    });

    // Notify Student
    await createNotification({
      userId: ppo.student.userId,
      type: isVerified ? 'PPO_VERIFIED' : 'PPO_REJECTED',
      title: isVerified ? 'PPO Record Verified by T&P' : 'PPO Verification Update',
      message: isVerified
        ? `Your PPO from ${ppo.company.name} has been verified by the T&P department.`
        : `Your PPO verification has remarks from T&P: ${remarks || 'None'}`
    });

    // Notify Company
    await createNotification({
      userId: ppo.company.userId,
      type: isVerified ? 'PPO_VERIFIED' : 'PPO_REJECTED',
      title: isVerified ? 'PPO Verified' : 'PPO Verification Notice',
      message: `PPO offered to ${ppo.student.fullName} has been ${isVerified ? 'verified' : 'rejected'} by T&P.`
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ============================================================
// 3. STUDENT PPO RETRIEVAL & RESPONSE
// ============================================================

// GET /api/v1/students/me/ppo (Student views PPO details)
router.get('/students/me/ppo', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const ppos = await prisma.pPO.findMany({
      where: { studentId: student.id },
      include: {
        company: true,
        internship: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: ppos });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/students/me/ppo/:id/respond (Student accepts or declines PPO)
router.post('/students/me/ppo/:id/respond', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const { response, remarks } = req.body;
    const targetResponse = String(response || '').toUpperCase();

    if (!['ACCEPTED', 'DECLINED'].includes(targetResponse)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_RESPONSE', message: 'Response must be ACCEPTED or DECLINED' }
      });
    }

    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const ppo = await prisma.pPO.findUnique({
      where: { id: req.params.id },
      include: { company: true, internship: true }
    });

    if (!ppo) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PPO record not found' } });

    // Ownership check
    if (ppo.studentId !== student.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to respond to this PPO offer.' }
      });
    }

    const updated = await prisma.pPO.update({
      where: { id: ppo.id },
      data: {
        status: targetResponse,
        studentResponseDate: new Date(),
        studentRemarks: remarks || null
      },
      include: { company: true, internship: true }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: `PPO_${targetResponse}`,
      entityType: 'PPO',
      entityId: ppo.id,
      reason: remarks || `Student marked PPO as ${targetResponse}`
    });

    // Notify Company
    await createNotification({
      userId: ppo.company.userId,
      type: `PPO_${targetResponse}`,
      title: `PPO ${targetResponse}: ${student.fullName}`,
      message: `${student.fullName} has ${targetResponse.toLowerCase()} the Pre-Placement Offer for ${ppo.role}.`
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
