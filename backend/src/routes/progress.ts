import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// POST /api/v1/internships/:id/progress-reports (Student submits weekly report)
router.post('/:id/progress-reports', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const { weekNumber, tasks, learning, challenges, hours } = req.body;
    if (!weekNumber || !tasks) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Week number and tasks are required' } });
    }

    // Find assigned mentor
    const assignment = await prisma.mentorAssignment.findFirst({
      where: { studentId: student.id, internshipId: req.params.id, status: 'ACTIVE' }
    });

    const report = await prisma.progressReport.create({
      data: {
        internshipId: req.params.id,
        studentId: student.id,
        mentorId: assignment ? assignment.mentorId : null,
        weekNumber: parseInt(weekNumber),
        tasks: tasks || '',
        learning: learning || '',
        challenges: challenges || '',
        hours: hours ? parseFloat(hours) : 40.0,
        status: 'SUBMITTED'
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'SUBMIT_PROGRESS_REPORT',
      entityType: 'ProgressReport',
      entityId: report.id
    });

    if (assignment) {
      const mentor = await prisma.mentorProfile.findUnique({ where: { id: assignment.mentorId } });
      if (mentor) {
        await createNotification({
          userId: mentor.userId,
          type: 'PROGRESS_REPORT_SUBMITTED',
          title: `Week ${weekNumber} Report Submitted`,
          message: `${student.fullName} submitted their Week ${weekNumber} progress report.`
        });
      }
    }

    return res.status(201).json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/mentors/me/progress-reports (Mentor views report queue)
router.get('/mentors/me/progress-reports', authenticateJwt, authorizeRoles('MENTOR'), async (req: AuthRequest, res) => {
  try {
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!mentor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mentor profile not found' } });

    const reports = await prisma.progressReport.findMany({
      where: { mentorId: mentor.id },
      include: {
        student: true,
        internship: { include: { company: true } }
      },
      orderBy: { submittedAt: 'desc' }
    });

    return res.json({ success: true, data: reports });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/v1/progress-reports/:id/review (Mentor approves or requests changes)
router.patch('/reports/:id/review', authenticateJwt, authorizeRoles('MENTOR'), async (req: AuthRequest, res) => {
  try {
    const { status, feedback } = req.body; // APPROVED or CHANGES_REQUIRED
    if (!['APPROVED', 'CHANGES_REQUIRED'].includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be APPROVED or CHANGES_REQUIRED' } });
    }

    const report = await prisma.progressReport.update({
      where: { id: req.params.id },
      data: {
        status,
        feedback: feedback || '',
        reviewedAt: new Date()
      },
      include: { student: true }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: `PROGRESS_REPORT_${status}`,
      entityType: 'ProgressReport',
      entityId: report.id
    });

    await createNotification({
      userId: report.student.userId,
      type: `PROGRESS_REPORT_${status}`,
      title: `Week ${report.weekNumber} Report Reviewed`,
      message: `Your mentor marked Week ${report.weekNumber} report as ${status}. Feedback: "${feedback || 'None'}"`
    });

    return res.json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/internships/:id/issues (Mentor flags student progress issue)
router.post('/:id/issues', authenticateJwt, authorizeRoles('MENTOR'), async (req: AuthRequest, res) => {
  try {
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!mentor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mentor profile not found' } });

    const { studentId, severity, title, description } = req.body;
    const issue = await prisma.issue.create({
      data: {
        internshipId: req.params.id,
        studentId,
        mentorId: mentor.id,
        severity: severity || 'NEEDS_ATTENTION',
        title: title || 'Progress Concern',
        description: description || '',
        status: 'OPEN'
      }
    });

    return res.status(201).json({ success: true, data: issue });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
