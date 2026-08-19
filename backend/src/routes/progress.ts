import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// ============================================================
// STUDENT PROGRESS REPORT SUBMISSION & RETRIEVAL
// ============================================================

// POST /api/v1/internships/:id/progress-reports & POST /api/v1/progress-reports
const handleStudentSubmitReport = async (req: AuthRequest, res: any) => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const internshipId = req.params.id || req.body.internshipId;
    if (!internshipId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'internshipId is required' } });
    }

    const { weekNumber, tasks, learning, challenges, hours, startDate, endDate, documentId } = req.body;
    if (!weekNumber || !tasks) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Week number and tasks completed are required' } });
    }

    const parsedWeek = parseInt(weekNumber);

    // Verify student is enrolled in the internship
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { company: true }
    });
    if (!internship) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Internship not found' } });

    // Guard: Prevent duplicate submission for the same week
    const existing = await prisma.progressReport.findFirst({
      where: {
        studentId: student.id,
        internshipId,
        weekNumber: parsedWeek
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'WEEK_REPORT_EXISTS',
          message: `Progress report for Week ${parsedWeek} has already been submitted for this internship.`
        }
      });
    }

    // Find assigned active mentor
    const assignment = await prisma.mentorAssignment.findFirst({
      where: {
        studentId: student.id,
        internshipId,
        status: { in: ['ASSIGNED', 'ACCEPTED', 'ACTIVE'] }
      },
      include: { mentor: true }
    });

    const report = await prisma.progressReport.create({
      data: {
        internshipId,
        studentId: student.id,
        mentorId: assignment ? assignment.mentorId : null,
        weekNumber: parsedWeek,
        startDate: startDate || null,
        endDate: endDate || null,
        tasks: tasks || '',
        learning: learning || '',
        challenges: challenges || '',
        hours: hours ? parseFloat(hours) : 40.0,
        documentId: documentId || null,
        status: 'SUBMITTED',
        taskVerificationStatus: 'PENDING'
      },
      include: { student: true, internship: { include: { company: true } } }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'PROGRESS_REPORT_SUBMITTED',
      entityType: 'ProgressReport',
      entityId: report.id,
      reason: `Submitted Week ${parsedWeek} progress report with ${report.hours} hours logged.`
    });

    // Notify assigned mentor
    if (assignment) {
      await createNotification({
        userId: assignment.mentor.userId,
        type: 'PROGRESS_REPORT_SUBMITTED',
        title: `Week ${parsedWeek} Report Submitted`,
        message: `${student.fullName} submitted their Week ${parsedWeek} progress report for ${internship.title}.`
      });
    }

    // Notify company recruiter
    await createNotification({
      userId: internship.company.userId,
      type: 'INTERN_REPORT_SUBMITTED',
      title: `Intern Progress Report: Week ${parsedWeek}`,
      message: `${student.fullName} submitted deliverables for Week ${parsedWeek}.`
    });

    return res.status(201).json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.post('/:id/progress-reports', authenticateJwt, authorizeRoles('STUDENT'), handleStudentSubmitReport);
router.post('/progress-reports', authenticateJwt, authorizeRoles('STUDENT'), handleStudentSubmitReport);

// GET /api/v1/students/me/progress-reports & /api/v1/internships/:id/my-reports
const handleGetStudentReports = async (req: AuthRequest, res: any) => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const whereClause: any = { studentId: student.id };
    if (req.params.id) whereClause.internshipId = req.params.id;

    const reports = await prisma.progressReport.findMany({
      where: whereClause,
      include: {
        mentor: true,
        internship: { include: { company: true } }
      },
      orderBy: { weekNumber: 'desc' }
    });

    return res.json({ success: true, data: reports });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.get('/students/me/progress-reports', authenticateJwt, authorizeRoles('STUDENT'), handleGetStudentReports);
router.get('/:id/my-reports', authenticateJwt, authorizeRoles('STUDENT'), handleGetStudentReports);

// ============================================================
// FACULTY MENTOR REVIEW QUEUE & EVALUATION
// ============================================================

