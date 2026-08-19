import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';

const router = Router();

// In-memory cache for high-frequency analytics queries (30-second TTL)
const analyticsCache: { [key: string]: { timestamp: number; data: any } } = {};
const CACHE_TTL_MS = 30 * 1000;

const getCachedData = (key: string) => {
  const cached = analyticsCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  analyticsCache[key] = { timestamp: Date.now(), data };
};

// ============================================================
// 1. INSTITUTIONAL T&P DASHBOARD METRICS
// ============================================================

// GET /api/v1/analytics/dashboard & GET /api/v1/analytics/overview
const handleInstitutionalDashboard = async (req: AuthRequest, res: any) => {
  try {
    const { department, passingYear, batch, academicYear, companyId, domain } = req.query;

    const studentWhere: any = {};
    if (department) studentWhere.department = String(department);
    if (passingYear || batch) studentWhere.passingYear = parseInt(String(passingYear || batch), 10);

    const cacheKey = `dashboard_${JSON.stringify(req.query)}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, fromCache: true });
    }

    // 1. Student Aggregations
    const [totalStudents, verifiedStudents, eligibleStudents] = await Promise.all([
      prisma.studentProfile.count({ where: studentWhere }),
      prisma.studentProfile.count({ where: { ...studentWhere, profileStatus: 'VERIFIED' } }),
      prisma.studentProfile.count({
        where: {
          ...studentWhere,
          profileStatus: 'VERIFIED',
          backlogs: 0,
          cgpa: { gte: 6.0 }
        }
      })
    ]);

    // 2. Internship & Application Aggregations
    const appWhere: any = {};
    if (studentWhere.department || studentWhere.passingYear) {
      appWhere.student = studentWhere;
    }
    if (companyId) {
      appWhere.internship = { companyId: String(companyId) };
    }

    const [totalApplications, shortlistedCount, selectedCount, activeInternships, completedInternships, ppoOfferedCount] = await Promise.all([
      prisma.application.count({ where: appWhere }),
      prisma.application.count({ where: { ...appWhere, status: 'SHORTLISTED' } }),
      prisma.application.count({
        where: {
          ...appWhere,
          status: { in: ['SELECTED', 'OFFER_ACCEPTED', 'COMPLETED'] }
        }
      }),
      prisma.mentorAssignment.count({
        where: {
          status: 'ACTIVE',
          ...(studentWhere.department ? { student: { department: String(studentWhere.department) } } : {})
        }
      }),
      prisma.completion.count({
        where: {
          status: 'APPROVED',
          ...(studentWhere.department ? { student: { department: String(studentWhere.department) } } : {})
        }
      }),
      prisma.pPO.count({
        where: {
          status: { in: ['OFFERED', 'ACCEPTED'] },
          ...(studentWhere.department ? { student: { department: String(studentWhere.department) } } : {})
        }
      })
    ]);

    // Rates Calculation
    const totalPlaced = completedInternships + activeInternships;
    const completionRate = totalPlaced > 0
      ? parseFloat(((completedInternships / totalPlaced) * 100).toFixed(1))
      : 0.0;

    const ppoRate = completedInternships > 0
      ? parseFloat(((ppoOfferedCount / completedInternships) * 100).toFixed(1))
      : (selectedCount > 0 ? parseFloat(((ppoOfferedCount / selectedCount) * 100).toFixed(1)) : 0.0);

    // 3. Department-wise Breakdown
    const deptStatsRaw = await prisma.studentProfile.groupBy({
      by: ['department'],
      _count: { id: true },
      _avg: { cgpa: true },
      where: passingYear || batch ? { passingYear: parseInt(String(passingYear || batch), 10) } : undefined
    });

    const departmentDistribution = await Promise.all(
      deptStatsRaw.map(async (d) => {
        const deptActive = await prisma.mentorAssignment.count({
          where: { student: { department: d.department }, status: 'ACTIVE' }
        });
        const deptCompleted = await prisma.completion.count({
          where: { student: { department: d.department }, status: 'APPROVED' }
        });
        const deptPPO = await prisma.pPO.count({
          where: { student: { department: d.department }, status: { in: ['OFFERED', 'ACCEPTED'] } }
        });

        return {
          department: d.department,
          totalStudents: d._count.id,
          avgCgpa: d._avg.cgpa ? parseFloat(d._avg.cgpa.toFixed(2)) : 0,
          activeInterns: deptActive,
          completedInterns: deptCompleted,
          ppoCount: deptPPO,
          completionRate: (deptActive + deptCompleted) > 0
            ? parseFloat(((deptCompleted / (deptActive + deptCompleted)) * 100).toFixed(1))
            : 0.0
        };
      })
    );

    // 4. Stipend Statistics
    const stipendAgg = await prisma.internship.aggregate({
      _max: { stipend: true },
      _min: { stipend: true },
      _avg: { stipend: true },
      where: companyId ? { companyId: String(companyId) } : undefined
    });

    const stipendStats = {
      max: stipendAgg._max.stipend || 0,
      min: stipendAgg._min.stipend || 0,
      avg: stipendAgg._avg.stipend ? Math.round(stipendAgg._avg.stipend) : 0
    };

    // 5. Funnel Pipeline
    const funnel = [
      { stage: 'Total Students', count: totalStudents },
      { stage: 'Verified & Eligible', count: eligibleStudents },
      { stage: 'Applied', count: totalApplications },
      { stage: 'Shortlisted', count: shortlistedCount },
      { stage: 'Selected', count: selectedCount },
      { stage: 'Active Interns', count: activeInternships },
      { stage: 'Completed', count: completedInternships },
      { stage: 'PPO Offered', count: ppoOfferedCount }
    ];

    const result = {
      metrics: {
        totalStudents,
        verifiedStudents,
        eligibleStudents,
        totalApplications,
        selectedStudents: selectedCount,
        activeInternships,
        completedInternships,
        completionRate,
        ppoCount: ppoOfferedCount,
        ppoRate
      },
      funnel,
      departmentDistribution,
      stipendStats
    };

    setCachedData(cacheKey, result);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.get('/dashboard', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleInstitutionalDashboard);
router.get('/overview', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleInstitutionalDashboard);

// ============================================================
// 2. COMPANY ENGAGEMENT ANALYTICS
// ============================================================

// GET /api/v1/analytics/companies (All companies analytics)
router.get('/companies', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req, res) => {
  try {
    const companies = await prisma.companyProfile.findMany({
      include: {
        internships: {
          include: {
            applications: true,
            evaluations: true,
            completions: true,
            ppos: true
          }
        }
      }
    });

    const companyAnalytics = companies.map(c => {
      const internshipsPosted = c.internships.length;
      let totalApplications = 0;
      let totalSelections = 0;
      let activeInterns = 0;
      let completedInternships = 0;
      let pposOffered = 0;
      let totalEvalScore = 0;
      let evalCount = 0;

      for (const v of c.internships) {
        totalApplications += v.applications.length;
        totalSelections += v.applications.filter(a => ['SELECTED', 'OFFER_ACCEPTED', 'COMPLETED'].includes(a.status)).length;
        activeInterns += v.applications.filter(a => a.status === 'OFFER_ACCEPTED').length;
        completedInternships += v.completions.filter(comp => comp.status === 'APPROVED').length;
        pposOffered += v.ppos.filter(p => ['OFFERED', 'ACCEPTED'].includes(p.status)).length;

        for (const ev of v.evaluations) {
          totalEvalScore += ev.overallScore;
          evalCount++;
        }
      }

      return {
        companyId: c.id,
        companyName: c.name,
        industry: c.industry,
        location: c.location,
        internshipsPosted,
        applicationsReceived: totalApplications,
        selectionsCount: totalSelections,
        activeInterns,
        completedInternships,
        pposOffered,
        avgEvaluationScore: evalCount > 0 ? parseFloat((totalEvalScore / evalCount).toFixed(2)) : 0.0
      };
    });

    return res.json({ success: true, data: companyAnalytics });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/analytics/companies/:id (Single company analytics)
router.get('/companies/:id', authenticateJwt, authorizeRoles('TNP', 'ADMIN', 'COMPANY'), async (req: AuthRequest, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({
      where: { id: req.params.id },
      include: {
        internships: {
          include: {
            applications: true,
            evaluations: true,
            completions: true,
            ppos: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
    }

    // Role check: If company, must be own profile
    if (req.user!.role === 'COMPANY') {
      const authComp = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
      if (!authComp || authComp.id !== company.id) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
    }

    const internshipsPosted = company.internships.length;
    let totalApplications = 0;
    let totalSelections = 0;
    let activeInterns = 0;
    let completedInternships = 0;
    let pposOffered = 0;
    let totalEvalScore = 0;
    let evalCount = 0;

    for (const v of company.internships) {
      totalApplications += v.applications.length;
      totalSelections += v.applications.filter(a => ['SELECTED', 'OFFER_ACCEPTED', 'COMPLETED'].includes(a.status)).length;
      activeInterns += v.applications.filter(a => a.status === 'OFFER_ACCEPTED').length;
      completedInternships += v.completions.filter(comp => comp.status === 'APPROVED').length;
      pposOffered += v.ppos.filter(p => ['OFFERED', 'ACCEPTED'].includes(p.status)).length;

      for (const ev of v.evaluations) {
        totalEvalScore += ev.overallScore;
        evalCount++;
      }
    }

    return res.json({
      success: true,
      data: {
        companyId: company.id,
        companyName: company.name,
        industry: company.industry,
        location: company.location,
        internshipsPosted,
        applicationsReceived: totalApplications,
        selectionsCount: totalSelections,
        activeInterns,
        completedInternships,
        pposOffered,
        avgEvaluationScore: evalCount > 0 ? parseFloat((totalEvalScore / evalCount).toFixed(2)) : 0.0
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ============================================================
// 3. FACULTY MENTOR WORKLOAD & PERFORMANCE ANALYTICS
// ============================================================

// GET /api/v1/analytics/mentors (All mentors analytics)
router.get('/mentors', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req, res) => {
  try {
    const mentors = await prisma.mentorProfile.findMany({
      include: {
        assignments: {
          include: { student: true, internship: true }
        }
      }
    });

    const mentorAnalytics = await Promise.all(
      mentors.map(async (m) => {
        const assignedStudents = m.assignments.length;
        const activeInternships = m.assignments.filter(a => a.status === 'ACTIVE').length;
        const completedInternships = m.assignments.filter(a => a.status === 'COMPLETED').length;

        // Pending weekly reports
        const pendingReports = await prisma.progressReport.count({
          where: { mentorId: m.id, status: 'SUBMITTED' }
        });

        // Open student issues
        const openIssues = await prisma.issue.count({
          where: {
            mentorId: m.id,
            status: { in: ['OPEN', 'IN_PROGRESS'] }
          }
        });

        const completionRate = assignedStudents > 0
          ? parseFloat(((completedInternships / assignedStudents) * 100).toFixed(1))
          : 0.0;

        return {
          mentorId: m.id,
          mentorName: m.fullName,
          department: m.department,
          assignedStudents,
          activeInternships,
          pendingReports,
          openIssues,
          completedInternships,
          completionRate
        };
      })
    );

    return res.json({ success: true, data: mentorAnalytics });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/analytics/mentors/:id (Single mentor analytics)
router.get('/mentors/:id', authenticateJwt, authorizeRoles('TNP', 'ADMIN', 'MENTOR'), async (req: AuthRequest, res) => {
  try {
    const mentor = await prisma.mentorProfile.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: {
          include: { student: true, internship: true }
        }
      }
    });

    if (!mentor) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mentor not found' } });
    }

    if (req.user!.role === 'MENTOR') {
      const authMentor = await prisma.mentorProfile.findUnique({ where: { userId: req.user!.id } });
      if (!authMentor || authMentor.id !== mentor.id) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
    }

    const assignedStudents = mentor.assignments.length;
    const activeInternships = mentor.assignments.filter(a => a.status === 'ACTIVE').length;
    const completedInternships = mentor.assignments.filter(a => a.status === 'COMPLETED').length;

    const pendingReports = await prisma.progressReport.count({
      where: { mentorId: mentor.id, status: 'SUBMITTED' }
    });

    const openIssues = await prisma.issue.count({
      where: {
        mentorId: mentor.id,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    });

    const completionRate = assignedStudents > 0
      ? parseFloat(((completedInternships / assignedStudents) * 100).toFixed(1))
      : 0.0;

    return res.json({
      success: true,
      data: {
        mentorId: mentor.id,
        mentorName: mentor.fullName,
        department: mentor.department,
        assignedStudents,
        activeInternships,
        pendingReports,
        openIssues,
        completedInternships,
        completionRate
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
