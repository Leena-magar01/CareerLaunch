import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { ENV } from '../config/env';

const router = Router();

// Configure local disk storage (emulating S3 object key storage for hackathon MVP)
const uploadDir = path.resolve(process.cwd(), ENV.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
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

// POST /api/v1/documents/upload
router.post('/upload', authenticateJwt, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }

    const { entityType, entityId, documentType } = req.body;

    const document = await prisma.document.create({
      data: {
        ownerUserId: req.user!.id,
        entityType: entityType || 'GENERAL',
        entityId: entityId || req.user!.id,
        documentType: documentType || 'ACADEMIC_RECORD',
        storageKey: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        status: 'VERIFIED'
      }
    });

    return res.status(201).json({
      success: true,
      data: {
        document,
        url: `/uploads/${req.file.filename}`
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/documents/:id
router.get('/:id', authenticateJwt, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });

    return res.json({
      success: true,
      data: {
        ...document,
        downloadUrl: `/uploads/${document.storageKey}`
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;
