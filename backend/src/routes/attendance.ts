import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { createAuditLog, createNotification } from '../services/auditService';

const router = Router();

// Helper to format date as YYYY-MM-DD
function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to format time as hh:mm AM/PM
function getCurrentTimeStr(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Helper to calculate streak & stats
function calculateAttendanceStats(records: any[]) {
  let present = 0;
  let absent = 0;
  let leave = 0;
  let halfDay = 0;

  for (const r of records) {
    if (r.status === 'PRESENT') present++;
    else if (r.status === 'ABSENT') absent++;
    else if (r.status === 'LEAVE') leave++;
    else if (r.status === 'HALF_DAY') halfDay++;
  }

  const total = present + absent + leave + halfDay;
  const percentage = total > 0 ? Math.round(((present + (halfDay * 0.5)) / total) * 100) : 100;

  // Calculate consecutive present streak (sorted by date descending)
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const r of sorted) {
    if (r.status === 'PRESENT' || r.status === 'HALF_DAY') {
      streak++;
    } else {
      break;
    }
  }

  return {
    present,
    absent,
    leave,
    halfDay,
    total,
    percentage,
    streak
  };
}

// GET /api/v1/attendance/me - Student view their own attendance records & metrics
router.get('/me', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        applications: {
          where: { status: { in: ['SELECTED', 'OFFER_ACCEPTED'] } },
          include: { internship: { include: { company: true } } }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    }

    const todayStr = getTodayDateStr();

    // Fetch all attendance logs for this student
    const records = await prisma.attendance.findMany({
      where: { studentId: student.id },
      include: { internship: { include: { company: true } } },
      orderBy: { date: 'desc' }
    });

    const todayRecord = records.find(r => r.date === todayStr) || null;
    const stats = calculateAttendanceStats(records);

    // Active internship metadata
    const activeInternship = student.applications.length > 0 ? student.applications[0].internship : null;

    return res.json({
      success: true,
      data: {
        todayRecord,
        stats,
        records,
        activeInternship: activeInternship ? {
          id: activeInternship.id,
          title: activeInternship.title,
          companyName: activeInternship.company?.name || 'Partner Company',
          startDate: activeInternship.startDate || '01 Jul 2026'
        } : null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/attendance/check-in - Live Check-in for today
router.post('/check-in', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        applications: {
          where: { status: { in: ['SELECTED', 'OFFER_ACCEPTED'] } },
          include: { internship: true }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    }

    const todayStr = getTodayDateStr();
    const currentTime = getCurrentTimeStr();
    const activeInternshipId = student.applications.length > 0 ? student.applications[0].internshipId : null;

    const { workingMode = 'OFFICE', remarks } = req.body;

    const existing = await prisma.attendance.findUnique({
      where: {
        studentId_date: {
          studentId: student.id,
          date: todayStr
        }
      }
    });

    let record;
    if (existing) {
      if (existing.isCurrentlyWorking) {
        return res.status(400).json({ success: false, error: { code: 'ALREADY_CHECKED_IN', message: 'You have already checked in for today.' } });
      }
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: 'PRESENT',
          checkIn: existing.checkIn || currentTime,
          isCurrentlyWorking: true,
          workingMode,
          remarks: remarks || existing.remarks
        }
      });
    } else {
      record = await prisma.attendance.create({
        data: {
          studentId: student.id,
          internshipId: activeInternshipId,
          date: todayStr,
          status: 'PRESENT',
          checkIn: currentTime,
          isCurrentlyWorking: true,
          workingMode,
          source: 'LIVE',
          remarks: remarks || 'Live check-in'
        }
      });
    }

    await createAuditLog({
      actorId: req.user!.id,
      action: 'ATTENDANCE_CHECK_IN',
      entityType: 'Attendance',
      entityId: record.id,
      reason: `Checked in at ${record.checkIn} on ${todayStr}`
    });

    return res.json({ success: true, data: record, message: `Checked in successfully at ${record.checkIn}!` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/attendance/check-out - Live Check-out for today
router.post('/check-out', authenticateJwt, authorizeRoles('STUDENT'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    }

    const todayStr = getTodayDateStr();
    const currentTime = getCurrentTimeStr();

    const existing = await prisma.attendance.findUnique({
      where: {
        studentId_date: {
          studentId: student.id,
          date: todayStr
        }
      }
    });

    if (!existing || !existing.isCurrentlyWorking) {
      return res.status(400).json({ success: false, error: { code: 'NOT_CHECKED_IN', message: 'No active check-in found for today. Please check in first.' } });
    }

    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: currentTime,
        isCurrentlyWorking: false
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'ATTENDANCE_CHECK_OUT',
      entityType: 'Attendance',
      entityId: updated.id,
      reason: `Checked out at ${updated.checkOut} on ${todayStr}`
    });

    return res.json({ success: true, data: updated, message: `Checked out successfully at ${updated.checkOut}!` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/attendance/log - Add past or manual attendance entry
router.post('/log', authenticateJwt, authorizeRoles('STUDENT', 'MENTOR', 'COMPANY', 'TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { studentId: targetStudentId, date, status = 'PRESENT', checkIn, checkOut, workingMode = 'OFFICE', remarks } = req.body;

    let studentId = targetStudentId;
    if (req.user!.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
      if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
      studentId = student.id;
    }

    if (!studentId || !date) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'studentId and date (YYYY-MM-DD) are required' } });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        applications: {
          where: { status: { in: ['SELECTED', 'OFFER_ACCEPTED'] } },
          include: { internship: true }
        }
      }
    });

    if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });

    const activeInternshipId = student.applications.length > 0 ? student.applications[0].internshipId : null;

    const source = req.user!.role === 'STUDENT' ? 'SELF_ADDED' : `${req.user!.role}_MARKED`;

    const record = await prisma.attendance.upsert({
      where: {
        studentId_date: {
          studentId,
          date
        }
      },
      update: {
        status,
        checkIn: checkIn || (status === 'PRESENT' ? '09:00 AM' : undefined),
        checkOut: checkOut || (status === 'PRESENT' ? '05:00 PM' : undefined),
        isCurrentlyWorking: false,
        workingMode,
        remarks: remarks || `Logged by ${req.user!.role}`,
        source
      },
      create: {
        studentId,
        internshipId: activeInternshipId,
        date,
        status,
        checkIn: checkIn || (status === 'PRESENT' ? '09:00 AM' : undefined),
        checkOut: checkOut || (status === 'PRESENT' ? '05:00 PM' : undefined),
        isCurrentlyWorking: false,
        workingMode,
        source,
        remarks: remarks || `Logged by ${req.user!.role}`
      }
    });

    await createAuditLog({
      actorId: req.user!.id,
      action: 'ATTENDANCE_LOG_ADDED',
      entityType: 'Attendance',
      entityId: record.id,
      reason: `Logged attendance for ${date} as ${status}`
    });

    return res.json({ success: true, data: record, message: `Attendance for ${date} recorded as ${status}!` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PUT /api/v1/attendance/:id - Edit attendance time or details
router.put('/:id', authenticateJwt, async (req: AuthRequest, res) => {
  try {
    const { checkIn, checkOut, status, workingMode, remarks } = req.body;

    const existing = await prisma.attendance.findUnique({
      where: { id: req.params.id },
      include: { student: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Attendance record not found' } });
    }

    // Role verification
    if (req.user!.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
      if (!student || student.id !== existing.studentId) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to edit another student record' } });
      }
    }

    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkIn: checkIn !== undefined ? checkIn : existing.checkIn,
        checkOut: checkOut !== undefined ? checkOut : existing.checkOut,
        status: status !== undefined ? status : existing.status,
        workingMode: workingMode !== undefined ? workingMode : existing.workingMode,
        remarks: remarks !== undefined ? remarks : existing.remarks
      }
    });

    return res.json({ success: true, data: updated, message: 'Attendance updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/attendance/student/:studentId - Review student attendance (Mentor, Company, T&P)
router.get('/student/:studentId', authenticateJwt, authorizeRoles('MENTOR', 'COMPANY', 'TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: req.params.studentId },
      include: {
        user: { select: { email: true } },
        applications: {
          where: { status: { in: ['SELECTED', 'OFFER_ACCEPTED'] } },
          include: { internship: { include: { company: true } } }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    }

    const records = await prisma.attendance.findMany({
      where: { studentId: student.id },
      include: { internship: { include: { company: true } } },
      orderBy: { date: 'desc' }
    });

    const stats = calculateAttendanceStats(records);
    const activeInternship = student.applications.length > 0 ? student.applications[0].internship : null;

    return res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          fullName: student.fullName,
          studentCode: student.studentCode,
          department: student.department
        },
        activeInternship: activeInternship ? {
          id: activeInternship.id,
          title: activeInternship.title,
          companyName: activeInternship.company?.name || 'Partner Company'
        } : null,
        stats,
        records
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/attendance/:id/verify - Mentor or Company verify attendance record
router.post('/:id/verify', authenticateJwt, authorizeRoles('MENTOR', 'COMPANY', 'TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const record = await prisma.attendance.findUnique({ where: { id: req.params.id } });
    if (!record) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Attendance record not found' } });
    }

    const updateData: any = {};
    if (req.user!.role === 'MENTOR') updateData.verifiedByMentor = true;
    if (req.user!.role === 'COMPANY') updateData.verifiedByCompany = true;
    if (req.user!.role === 'TNP' || req.user!.role === 'ADMIN') {
      updateData.verifiedByMentor = true;
      updateData.verifiedByCompany = true;
    }

    const updated = await prisma.attendance.update({
      where: { id: req.params.id },
      data: updateData
    });

    return res.json({ success: true, data: updated, message: 'Attendance verified successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/attendance/analytics/compliance - Institutional Attendance Compliance (T&P Admin)
router.get('/analytics/compliance', authenticateJwt, authorizeRoles('TNP', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const students = await prisma.studentProfile.findMany({
      include: {
        attendances: true,
        applications: {
          where: { status: { in: ['SELECTED', 'OFFER_ACCEPTED'] } },
          include: { internship: { include: { company: true } } }
        }
      }
    });

    const complianceList = students.map((s) => {
      const stats = calculateAttendanceStats(s.attendances);
      const isLowAttendance = stats.total >= 5 && stats.percentage < 75;
      const activeInternship = s.applications.length > 0 ? s.applications[0].internship : null;

      return {
        studentId: s.id,
        fullName: s.fullName,
        studentCode: s.studentCode,
        department: s.department,
        internshipTitle: activeInternship?.title || 'Active Internship',
        companyName: activeInternship?.company?.name || 'Partner Company',
        stats,
        isLowAttendance
      };
    });

    const totalTracked = complianceList.filter(c => c.stats.total > 0).length;
    const lowAttendanceCount = complianceList.filter(c => c.isLowAttendance).length;
    const avgInstitutionalPercentage = totalTracked > 0
      ? Math.round(complianceList.reduce((acc, curr) => acc + curr.stats.percentage, 0) / complianceList.length)
      : 100;

    return res.json({
      success: true,
      data: {
        totalTracked,
        lowAttendanceCount,
        avgInstitutionalPercentage,
        students: complianceList
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
