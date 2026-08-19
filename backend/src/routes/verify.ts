import { Router } from 'express';
import { prisma } from '../config/db';

const router = Router();

// GET /api/v1/verify/offer/:verificationCode
router.get('/offer/:verificationCode', async (req, res) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { verificationCode: req.params.verificationCode },
      include: {
        application: {
          include: {
            student: true,
            internship: { include: { company: true } }
          }
        }
      }
    });

    if (!offer || offer.status !== 'APPROVED') {
      return res.status(404).json({
        success: false,
        error: { code: 'VERIFICATION_FAILED', message: 'Offer record not found or not verified by T&P department.' }
      });
    }

    // Anonymize student name for public privacy compliance
    const names = offer.application.student.fullName.split(' ');
    const anonymizedName = names.map((n, i) => i === 0 ? n : n.charAt(0) + '.').join(' ');

    return res.json({
      success: true,
      data: {
        verified: true,
        verificationCode: offer.verificationCode,
        studentName: anonymizedName,
        companyName: offer.application.internship.company.name,
        roleTitle: offer.application.internship.title,
        duration: `${offer.application.internship.durationMonths} Months`,
        stipend: `₹${offer.application.internship.stipend}/mo`,
        issuedAt: offer.issuedAt,
        status: offer.status,
        verifiedBy: 'Training & Placement (T&P) Department'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/verify/certificate/:identifier (Public Certificate Verification)
router.get('/certificate/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    const completion = await prisma.completion.findFirst({
      where: {
        OR: [
          { certificateId: identifier },
          { verificationCode: identifier }
        ],
        status: 'APPROVED'
      },
      include: {
        student: true,
        internship: { include: { company: true } }
      }
    });

    if (!completion) {
      return res.status(404).json({
        success: false,
        error: { code: 'CERTIFICATE_NOT_FOUND', message: 'Internship certificate record not found or not approved by T&P cell.' }
      });
    }

    // Anonymize student name for public privacy compliance
    const names = completion.student.fullName.split(' ');
    const anonymizedName = names.map((n, i) => i === 0 ? n : n.charAt(0) + '.').join(' ');

    return res.json({
      success: true,
      data: {
        verified: true,
        certificateId: completion.certificateId,
        studentName: anonymizedName,
        studentCode: completion.student.studentCode,
        department: completion.student.department,
        companyName: completion.internship.company.name,
        internshipTitle: completion.internship.title,
        role: completion.internship.title,
        duration: `${completion.internship.durationMonths} Months`,
        completionDate: completion.completionDate,
        finalScore: completion.finalScore,
        grade: completion.grade,
        accreditation: 'AICTE / Autonomous Institutional Placement Governance',
        verifiedBy: 'Training & Placement (T&P) Department'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;

