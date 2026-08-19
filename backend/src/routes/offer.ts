import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// POST /api/v1/applications/:id/offer - Issue formal offer letter (Company)
router.post('/applications/:id/offer', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const { role, startDate, endDate, stipend, location, terms, documentId, acceptanceDeadline } = req.body;

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { student: true, internship: { include: { company: true } } }
    });

    if (!application) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }

    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company || application.internship.companyId !== company.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to issue offers for another company\'s vacancy' }
      });
    }

    // State machine validation: Must be in SHORTLISTED or SELECTED status
    const currentStatus = application.status.toUpperCase();
    if (!['SHORTLISTED', 'SELECTED'].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATE_FOR_OFFER',
          message: `Cannot issue offer for application in '${currentStatus}' status. Candidate must be shortlisted or selected first.`
        }
      });
    }

    const offerRole = role || application.internship.title;
    const offerStipend = stipend !== undefined ? parseFloat(String(stipend)) : application.internship.stipend;
    const offerLocation = location || application.internship.location || 'Company Office / Remote';
    const offerTerms = terms || 'Standard institutional internship terms apply.';
    const offerDeadline = acceptanceDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create or update Offer
    const offer = await prisma.offer.upsert({
      where: { applicationId: application.id },
      update: {
        role: offerRole,
        startDate: startDate || null,
        endDate: endDate || null,
        stipend: offerStipend,
        location: offerLocation,
        terms: offerTerms,
        documentId: documentId || null,
        acceptanceDeadline: offerDeadline,
        status: 'ISSUED',
        studentResponse: 'PENDING'
      },
      create: {
        applicationId: application.id,
        role: offerRole,
        startDate: startDate || null,
        endDate: endDate || null,
        stipend: offerStipend,
        location: offerLocation,
        terms: offerTerms,
        documentId: documentId || null,
        acceptanceDeadline: offerDeadline,
        status: 'ISSUED',
        studentResponse: 'PENDING'
      },
      include: {
        application: {
          include: { student: true, internship: { include: { company: true } } }
        }
      }
    });

    // Update application status to SELECTED
    await prisma.application.update({
      where: { id: application.id },
      data: { status: 'SELECTED' }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'ISSUE_OFFER',
      entityType: 'Offer',
      entityId: offer.id
    });

    await createNotification({
      userId: application.student.userId,
      type: 'OFFER_ISSUED',
      title: 'Congratulations! Official Internship Offer Received',
      message: `You have received an official offer letter for ${offerRole} from ${application.internship.company.name} (Stipend: ₹${offerStipend}/mo). Response deadline: ${offerDeadline}.`
    });

    return res.status(201).json({ success: true, data: offer });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/offers (Alternate general endpoint for issuing offer)
router.post('/offers', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const { applicationId, role, startDate, endDate, stipend, location, terms, documentId, acceptanceDeadline } = req.body;

    if (!applicationId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'applicationId is required' } });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { student: true, internship: { include: { company: true } } }
    });

    if (!application) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }

    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company || application.internship.companyId !== company.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to issue offers for another company\'s vacancy' }
      });
    }

    const currentStatus = application.status.toUpperCase();
    if (!['SHORTLISTED', 'SELECTED'].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATE_FOR_OFFER',
          message: `Cannot issue offer for application in '${currentStatus}' status.`
        }
      });
    }

    const offerRole = role || application.internship.title;
    const offerStipend = stipend !== undefined ? parseFloat(String(stipend)) : application.internship.stipend;
    const offerLocation = location || application.internship.location || 'Company Office / Remote';
    const offerTerms = terms || 'Standard institutional internship terms apply.';
    const offerDeadline = acceptanceDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const offer = await prisma.offer.upsert({
      where: { applicationId: application.id },
      update: {
        role: offerRole,
        startDate: startDate || null,
        endDate: endDate || null,
        stipend: offerStipend,
        location: offerLocation,
        terms: offerTerms,
        documentId: documentId || null,
        acceptanceDeadline: offerDeadline,
        status: 'ISSUED',
        studentResponse: 'PENDING'
      },
      create: {
        applicationId: application.id,
        role: offerRole,
        startDate: startDate || null,
        endDate: endDate || null,
        stipend: offerStipend,
        location: offerLocation,
        terms: offerTerms,
        documentId: documentId || null,
        acceptanceDeadline: offerDeadline,
        status: 'ISSUED',
        studentResponse: 'PENDING'
      },
      include: {
        application: {
          include: { student: true, internship: { include: { company: true } } }
        }
      }
    });

    await prisma.application.update({
      where: { id: application.id },
      data: { status: 'SELECTED' }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'ISSUE_OFFER',
      entityType: 'Offer',
      entityId: offer.id
    });

    await createNotification({
      userId: application.student.userId,
      type: 'OFFER_ISSUED',
      title: 'Congratulations! Official Internship Offer Received',
      message: `You have received an official offer letter for ${offerRole} from ${application.internship.company.name}.`
    });

    return res.status(201).json({ success: true, data: offer });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/offers/me - List all offers received by current student
