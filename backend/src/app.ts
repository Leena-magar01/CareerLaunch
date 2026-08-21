import express from 'express';
import cors from 'cors';
import path from 'path';
import { ENV } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/error';

import authRoutes from './routes/auth';
import studentRoutes from './routes/student';
import companyRoutes from './routes/company';
import vacancyRoutes from './routes/vacancy';
import applicationRoutes from './routes/application';
import offerRoutes from './routes/offer';
import verificationRoutes from './routes/verification';
import mentorRoutes from './routes/mentor';
import progressRoutes from './routes/progress';
import evaluationRoutes from './routes/evaluation';
import completionRoutes from './routes/completion';
import ppoRoutes from './routes/ppo';
import documentRoutes from './routes/document';
import analyticsRoutes from './routes/analytics';
import aiRoutes from './routes/ai';
import verifyRoutes from './routes/verify';
import notificationRoutes from './routes/notifications';
import auditRoutes from './routes/audit';
import { securityHeaders } from './middleware/security';

const app = express();

app.use(securityHeaders);

// Allow frontend origin in both dev and production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL, // Set this on Railway to your Vercel URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(requestLogger);

// Serve static upload storage
app.use('/uploads', express.static(path.resolve(process.cwd(), ENV.UPLOAD_DIR)));

// Mount REST API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/internships', vacancyRoutes);
app.use('/api/v1', applicationRoutes);
app.use('/api/v1', offerRoutes);
app.use('/api/v1/tnp', verificationRoutes);
app.use('/api/v1/mentors', mentorRoutes);
app.use('/api/v1/tnp', mentorRoutes);
app.use('/api/v1/internships', progressRoutes);
app.use('/api/v1', progressRoutes);
app.use('/api/v1/internships', evaluationRoutes);
app.use('/api/v1/internships', completionRoutes);
app.use('/api/v1', completionRoutes);
app.use('/api/v1/internships', ppoRoutes);
app.use('/api/v1', ppoRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/verify', verifyRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/tnp/audit-logs', auditRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Internship Management System Backend', time: new Date() });
});

// Serve React SPA for all non-API routes (production)
const frontendDist = path.resolve(process.cwd(), '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Global Error Handler
app.use(errorHandler);

export default app;
