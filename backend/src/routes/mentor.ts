import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';
import { calculateProfileCompleteness } from '../services/studentProfileService';

const router = Router();

// GET /api/v1/tnp/mentors & /api/v1/mentors/list & /api/v1/tnp/mentors/workload - Workload analytics
const handleGetMentorsList = async (req: AuthRequest, res: any) => {
  try {
    const { department } = req.query;

    const whereClause: any = {};
    if (department) whereClause.department = String(department);

    const mentors = await prisma.mentorProfile.findMany({
      where: whereClause,
      include: {
        user: { select: { email: true } },
        assignments: {
          where: { status: { in: ['ASSIGNED', 'ACCEPTED', 'ACTIVE'] } },
          include: {
            student: {
              include: { user: { select: { email: true } } }
            },
            internship: {
              include: { company: true }
            }
          }
        }
      },
      orderBy: { fullName: 'asc' }
    });

    const populated = mentors.map((m) => {
      const activeCount = m.assignments.length;
      const capacity = m.maxCapacity || 10;
      const loadPercentage = Math.round((activeCount / capacity) * 100);
      return {
        ...m,
        activeMenteesCount: activeCount,
        workloadPercentage: loadPercentage,
        isOverCapacity: activeCount >= capacity
      };
    });

    return res.json({ success: true, data: populated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.get('/list', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleGetMentorsList);
router.get('/mentors', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleGetMentorsList);
router.get('/mentors/workload', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleGetMentorsList);

// POST /api/v1/tnp/mentor-assignments & /api/v1/mentors/assignments - Assign Faculty Mentor
const handleAssignMentor = async (req: AuthRequest, res: any) => {
  try {
    const { studentId, internshipId, mentorId, remarks } = req.body;

    if (!studentId || !internshipId || !mentorId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'studentId, internshipId, and mentorId are required' }
      });
    }

    const [student, internship, mentor] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { id: studentId } }),
      prisma.internship.findUnique({ where: { id: internshipId } }),
      prisma.mentorProfile.findUnique({ where: { id: mentorId } })
    ]);

    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    if (!internship) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Internship not found' } });
    if (!mentor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Faculty mentor not found' } });

    // Guardrail: Duplicate Active Assignment Prevention
    const existingActive = await prisma.mentorAssignment.findFirst({
      where: {
        studentId,
        internshipId,
        status: { in: ['ASSIGNED', 'ACCEPTED', 'ACTIVE'] }
      },
      include: { mentor: true }
    });

    if (existingActive) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ACTIVE_ASSIGNMENT_EXISTS',
          message: `Student already has an active mentor (${existingActive.mentor.fullName}) assigned for this internship. Reassign if needed.`
        }
      });
    }

    const assignment = await prisma.mentorAssignment.create({
      data: {
        studentId,
        internshipId,
        mentorId,
        assignedBy: req.user!.id,
        status: 'ASSIGNED',
        remarks: remarks || null
      },
      include: { student: true, mentor: true, internship: { include: { company: true } } }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'MENTOR_ASSIGNED',
      entityType: 'MentorAssignment',
      entityId: assignment.id,
      reason: `Assigned mentor ${mentor.fullName} to student ${student.fullName} for ${internship.title}`
    });

    // Notifications
    await createNotification({
      userId: student.userId,
      type: 'MENTOR_ASSIGNED',
      title: 'Faculty Mentor Assigned',
      message: `${mentor.fullName} (${mentor.department}) has been assigned as your faculty mentor for ${internship.title}.`
    });

    await createNotification({
      userId: mentor.userId,
      type: 'STUDENT_ASSIGNED',
      title: 'New Student Mentee Assigned',
      message: `You have been assigned to mentor ${student.fullName} for their internship at ${assignment.internship.company.name}. Please review and accept the assignment.`
    });

    return res.status(201).json({ success: true, data: assignment });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.post('/assignments', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleAssignMentor);
router.post('/mentor-assignments', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleAssignMentor);

// POST /api/v1/tnp/mentor-assignments/:id/reassign - Reassign to a new Faculty Mentor
const handleReassignMentor = async (req: AuthRequest, res: any) => {
  try {
    const { newMentorId, reason } = req.body;

    if (!newMentorId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'newMentorId is required for reassignment' }
      });
    }

    const currentAssignment = await prisma.mentorAssignment.findUnique({
      where: { id: req.params.id },
      include: { student: true, mentor: true, internship: { include: { company: true } } }
    });

    if (!currentAssignment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mentor assignment not found' } });
    }

    const newMentor = await prisma.mentorProfile.findUnique({ where: { id: newMentorId } });
    if (!newMentor) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'New faculty mentor not found' } });
    }

    // Close previous assignment
    await prisma.mentorAssignment.update({
      where: { id: currentAssignment.id },
      data: {
        status: 'REASSIGNED',
        reassignedAt: new Date(),
        remarks: reason || `Reassigned to ${newMentor.fullName}`
      }
    });

    // Create new assignment
    const newAssignment = await prisma.mentorAssignment.create({
      data: {
        studentId: currentAssignment.studentId,
        internshipId: currentAssignment.internshipId,
        mentorId: newMentor.id,
        assignedBy: req.user!.id,
        status: 'ASSIGNED',
        remarks: reason || `Reassigned from ${currentAssignment.mentor.fullName}`
      },
      include: { student: true, mentor: true, internship: { include: { company: true } } }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'MENTOR_REASSIGNED',
      entityType: 'MentorAssignment',
      entityId: newAssignment.id,
      reason: `Reassigned mentee ${currentAssignment.student.fullName} from ${currentAssignment.mentor.fullName} to ${newMentor.fullName}. Reason: ${reason || 'T&P administrative update'}`
    });

    // Notify previous mentor
    await createNotification({
      userId: currentAssignment.mentor.userId,
      type: 'MENTOR_REASSIGNED',
      title: 'Mentee Reassigned',
      message: `${currentAssignment.student.fullName}'s mentorship has been reassigned to ${newMentor.fullName}.`
    });

    // Notify new mentor
    await createNotification({
      userId: newMentor.userId,
      type: 'STUDENT_ASSIGNED',
      title: 'New Student Mentee Assigned (Reassignment)',
      message: `You have been assigned to mentor ${currentAssignment.student.fullName} for their internship at ${currentAssignment.internship.company.name}.`
    });

    // Notify student
    await createNotification({
      userId: currentAssignment.student.userId,
      type: 'MENTOR_REASSIGNED',
      title: 'Faculty Mentor Updated',
      message: `Your faculty mentor has been reassigned to ${newMentor.fullName} (${newMentor.department}).`
    });

    return res.json({ success: true, data: newAssignment });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.post('/assignments/:id/reassign', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleReassignMentor);