router.get('/offers/me', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const offers = await prisma.offer.findMany({
      where: {
        application: {
          studentId: student.id
        }
      },
      include: {
        application: {
          include: {
            internship: {
              include: { company: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: offers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/offers/company - List all offers issued by current company
router.get('/offers/company', authenticateJwt, authorizeRoles('COMPANY'), async (req: AuthRequest, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company profile not found' } });

    const offers = await prisma.offer.findMany({
      where: {
        application: {
          internship: {
            companyId: company.id
          }
        }
      },
      include: {
        application: {
          include: {
            student: true,
            internship: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: offers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/offers/:id - View individual offer details
router.get('/offers/:id', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: {
        application: {
          include: {
            student: true,
            internship: {
              include: { company: true }
            }
          }
        }
      }
    });

    if (!offer) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } });

    return res.json({ success: true, data: offer });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/offers/:id/respond - Student accepts or declines offer
router.post('/offers/:id/respond', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const { response } = req.body; // ACCEPTED or DECLINED
    const targetResponse = String(response || '').toUpperCase();

    if (!['ACCEPTED', 'DECLINED'].includes(targetResponse)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_RESPONSE', message: 'Response must be ACCEPTED or DECLINED' }
      });
    }

    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: {
        application: {
          include: {
            student: true,
            internship: { include: { company: true } }
          }
        }
      }
    });

    if (!offer) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } });
    }

    // Check student ownership
    if (offer.application.student.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to respond to another student\'s offer' }
      });
    }

    // Check already responded
    if (offer.studentResponse !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_RESPONDED',
          message: `This offer has already been ${offer.studentResponse.toLowerCase()}`
        }
      });
    }

    // Check expiration deadline
    if (offer.acceptanceDeadline) {
      const deadlineDate = new Date(offer.acceptanceDeadline);
      const now = new Date();
      if (!isNaN(deadlineDate.getTime()) && now > deadlineDate) {
        return res.status(400).json({
          success: false,
          error: { code: 'OFFER_EXPIRED', message: 'The acceptance deadline for this offer has expired.' }
        });
      }
    }

    const isAccepted = targetResponse === 'ACCEPTED';

    const updatedOffer = await prisma.offer.update({
      where: { id: offer.id },
      data: {
        studentResponse: targetResponse,
        status: isAccepted ? 'TNP_REVIEW' : 'DECLINED'
      },
      include: {
        application: {
          include: { student: true, internship: { include: { company: true } } }
        }
      }
    });

    // Update application status
    await prisma.application.update({
      where: { id: offer.applicationId },
      data: { status: isAccepted ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED' }
    });

    if (isAccepted) {
      // Queue for institutional T&P approval
      await prisma.verification.create({
        data: {
          entityType: 'OFFER',
          entityId: offer.id,
          status: 'PENDING',
          reason: `Student accepted offer for ${offer.role || offer.application.internship.title}`
        }
      });
    }

    await createAuditLog({
      actorId: req.user!.id,
      action: isAccepted ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED',
      entityType: 'Offer',
      entityId: offer.id
    });

    // Notify Recruiter
    await createNotification({
      userId: offer.application.internship.company.userId,
      type: isAccepted ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED',
      title: isAccepted ? 'Candidate Accepted Offer Letter!' : 'Candidate Declined Offer Letter',
      message: `${offer.application.student.fullName} has ${isAccepted ? 'accepted' : 'declined'} the internship offer for ${offer.role || offer.application.internship.title}.`
    });

    return res.json({
      success: true,
      data: updatedOffer,
      message: isAccepted
        ? 'Offer accepted successfully! Sent to T&P for institutional verification.'
        : 'Offer declined.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