// GET /api/v1/mentors/me/progress-reports (Mentor views report queue)
router.get('/mentors/me/progress-reports', authenticateJwt, authorizeRoles('MENTOR'), async (req: AuthRequest, res) => {
  try {
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!mentor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mentor profile not found' } });

    // Fetch reports for mentees assigned to this mentor
    const assignments = await prisma.mentorAssignment.findMany({
      where: { mentorId: mentor.id, status: { in: ['ASSIGNED', 'ACCEPTED', 'ACTIVE'] } },
      select: { studentId: true, internshipId: true }
    });

    const studentIds = assignments.map(a => a.studentId);

    const reports = await prisma.progressReport.findMany({
      where: {
        OR: [
          { mentorId: mentor.id },
          { studentId: { in: studentIds } }
        ]
      },
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

// PATCH /api/v1/reports/:id/review & POST /api/v1/progress-reports/:id/review
const handleMentorReviewReport = async (req: AuthRequest, res: any) => {
  try {
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!mentor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mentor profile not found' } });

    const { status, feedback } = req.body; // APPROVED or CHANGES_REQUIRED
    const targetStatus = String(status || '').toUpperCase();

    if (!['APPROVED', 'CHANGES_REQUIRED'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be APPROVED or CHANGES_REQUIRED' }
      });
    }

    const report = await prisma.progressReport.findUnique({
      where: { id: req.params.id },
      include: { student: true, internship: true }
    });

    if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Progress report not found' } });

    // Ownership check: Mentor must be assigned to this student
    const isAssigned = await prisma.mentorAssignment.findFirst({
      where: {
        mentorId: mentor.id,
        studentId: report.studentId,
        status: { in: ['ASSIGNED', 'ACCEPTED', 'ACTIVE'] }
      }
    });

    if (!isAssigned && report.mentorId !== mentor.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNASSIGNED_MENTOR_ACCESS', message: 'You are not authorized to review reports for this student.' }
      });
    }

    const updated = await prisma.progressReport.update({
      where: { id: report.id },
      data: {
        status: targetStatus,
        feedback: feedback || '',
        reviewedAt: new Date(),
        mentorId: mentor.id
      },
      include: { student: true, internship: true }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: `PROGRESS_REPORT_${targetStatus}`,
      entityType: 'ProgressReport',
      entityId: report.id,
      reason: feedback || `Mentor marked report as ${targetStatus}`
    });

    await createNotification({
      userId: report.student.userId,
      type: `PROGRESS_REPORT_${targetStatus}`,
      title: `Week ${report.weekNumber} Report Reviewed`,
      message: `Your faculty mentor marked Week ${report.weekNumber} report as ${targetStatus}. Feedback: "${feedback || 'None'}"`
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.patch('/reports/:id/review', authenticateJwt, authorizeRoles('MENTOR'), handleMentorReviewReport);
router.post('/progress-reports/:id/review', authenticateJwt, authorizeRoles('MENTOR'), handleMentorReviewReport);

// ============================================================
// COMPANY PROGRESS FEEDBACK & TASK VERIFICATION
// ============================================================

// GET /api/v1/companies/me/progress-reports & /api/v1/internships/:id/progress-reports
const handleGetCompanyReports = async (req: AuthRequest, res: any) => {
  try {
    const whereClause: any = {};

    if (req.user!.role === 'COMPANY') {
      const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
      if (!company) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company profile not found' } });

      const internships = await prisma.internship.findMany({
        where: { companyId: company.id },
        select: { id: true }
      });
      whereClause.internshipId = { in: internships.map(i => i.id) };
    }

    if (req.params.id) whereClause.internshipId = req.params.id;

    const reports = await prisma.progressReport.findMany({
      where: whereClause,
      include: {
        student: true,
        mentor: true,
        internship: { include: { company: true } }
      },
      orderBy: { submittedAt: 'desc' }
    });

    return res.json({ success: true, data: reports });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.get('/companies/me/progress-reports', authenticateJwt, authorizeRoles('COMPANY', 'TNP', 'ADMIN'), handleGetCompanyReports);
router.get('/:id/progress-reports', authenticateJwt, authorizeRoles('COMPANY', 'TNP', 'ADMIN'), handleGetCompanyReports);

// POST /api/v1/internships/:id/progress-reports/:reportId/company-feedback & PATCH verify
const handleCompanyFeedback = async (req: AuthRequest, res: any) => {
  try {
    const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
    if (!company) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company profile not found' } });

    const reportId = req.params.reportId || req.params.id;
    const report = await prisma.progressReport.findUnique({
      where: { id: reportId },
      include: { internship: true, student: true, mentor: true }
    });

    if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Progress report not found' } });

    // Ownership check: Verify internship belongs to authenticated company
    if (report.internship.companyId !== company.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED_COMPANY_ACCESS', message: 'You cannot provide feedback on another company\'s intern.' }
      });
    }

    const { taskVerificationStatus, companyFeedback } = req.body;
    const targetStatus = String(taskVerificationStatus || 'VERIFIED').toUpperCase();

    if (!['VERIFIED', 'NEEDS_REVISION', 'PENDING'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'taskVerificationStatus must be VERIFIED, NEEDS_REVISION, or PENDING' }
      });
    }

    const updated = await prisma.progressReport.update({
      where: { id: report.id },
      data: {
        taskVerificationStatus: targetStatus,
        companyFeedback: companyFeedback || 'Tasks and milestones verified by employer.',
        companyReviewedAt: new Date()
      },
      include: { student: true, internship: true }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'COMPANY_PROGRESS_FEEDBACK',
      entityType: 'ProgressReport',
      entityId: report.id,
      reason: `Company marked task verification as ${targetStatus}. Feedback: ${companyFeedback || 'None'}`
    });

    // Notify Student
    await createNotification({
      userId: report.student.userId,
      type: 'COMPANY_FEEDBACK_RECEIVED',
      title: `Employer Verified Week ${report.weekNumber}`,
      message: `Your company supervisor submitted task verification: ${targetStatus}.`
    });

    // Notify Mentor (if assigned)
    if (report.mentor) {
      await createNotification({
        userId: report.mentor.userId,
        type: 'COMPANY_FEEDBACK_RECEIVED',
        title: `Employer Feedback on ${report.student.fullName}`,
        message: `Employer provided task verification (${targetStatus}) on Week ${report.weekNumber}.`
      });
    }

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.post('/:id/progress-reports/:reportId/company-feedback', authenticateJwt, authorizeRoles('COMPANY'), handleCompanyFeedback);
router.patch('/reports/:id/verify', authenticateJwt, authorizeRoles('COMPANY'), handleCompanyFeedback);

// ============================================================
// MULTI-STAKEHOLDER ISSUE TRACKING WORKFLOW
// ============================================================

// POST /api/v1/issues & POST /api/v1/internships/:id/issues (Raise Issue)
const handleCreateIssue = async (req: AuthRequest, res: any) => {
  try {
    const { internshipId, studentId, priority, severity, title, description } = req.body;
    const targetInternshipId = req.params.id || internshipId;

    if (!title || !description || !targetInternshipId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'internshipId, title, and description are required' }
      });
    }

    // Resolve studentId if raised by student
    let resolvedStudentId = studentId;
    if (req.user!.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
      if (student) resolvedStudentId = student.id;
    }

    if (!resolvedStudentId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'studentId is required' }
      });
    }

    // Find mentor if assigned
    const assignment = await prisma.mentorAssignment.findFirst({
      where: {
        studentId: resolvedStudentId,
        internshipId: targetInternshipId,
        status: { in: ['ASSIGNED', 'ACCEPTED', 'ACTIVE'] }
      }
    });

    const issue = await prisma.issue.create({
      data: {
        internshipId: targetInternshipId,
        studentId: resolvedStudentId,
        mentorId: assignment ? assignment.mentorId : null,
        raisedBy: req.user!.id,
        priority: priority || 'MEDIUM',
        severity: severity || priority || 'NEEDS_ATTENTION',
        title,
        description,
        status: 'OPEN'
      },
      include: {
        student: true,
        internship: { include: { company: true } },
        mentor: true
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'ISSUE_CREATED',
      entityType: 'Issue',
      entityId: issue.id,
      reason: `Raised ${issue.priority} priority issue: "${issue.title}"`
    });

    // Notify assigned mentor
    if (assignment) {
      const mentor = await prisma.mentorProfile.findUnique({ where: { id: assignment.mentorId } });
      if (mentor) {
        await createNotification({
          userId: mentor.userId,
          type: 'ISSUE_RAISED',
          title: `New Issue Raised: ${issue.title}`,
          message: `Priority: ${issue.priority}. Description: ${issue.description}`
        });
      }
    }

    return res.status(201).json({ success: true, data: issue });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

router.post('/issues', authenticateJwt, handleCreateIssue);
router.post('/:id/issues', authenticateJwt, handleCreateIssue);

// GET /api/v1/issues (List issues)
router.get('/issues', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const { status, priority, internshipId } = req.query;
    const whereClause: any = {};

    if (status) whereClause.status = String(status);
    if (priority) whereClause.priority = String(priority);
    if (internshipId) whereClause.internshipId = String(internshipId);

    // Scoping based on role
    if (req.user!.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
      if (student) whereClause.studentId = student.id;
    } else if (req.user!.role === 'MENTOR') {
      const mentor = await prisma.mentorProfile.findUnique({ where: { userId: req.user!.id } });
      if (mentor) {
        whereClause.OR = [
          { mentorId: mentor.id },
          { raisedBy: req.user!.id }
        ];
      }
    } else if (req.user!.role === 'COMPANY') {
      const company = await prisma.companyProfile.findUnique({ where: { userId: req.user!.id } });
      if (company) {
        const internships = await prisma.internship.findMany({
          where: { companyId: company.id },
          select: { id: true }
        });
        whereClause.internshipId = { in: internships.map(i => i.id) };
      }
    }

    const issues = await prisma.issue.findMany({
      where: whereClause,
      include: {
        student: true,
        mentor: true,
        internship: { include: { company: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: issues });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/issues/:id (Get single issue)
router.get('/issues/:id', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const issue = await prisma.issue.findUnique({
      where: { id: req.params.id },
      include: {
        student: true,
        mentor: true,
        internship: { include: { company: true } }
      }
    });

    if (!issue) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Issue not found' } });
    return res.json({ success: true, data: issue });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/v1/issues/:id/status (Update Issue Status)
router.patch('/issues/:id/status', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const { status, resolution } = req.body;
    const targetStatus = String(status || '').toUpperCase();

    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be OPEN, IN_PROGRESS, RESOLVED, or CLOSED' }
      });
    }

    const issue = await prisma.issue.findUnique({
      where: { id: req.params.id },
      include: { student: true, internship: true, mentor: true }
    });

    if (!issue) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Issue not found' } });

    const isResolved = targetStatus === 'RESOLVED' || targetStatus === 'CLOSED';

    const updated = await prisma.issue.update({
      where: { id: issue.id },
      data: {
        status: targetStatus,
        resolution: resolution || issue.resolution,
        resolvedAt: isResolved ? new Date() : null
      },
      include: { student: true, internship: true, mentor: true }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: `ISSUE_${targetStatus}`,
      entityType: 'Issue',
      entityId: issue.id,
      reason: resolution || `Updated issue status to ${targetStatus}`
    });

    // Notify student
    await createNotification({
      userId: issue.student.userId,
      type: `ISSUE_${targetStatus}`,
      title: `Issue ${targetStatus}: ${issue.title}`,
      message: resolution ? `Resolution: ${resolution}` : `Status updated to ${targetStatus}`
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/issues/:id/assign (Assign issue to T&P or Faculty Resolver)
router.post('/issues/:id/assign', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'assignedTo is required' } });
    }

    const updated = await prisma.issue.update({
      where: { id: req.params.id },
      data: { assignedTo, status: 'IN_PROGRESS' },
      include: { student: true }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'ISSUE_ASSIGNED',
      entityType: 'Issue',
      entityId: updated.id,
      reason: `Assigned issue to resolver ${assignedTo}`
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
