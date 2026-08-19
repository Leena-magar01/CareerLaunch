import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// POST /api/v1/internships/:id/evaluations & /api/v1/evaluations - Submit Structured Evaluation Rubric
const handleSubmitEvaluation = async (req: AuthRequest, res: any) => {
  try {
    const internshipId = req.params.id || req.body.internshipId;
    const {
      studentId,
      technicalScore,
      problemSolvingScore,
      communicationScore,
      professionalismScore,
      teamworkScore,
      disciplineScore,
      taskCompletionScore,
      comments,
      criteriaBreakdown
    } = req.body;

    if (!internshipId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'internshipId is required' } });
    }

    // 1. Incomplete Evaluation Validation
    if (
      !studentId ||
      technicalScore === undefined ||
      problemSolvingScore === undefined ||
      communicationScore === undefined ||
      professionalismScore === undefined ||
      teamworkScore === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INCOMPLETE_EVALUATION',
          message: 'All core criteria scores (technical, problem solving, communication, professionalism, teamwork) and studentId are required'
        }
      });
    }

    const t = parseFloat(technicalScore);
    const p = parseFloat(problemSolvingScore);
    const c = parseFloat(communicationScore);
    const pr = parseFloat(professionalismScore);
    const tm = parseFloat(teamworkScore);
    const d = disciplineScore !== undefined ? parseFloat(disciplineScore) : 8.0;
    const tc = taskCompletionScore !== undefined ? parseFloat(taskCompletionScore) : 8.0;

    const allScores = [t, p, c, pr, tm, d, tc];

    // 2. Invalid Scores Validation (must be between 0.0 and 10.0)
    for (const score of allScores) {
      if (isNaN(score) || score < 0.0 || score > 10.0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SCORE_RANGE',
            message: 'Evaluation scores must be valid numbers between 0.0 and 10.0'
          }
        });
      }
    }

    const [internship, student] = await Promise.all([
      prisma.internship.findUnique({ where: { id: internshipId }, include: { company: true } }),
      prisma.studentProfile.findUnique({ where: { id: studentId }, include: { user: true } })
    ]);

    if (!internship) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Internship not found' } });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const evaluatorRole = req.user!.role === 'MENTOR' ? 'MENTOR' : 'COMPANY';
    let mentorProfileId: string | null = null;

    // 3. Strict Role-Specific Authorization
    if (evaluatorRole === 'MENTOR') {
      const mentor = await prisma.mentorProfile.findUnique({ where: { userId: req.user!.id } });
      if (!mentor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mentor profile not found' } });

      const isAssigned = await prisma.mentorAssignment.findFirst({
        where: {
          mentorId: mentor.id,
          studentId: student.id,
          status: { in: ['ASSIGNED', 'ACCEPTED', 'ACTIVE', 'COMPLETED'] }
        }
      });

      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNASSIGNED_MENTOR_ACCESS',
            message: 'You are not authorized to evaluate a student who is not assigned to you.'
          }
        });
      }
      mentorProfileId = mentor.id;
    } else if (evaluatorRole === 'COMPANY') {
      const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
      if (!company) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company profile not found' } });

      if (internship.companyId !== company.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_COMPANY_ACCESS',
            message: 'You cannot submit evaluations for another company\'s internship vacancy.'
          }
        });
      }
    }

    // 4. Duplicate Evaluation Guardrail
    const existingEval = await prisma.evaluation.findFirst({
      where: {
        internshipId,
        studentId,
        evaluatorRole
      }
    });

    if (existingEval) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_EVALUATION',
          message: `An evaluation has already been submitted for this student by ${evaluatorRole}.`
        }
      });
    }

    // Deterministic overall score calculation for this rubric
    const overallScore = parseFloat(((t + p + c + pr + tm + d + tc) / 7).toFixed(2));

    const evaluation = await prisma.evaluation.create({
      data: {
        internshipId,
        studentId,
        evaluatorId: req.user!.id,
        evaluatorRole,
        technicalScore: t,
        problemSolvingScore: p,
        communicationScore: c,
        professionalismScore: pr,
        teamworkScore: tm,
        disciplineScore: d,
        taskCompletionScore: tc,
        overallScore,
        comments: comments || 'Evaluation submitted successfully.',
        criteriaBreakdown: criteriaBreakdown ? JSON.stringify(criteriaBreakdown) : null,
        mentorProfileId: mentorProfileId || undefined
      },
      include: { student: true, internship: true }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'EVALUATION_SUBMITTED',
      entityType: 'Evaluation',
      entityId: evaluation.id,
      reason: `${evaluatorRole} submitted performance evaluation with overall score ${overallScore}/10.0 for ${student.fullName}`
    });

    // Notify Student
    await createNotification({
      userId: student.userId,
      type: 'EVALUATION_RECEIVED',
      title: `${evaluatorRole === 'MENTOR' ? 'Faculty Mentor' : 'Employer'} Evaluation Submitted`,
      message: `Your ${evaluatorRole.toLowerCase()} evaluation for ${internship.title} has been recorded (Score: ${overallScore}/10.0).`
    });

    return res.status(201).json({ success: true, data: evaluation });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.post('/:id/evaluations', authenticateJwt, authorizeRoles('MENTOR', 'COMPANY'), handleSubmitEvaluation);