router.post('/mentor-assignments/:id/reassign', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), handleReassignMentor);

// GET /api/v1/mentors/me/assignments - Mentor view assigned students and details
router.get('/me/assignments', authenticateJwt, authorizeRoles('MENTOR'), async (req: AuthRequest, res) => {
  try {
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!mentor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mentor profile not found' } });

    const assignments = await prisma.mentorAssignment.findMany({
      where: { mentorId: mentor.id },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
            skills: true,
            projects: true,
            experiences: true,
            progressReports: { orderBy: { weekNumber: 'desc' } },
            issues: { where: { status: 'OPEN' } }
          }
        },
        internship: { include: { company: true } }
      },
      orderBy: { assignedAt: 'desc' }
    });

    // Attach student completeness
    const populated = await Promise.all(assignments.map(async (a) => {
      const documents = await prisma.document.findMany({
        where: { ownerUserId: a.student.userId }
      });
      const completeness = calculateProfileCompleteness(a.student, documents.length);
      return {
        ...a,
        studentDocuments: documents,
        studentCompleteness: completeness
      };
    }));

    return res.json({ success: true, data: populated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/mentors/assignments/:id/respond - Mentor accepts or rejects assignment
router.post('/assignments/:id/respond', authenticateJwt, authorizeRoles('MENTOR'), async (req: AuthRequest, res) => {
  try {
    const { response, remarks } = req.body;
    const targetResponse = String(response || '').toUpperCase();

    if (!['ACCEPTED', 'REJECTED'].includes(targetResponse)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_RESPONSE', message: 'Response must be ACCEPTED or REJECTED' }
      });
    }

    const assignment = await prisma.mentorAssignment.findUnique({
      where: { id: req.params.id },
      include: { mentor: true, student: true, internship: { include: { company: true } } }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assignment not found' } });
    }

    // Ownership check
    if (assignment.mentor.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to respond to another mentor\'s assignment' }
      });
    }

    const isAccepted = targetResponse === 'ACCEPTED';

    const updated = await prisma.mentorAssignment.update({
      where: { id: assignment.id },
      data: {
        status: targetResponse,
        acceptedAt: isAccepted ? new Date() : null,
        rejectedAt: !isAccepted ? new Date() : null,
        remarks: remarks || null
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: isAccepted ? 'MENTOR_ASSIGNMENT_ACCEPTED' : 'MENTOR_ASSIGNMENT_REJECTED',
      entityType: 'MentorAssignment',
      entityId: assignment.id,
      reason: remarks || (isAccepted ? 'Faculty mentor accepted mentee assignment' : 'Faculty mentor rejected assignment')
    });

    // Notify Student
    await createNotification({
      userId: assignment.student.userId,
      type: isAccepted ? 'MENTOR_ACCEPTED' : 'MENTOR_REJECTED',
      title: isAccepted ? 'Mentor Accepted Assignment' : 'Mentor Unavailable',
      message: isAccepted
        ? `Prof. ${assignment.mentor.fullName} has accepted and confirmed your mentorship.`
        : `Prof. ${assignment.mentor.fullName} is currently unavailable. T&P will reassign your mentor.`
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/mentors/me/students/:studentId - View student dossier (Guarded: Unassigned mentor access blocked)
router.get('/me/students/:studentId', authenticateJwt, authorizeRoles('MENTOR'), async (req: AuthRequest, res) => {
  try {
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!mentor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mentor profile not found' } });

    // Guard: Check if mentor is assigned to this student
    const activeAssignment = await prisma.mentorAssignment.findFirst({
      where: {
        mentorId: mentor.id,
        studentId: req.params.studentId,
        status: { in: ['ASSIGNED', 'ACCEPTED', 'ACTIVE', 'COMPLETED'] }
      }
    });

    if (!activeAssignment) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNASSIGNED_MENTOR_ACCESS',
          message: 'Access denied. You are not assigned as faculty mentor to this student.'
        }
      });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: req.params.studentId },
      include: {
        user: { select: { id: true, email: true, createdAt: true } },
        skills: true,
        projects: true,
        experiences: true,
        certifications: true,
        progressReports: { orderBy: { weekNumber: 'desc' } },
        issues: true,
        evaluations: true
      }
    });

    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const documents = await prisma.document.findMany({
      where: { ownerUserId: student.userId }
    });

    const completeness = calculateProfileCompleteness(student, documents.length);

    return res.json({
      success: true,
      data: {
        student,
        documents,
        completeness,
        assignment: activeAssignment
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
