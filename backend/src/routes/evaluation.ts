import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog } from '../services/auditService';

const router = Router();

// POST /api/v1/internships/:id/evaluations (Mentor or Company evaluation rubric)
router.post('/:id/evaluations', authenticateJwt, authorizeRoles('MENTOR', 'COMPANY'), async (req: AuthRequest, res) => {
  try {
    const {
      studentId, technicalScore, problemSolvingScore, communicationScore,
      professionalismScore, teamworkScore, comments
    } = req.body;

    const t = parseFloat(technicalScore) || 8.0;
    const p = parseFloat(problemSolvingScore) || 8.0;
    const c = parseFloat(communicationScore) || 8.0;
    const pr = parseFloat(professionalismScore) || 8.0;
    const tm = parseFloat(teamworkScore) || 8.0;

    const overallScore = parseFloat(((t + p + c + pr + tm) / 5).toFixed(2));
    const evaluatorRole = req.user!.role === 'MENTOR' ? 'MENTOR' : 'COMPANY';

    const evaluation = await prisma.evaluation.create({
      data: {
        internshipId: req.params.id,
        studentId,
        evaluatorId: req.user!.id,
        evaluatorRole,
        technicalScore: t,
        problemSolvingScore: p,
        communicationScore: c,
        professionalismScore: pr,
        teamworkScore: tm,
        overallScore,
        comments: comments || 'Good internship performance.'
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'SUBMIT_EVALUATION',
      entityType: 'Evaluation',
      entityId: evaluation.id
    });

    return res.status(201).json({ success: true, data: evaluation });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/internships/:id/evaluations (List evaluations for internship/student)
router.get('/:id/evaluations', authenticateJwt, async (req, res) => {
  try {
    const evaluations = await prisma.evaluation.findMany({
      where: { internshipId: req.params.id },
      include: { student: true }
    });

    return res.json({ success: true, data: evaluations });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