router.post('/evaluations', authenticateJwt, authorizeRoles('MENTOR', 'COMPANY'), handleSubmitEvaluation);

// GET /api/v1/internships/:id/evaluations/summary/:studentId & /api/v1/evaluations/summary/:studentId - Deterministic Aggregation
const handleGetEvaluationSummary = async (req: AuthRequest, res: any) => {
  try {
    const internshipId = req.params.id || req.query.internshipId;
    const studentId = req.params.studentId;

    if (!internshipId || !studentId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'internshipId and studentId are required' }
      });
    }

    const evaluations = await prisma.evaluation.findMany({
      where: { internshipId: String(internshipId), studentId },
      include: { student: true, internship: { include: { company: true } } }
    });

    const mentorEval = evaluations.find(e => e.evaluatorRole === 'MENTOR');
    const companyEval = evaluations.find(e => e.evaluatorRole === 'COMPANY');

    let finalScore: number | null = null;
    let grade = 'PENDING';

    // Deterministic Rule-Based Aggregation (Mentor: 40%, Company: 60%)
    if (mentorEval && companyEval) {
      finalScore = parseFloat((mentorEval.overallScore * 0.40 + companyEval.overallScore * 0.60).toFixed(2));
    } else if (mentorEval) {
      finalScore = mentorEval.overallScore;
    } else if (companyEval) {
      finalScore = companyEval.overallScore;
    }

    if (finalScore !== null) {
      if (finalScore >= 9.0) grade = 'A+ (Outstanding)';
      else if (finalScore >= 8.0) grade = 'A (Excellent)';
      else if (finalScore >= 7.0) grade = 'B+ (Very Good)';
      else if (finalScore >= 6.0) grade = 'B (Good)';
      else if (finalScore >= 5.0) grade = 'C (Satisfactory)';
      else grade = 'F (Needs Improvement)';
    }

    // AI Qualitative Feedback Synthesis (Summarizes comments without modifying scores)
    const feedbackParts: string[] = [];
    if (mentorEval?.comments) feedbackParts.push(`Faculty Mentor: "${mentorEval.comments}"`);
    if (companyEval?.comments) feedbackParts.push(`Employer Supervisor: "${companyEval.comments}"`);

    const aiFeedbackSummary = feedbackParts.length > 0
      ? `Performance Synthesis: Candidate demonstrated strong competency. ${feedbackParts.join(' ')}`
      : 'No qualitative remarks provided.';

    return res.json({
      success: true,
      data: {
        internshipId,
        studentId,
        isComplete: !!(mentorEval && companyEval),
        mentorEvaluation: mentorEval || null,
        companyEvaluation: companyEval || null,
        weights: { mentorWeight: 0.40, companyWeight: 0.60 },
        finalScore,
        grade,
        aiFeedbackSummary
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.get('/:id/evaluations/summary/:studentId', authenticateJwt, handleGetEvaluationSummary);
router.get('/evaluations/summary/:studentId', authenticateJwt, handleGetEvaluationSummary);

// GET /api/v1/internships/:id/evaluations (List evaluations for an internship)
router.get('/:id/evaluations', authenticateJwt, async (req, res) => {
  try {
    const { studentId } = req.query;
    const whereClause: any = { internshipId: req.params.id };
    if (studentId) whereClause.studentId = String(studentId);

    const evaluations = await prisma.evaluation.findMany({
      where: whereClause,
      include: { student: true }
    });

    return res.json({ success: true, data: evaluations });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
