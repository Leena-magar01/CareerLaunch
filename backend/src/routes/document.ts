import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { ENV } from '../config/env';

const router = Router();

// Configure local disk storage (emulating secure S3 object key storage for hackathon MVP)
const uploadDir = path.resolve(process.cwd(), ENV.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueStorageKey = `doc-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}${ext}`;
    cb(null, uniqueStorageKey);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, PNG, and WEBP files are allowed.'));
    }
  }
});

/**
 * Access Control Helper: Determines if authenticated user has permission to access document.
 */
async function canAccessDocument(user: { id: string; role: string }, document: any): Promise<boolean> {
  // 1. Owner always has access
  if (user.id === document.ownerUserId) {
    return true;
  }

  // 2. T&P Admins and System Admins have institutional governance access
  if (user.role === 'TNP' || user.role === 'ADMIN') {
    return true;
  }

  // 3. Faculty Mentors can access documents of their assigned mentees
  if (user.role === 'MENTOR') {
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId: user.id } });
    if (mentor) {
      const student = await prisma.studentProfile.findUnique({ where: { userId: document.ownerUserId } });
      if (student) {
        const assignment = await prisma.mentorAssignment.findFirst({
          where: { mentorId: mentor.id, studentId: student.id, status: 'ACTIVE' }
        });
        if (assignment) return true;
      }
    }
  }

  // 4. Companies can access documents (e.g. Resume) of students who applied to their vacancies
  if (user.role === 'COMPANY') {
    const company = await prisma.companyProfile.findUnique({ where: { userId: user.id } });
    if (company) {
      const student = await prisma.studentProfile.findUnique({ where: { userId: document.ownerUserId } });
      if (student) {
        const applied = await prisma.application.findFirst({
          where: {
            studentId: student.id,
            internship: { companyId: company.id }
          }
        });
        if (applied) return true;
      }
    }
  }

  return false;
}

// POST /api/v1/documents/upload - Secure Document Upload
router.post('/upload', authenticateJwt, (req: AuthRequest, res: Response, next) => {
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: { code: 'FILE_SIZE_LIMIT', message: err.message } });
    } else if (err) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FILE_TYPE', message: err.message } });
    }
    next();
  });
}, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }

    const { entityType, entityId, documentType } = req.body;
    const docType = documentType || 'ACADEMIC_RECORD';

    const document = await prisma.document.create({
      data: {
        ownerUserId: req.user!.id,
        entityType: entityType || 'STUDENT',
        entityId: entityId || req.user!.id,
        documentType: docType,
        storageKey: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        status: 'VERIFIED'
      }
    });

    // If uploading a resume for a student, automatically link to StudentProfile
    if (docType === 'RESUME' && req.user!.role === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
      if (studentProfile) {
        await prisma.studentProfile.update({
          where: { id: studentProfile.id },
          data: { resumeDocumentId: document.id }
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        document,
        downloadUrl: `/api/v1/documents/${document.id}/file`
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/documents/:id - Secure Document Metadata with RBAC/Ownership Verification
router.get('/:id', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const hasAccess = await canAccessDocument(req.user!, document);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized: You do not have permission to access this document' }
      });
    }

    return res.json({
      success: true,
      data: {
        ...document,
        downloadUrl: `/api/v1/documents/${document.id}/file`
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/documents/:id/file - Stream/Download File with Strict Access Control
router.get('/:id/file', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const hasAccess = await canAccessDocument(req.user!, document);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized: You do not have permission to access this file' }
      });
    }

    const filePath = path.resolve(uploadDir, document.storageKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'File not found on storage server' } });
    }

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
    return res.sendFile(filePath);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// DELETE /api/v1/documents/:id - Delete Document with Ownership Control
router.delete('/:id', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    // Only owner or TNP/Admin can delete
    if (document.ownerUserId !== req.user!.id && req.user!.role !== 'TNP' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized: Only document owner or admin can delete this document' }
      });
    }

    // If it was linked as resume, clear link
    await prisma.studentProfile.updateMany({
      where: { resumeDocumentId: document.id },
      data: { resumeDocumentId: null }
    });

    // Delete file from disk if exists
    const filePath = path.resolve(uploadDir, document.storageKey);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Failed to delete physical file:', e);
      }
    }

    await prisma.document.delete({ where: { id: req.params.id } });

    return res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
