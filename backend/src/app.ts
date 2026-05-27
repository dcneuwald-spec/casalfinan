import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import coupleRoutes from './routes/couple';
import transactionRoutes from './routes/transactions';
import categoryRoutes from './routes/categories';
import creditCardRoutes from './routes/creditCards';
import billRoutes from './routes/bills';
import budgetRoutes from './routes/budgets';
import reportRoutes from './routes/reports';
import dashboardRoutes from './routes/dashboard';

dotenv.config();

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS — allow Vercel preview URLs and configured frontend URL
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow if in the list or if it's a Vercel preview URL
    if (allowedOrigins.some(o => origin.startsWith(o)) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // permissive for now — tighten in production if needed
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check — also surfaces DB config status
app.get('/api/health', async (_req, res) => {
  const dbConfigured = !!process.env.DATABASE_URL;
  if (!dbConfigured) {
    return res.status(503).json({
      status: 'error',
      message: 'DATABASE_URL not configured',
      fix: 'Add DATABASE_URL to Vercel environment variables',
    });
  }
  try {
    // Quick DB ping
    const { PrismaClient } = await import('@prisma/client');
    const p = new PrismaClient();
    await p.$queryRaw`SELECT 1`;
    await p.$disconnect();
    return res.json({ status: 'ok', message: 'CasalFinan API', db: 'connected', timestamp: new Date() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(503).json({ status: 'error', message: 'DB connection failed', detail: msg });
  }
});

// Routes — all prefixed with /api
app.use('/api/auth', authRoutes);
app.use('/api/couple', coupleRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/credit-cards', creditCardRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

export default app;
