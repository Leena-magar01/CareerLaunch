import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { calculateCandidateMatch, analyzeSkillGap, analyzeResume, runCopilotQuery } from '../services/aiService';

const router = Router();

// POST /api/v1/ai/match
router.post('/match', authenticateJwt, async (req, res) => {
  try {
    const { studentId, internshipId } = req.body;
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { skills: true, projects: true, certifications: true }
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
        skills: student.skills.map(s => s.skillName),
        projects: student.projects.map(p => ({ title: p.title, technologies: p.technologies, description: p.description })),
        certifications: student.certifications.map(c => c.name)
      },
      internship: {
        title: internship.title,
        description: internship.description,
        requiredSkills,
        minCgpa: internship.minCgpa
      }
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/ai/recommendations
router.get('/recommendations', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: { skills: true, projects: true }
    });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

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
          skills: student.skills.map(s => s.skillName),
          projects: student.projects.map(p => ({ title: p.title, technologies: p.technologies, description: p.description })),
          certifications: []
        },
        internship: {
          title: v.title,
          description: v.description,
          requiredSkills,
          minCgpa: v.minCgpa
        }
      });

      return {
        vacancy: v,
        matchScore: match.matchScore,
        explanation: match.explanation
      };
    }));

    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return res.json({ success: true, data: recommendations });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/ai/skill-gap
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

// POST /api/v1/ai/resume-analyze
router.post('/resume-analyze', authenticateJwt, async (req, res) => {
  try {
    const { resumeText } = req.body;
    const result = await analyzeResume(resumeText || 'Student resume skills: Java, SQL, React. Built backend REST API.');
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/ai/copilot
router.post('/copilot', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const { query } = req.body;
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });

    const context = {
      role: req.user!.role,
      email: req.user!.email,
      fullName: student ? student.fullName : req.user!.email,
      cgpa: student?.cgpa,
      backlogs: student?.backlogs
    };

    const result = await runCopilotQuery(query || 'Am I eligible for backend roles?', context);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
