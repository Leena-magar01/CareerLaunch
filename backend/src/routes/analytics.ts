import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';

const router = Router();

// GET /api/v1/analytics/overview (T&P Analytics Dashboard Data)
router.get('/overview', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req, res) => {
  try {
    const totalStudents = await prisma.studentProfile.count();
    const verifiedStudents = await prisma.studentProfile.count({ where: { profileStatus: 'VERIFIED' } });
    const totalCompanies = await prisma.companyProfile.count();
    const totalVacancies = await prisma.internship.count();
    const activeVacancies = await prisma.internship.count({ where: { status: 'OPEN' } });

    const totalApplications = await prisma.application.count();
    const shortlistedCount = await prisma.application.count({ where: { status: 'SHORTLISTED' } });
    const selectedCount = await prisma.application.count({ where: { status: 'SELECTED' } });

    const approvedOffers = await prisma.offer.count({ where: { status: 'APPROVED' } });
    const activeInternships = await prisma.mentorAssignment.count({ where: { status: 'ACTIVE' } });
    const completedInternships = await prisma.completion.count({ where: { status: 'APPROVED' } });
    const ppoOfferedCount = await prisma.pPO.count({ where: { status: 'OFFERED' } });

    // Funnel stage calculation
    const funnel = [
      { stage: 'Applied', count: totalApplications },
      { stage: 'Shortlisted', count: shortlistedCount },
      { stage: 'Selected', count: selectedCount },
      { stage: 'Offer Approved', count: approvedOffers },
      { stage: 'Active Interns', count: activeInternships },
      { stage: 'Completed', count: completedInternships },
      { stage: 'PPO Offered', count: ppoOfferedCount },
    ];

    // Department Distribution
    const studentsByDeptRaw = await prisma.studentProfile.groupBy({
      by: ['department'],
      _count: { id: true },
      _avg: { cgpa: true }
    });

    const departmentDistribution = studentsByDeptRaw.map(d => ({
      department: d.department,
      students: d._count.id,
      avgCgpa: d._avg.cgpa ? parseFloat(d._avg.cgpa.toFixed(2)) : 0
    }));

    // Stipend statistics
    const stipendAgg = await prisma.internship.aggregate({
      _max: { stipend: true },
      _min: { stipend: true },
      _avg: { stipend: true }
    });

    const stipendStats = {
      max: stipendAgg._max.stipend || 0,
      min: stipendAgg._min.stipend || 0,
      avg: stipendAgg._avg.stipend ? Math.round(stipendAgg._avg.stipend) : 0,
    };

    // Pending Action Queues
    const pendingVerificationsCount = await prisma.verification.count({ where: { status: 'PENDING' } });
    const pendingCompletionsCount = await prisma.completion.count({ where: { status: 'PENDING' } });

    return res.json({
      success: true,
      data: {
        metrics: {
          totalStudents,
          verifiedStudents,
          totalCompanies,
          totalVacancies,
          activeVacancies,
          totalApplications,
          selectedCount,
          approvedOffers,
          activeInternships,
          completedInternships,
          ppoOfferedCount,
          pendingVerificationsCount,
          pendingCompletionsCount
        },
        funnel,
        departmentDistribution,
        stipendStats
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
