import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import {
  calculateCandidateMatch,
  analyzeSkillGap,
  analyzeResume,
  summarizeWeeklyReports,
  generateMentorInsights,
  recommendCareerPaths,
  runCopilotQuery
} from '../services/ai/aiOrchestrator';

const router = Router();

// ============================================================
// 1. AI CANDIDATE MATCHING
// ============================================================
router.post('/match', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const { studentId, internshipId } = req.body;
    if (!studentId || !internshipId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'studentId and internshipId are required' } });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { skills: true, projects: true, certifications: true, experiences: true }
    });
    const internship = await prisma.internship.findUnique({ where: { id: internshipId } });

    if (!student || !internship) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student or internship not found' } });
    }

    const requiredSkills = JSON.parse(internship.requiredSkills || '[]');
    const result = await calculateCandidateMatch({
      student: {
        fullName: student.fullName,
        department: student.department,
        cgpa: student.cgpa,
        backlogs: student.backlogs,
        skills: student.skills.map(s => s.skillName),
        projects: student.projects.map(p => ({ title: p.title, technologies: p.technologies, description: p.description })),
        experiences: student.experiences.length,
        certifications: student.certifications.map(c => c.name),
        preferredDomains: student.preferredDomains || '',
        preferredMode: student.preferredMode || 'ANY'
      },
      internship: {
        title: internship.title,
        description: internship.description,
        requiredSkills,
        minCgpa: internship.minCgpa,
        mode: internship.mode
      }
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ============================================================
// 2. AI INTERNSHIP RECOMMENDATIONS
// ============================================================
router.get('/recommendations', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: { skills: true, projects: true, experiences: true, certifications: true }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    }

    const openVacancies = await prisma.internship.findMany({
      where: { status: 'OPEN' },
      include: { company: true }
    });

    const recommendations = await Promise.all(openVacancies.map(async (v) => {
      const requiredSkills = JSON.parse(v.requiredSkills || '[]');
      const match = await calculateCandidateMatch({
        student: {
          fullName: student.fullName,
          department: student.department,
          cgpa: student.cgpa,
          backlogs: student.backlogs,
          skills: student.skills.map(s => s.skillName),
          projects: student.projects.map(p => ({ title: p.title, technologies: p.technologies, description: p.description })),
          experiences: student.experiences.length,
          certifications: student.certifications.map(c => c.name),
          preferredDomains: student.preferredDomains || '',
          preferredMode: student.preferredMode || 'ANY'
        },
        internship: {
          title: v.title,
          description: v.description,
          requiredSkills,
          minCgpa: v.minCgpa,
          mode: v.mode
        }
      });

      return {
        vacancy: v,
        matchScore: match.matchScore,
        factors: match.factors,
        explanation: match.explanation
      };
    }));

    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return res.json({ success: true, data: recommendations });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ============================================================
// 3. AI SKILL-GAP ANALYSIS
// ============================================================
router.post('/skill-gap', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const { internshipId } = req.body;
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: { skills: true }
    });
    const internship = await prisma.internship.findUnique({ where: { id: internshipId } });

    if (!student || !internship) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student or internship not found' } });
    }

    const studentSkills = student.skills.map(s => s.skillName);
    const requiredSkills = JSON.parse(internship.requiredSkills || '[]');

    const result = await analyzeSkillGap(studentSkills, requiredSkills);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ============================================================
// 4. AI RESUME ANALYZER
// ============================================================
router.post('/resume-analyze', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const { resumeText } = req.body;
    const result = await analyzeResume(resumeText || 'Student resume skills: Java, SQL, React. Built full stack REST API.');
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ============================================================
// 5. AI WEEKLY REPORT SUMMARIZATION
// ============================================================
router.get('/weekly-report-summary/:internshipId/:studentId', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const { internshipId, studentId } = req.params;

    const reports = await prisma.progressReport.findMany({
      where: { internshipId, studentId },
      orderBy: { weekNumber: 'asc' }
    });

    const result = await summarizeWeeklyReports(reports);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ============================================================
// 6. AI MENTOR INSIGHTS
// ============================================================
router.get('/mentor-insights/:studentId', authenticateJwt, authorizeRoles('MENTOR', 'TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.params;
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });

    const [reportsCount, approvedCount, issuesCount] = await Promise.all([
      prisma.progressReport.count({ where: { studentId } }),
      prisma.progressReport.count({ where: { studentId, status: 'APPROVED' } }),
      prisma.issue.count({ where: { studentId, status: { in: ['OPEN', 'IN_PROGRESS'] } } })
    ]);

    const result = await generateMentorInsights({
      fullName: student.fullName,
      reportsCount,
      approvedCount,
      issuesCount
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ============================================================
// 7. AI CAREER RECOMMENDATIONS
// ============================================================
router.get('/career-recommendations', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: { skills: true, projects: true }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    }

    const result = await recommendCareerPaths({
      department: student.department,
      skills: student.skills.map(s => s.skillName),
      projectsCount: student.projects.length
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ============================================================
// 8. AI INTERNSHIP COPILOT
// ============================================================
router.post('/copilot', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'query is required' } });
    }

    // Retrieve only authenticated user's private platform data
    let studentContext: any = null;
    if (req.user!.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.user!.id },
        include: {
          applications: { select: { id: true, status: true } },
          ppos: { select: { status: true, offeredCtc: true } }
        }
      });

      if (student) {
        studentContext = {
          role: 'STUDENT',
          fullName: student.fullName,
          department: student.department,
          cgpa: student.cgpa,
          backlogs: student.backlogs,
          profileStatus: student.profileStatus,
          applicationsCount: student.applications.length,
          ppoStatus: student.ppos.length > 0 ? student.ppos[0].status : null,
          ppoCtc: student.ppos.length > 0 ? student.ppos[0].offeredCtc : null
        };
      }
    }

    const userContext = studentContext || {
      role: req.user!.role,
      email: req.user!.email,
      fullName: req.user!.email
    };

    const result = await runCopilotQuery(query, userContext);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
