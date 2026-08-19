import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// GET /api/v1/mentors/list (T&P list available mentors)
router.get('/list', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req, res) => {
  try {
    const mentors = await prisma.mentorProfile.findMany({
      include: {
        user: { select: { email: true } },
        _count: { select: { assignments: true } }
      }
    });

    return res.json({ success: true, data: mentors });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/tnp/mentor-assignments (T&P assigns mentor)
router.post('/assignments', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { studentId, internshipId, mentorId } = req.body;

    if (!studentId || !internshipId || !mentorId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'studentId, internshipId and mentorId required' } });
    }

    const assignment = await prisma.mentorAssignment.create({
      data: {
        studentId,
        internshipId,
        mentorId,
        assignedBy: req.user!.id,
        status: 'ACTIVE'
      },
      include: { student: true, mentor: true, internship: true }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'ASSIGN_MENTOR',
      entityType: 'MentorAssignment',
      entityId: assignment.id
    });

    // Notify Student & Mentor
    await createNotification({
      userId: assignment.student.userId,
      type: 'MENTOR_ASSIGNED',
      title: 'Faculty Mentor Assigned',
      message: `${assignment.mentor.fullName} has been assigned as your faculty mentor for ${assignment.internship.title}.`
    });

    await createNotification({
      userId: assignment.mentor.userId,
      type: 'STUDENT_ASSIGNED',
      title: 'New Student Assigned',
      message: `You have been assigned to mentor ${assignment.student.fullName} for their internship at ${assignment.internship.title}.`
    });

    return res.status(201).json({ success: true, data: assignment });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/mentors/me/assignments (Mentor view assigned students)
router.get('/me/assignments', authenticateJwt, authorizeRoles('MENTOR'), async (req: AuthRequest, res) => {
  try {
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!mentor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mentor profile not found' } });

    const assignments = await prisma.mentorAssignment.findMany({
      where: { mentorId: mentor.id },
      include: {
        student: {
          include: {
            skills: true,
            progressReports: { orderBy: { weekNumber: 'desc' } },
            issues: { where: { status: 'OPEN' } }
          }
        },
        internship: { include: { company: true } }
      }
    });

    return res.json({ success: true, data: assignments });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
