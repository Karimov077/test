import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';
import { signToken, verifyToken } from './lib/auth';
import { createTelegramBot, validateStudentCredentials } from './lib/telegram';

const app = express();
const bot = createTelegramBot();

app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  next();
});

const isAdminRequest = (req: Request) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token) as { role?: string; telegramId?: string };
    return decoded.role === 'admin' && decoded.telegramId === (process.env.ADMIN_TELEGRAM_ID || '1840817356');
  } catch {
    return false;
  }
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!isAdminRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized admin access.' });
  }
  next();
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/api/admin/login', async (req, res) => {
  const telegramId = String(req.body?.telegramId || '');
  const password = String(req.body?.password || '');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin password is not configured.' });
  }

  if (telegramId !== (process.env.ADMIN_TELEGRAM_ID || '1840817356')) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const token = signToken({ role: 'admin', telegramId });
  return res.json({ token });
});

app.get('/api/admin/dashboard', requireAdmin, async (_req, res) => {
  const [totalStudents, activeStudents, totalTests, completedAttempts, averageScore] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { isActive: true } }),
    prisma.test.count(),
    prisma.testAttempt.count({ where: { status: 'COMPLETED' } }),
    prisma.testAttempt.aggregate({
      _avg: { percentage: true },
      where: { status: 'COMPLETED' }
    })
  ]);

  const recentResults = await prisma.testAttempt.findMany({
    where: { status: 'COMPLETED' },
    include: { student: true, test: true },
    orderBy: { completedAt: 'desc' },
    take: 5
  });

  res.json({
    totalStudents,
    activeStudents,
    totalTests,
    completedAttempts,
    averageScore: Math.round(Number(averageScore._avg.percentage || 0)),
    recentResults: recentResults.length
  });
});

app.get('/api/admin/students', requireAdmin, async (_req, res) => {
  const students = await prisma.student.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json(students);
});

app.post('/api/admin/students', requireAdmin, async (req, res) => {
  const { firstName, lastName, username, password } = req.body || {};
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First name and last name are required.' });
  }

  const safeUsername = String(username || `student_${Date.now()}`);
  const passwordString = String(password || '');

  try {
    const student = await prisma.student.create({
      data: {
        firstName: String(firstName),
        lastName: String(lastName),
        username: safeUsername,
        passwordHash: bcrypt.hashSync(passwordString || 'K7mP29xQ', 12)
      }
    });

    return res.status(201).json({
      id: student.id,
      username: student.username,
      password: passwordString || 'K7mP29xQ',
      message: 'Student created successfully.'
    });
  } catch (error) {
    return res.status(400).json({ error: 'Student creation failed. Check username uniqueness.' });
  }
});

app.get('/api/admin/tests', requireAdmin, async (_req, res) => {
  const tests = await prisma.test.findMany({
    include: { questions: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(tests);
});

app.post('/api/admin/tests', requireAdmin, async (req, res) => {
  const { title, description, code, isActive, durationSeconds } = req.body || {};
  if (!title || !code) {
    return res.status(400).json({ error: 'Title and code are required.' });
  }

  try {
    const test = await prisma.test.create({
      data: {
        title: String(title),
        description: description ? String(description) : '',
        code: String(code),
        isActive: Boolean(isActive ?? true),
        durationSeconds: Number(durationSeconds || 900)
      }
    });
    return res.status(201).json(test);
  } catch (error) {
    return res.status(400).json({ error: 'Test creation failed. Code must be unique.' });
  }
});

app.post('/api/admin/tests/:id/questions', requireAdmin, async (req, res) => {
  const { testId } = req.params;
  const question = req.body || {};
  const order = await prisma.question.count({ where: { testId: Number(testId) } });

  const created = await prisma.question.create({
    data: {
      testId: Number(testId),
      questionText: String(question.questionText || ''),
      optionA: String(question.optionA || ''),
      optionB: String(question.optionB || ''),
      optionC: String(question.optionC || ''),
      optionD: String(question.optionD || ''),
      correctAnswer: String(question.correctAnswer || 'A'),
      explanation: question.explanation ? String(question.explanation) : null,
      order: order + 1
    }
  });

  res.status(201).json(created);
});

app.get('/api/admin/results', requireAdmin, async (_req, res) => {
  const attempts = await prisma.testAttempt.findMany({
    include: {
      student: true,
      test: true
    },
    orderBy: { completedAt: 'desc' }
  });

  const formatted = attempts.map((attempt: (typeof attempts)[number]) => ({
    id: attempt.id,
    student: {
      firstName: attempt.student.firstName,
      lastName: attempt.student.lastName,
      username: attempt.student.username
    },
    test: {
      title: attempt.test.title,
      code: attempt.test.code
    },
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    correctAnswers: attempt.correctAnswers,
    wrongAnswers: attempt.wrongAnswers,
    percentage: attempt.percentage,
    status: attempt.status,
    startedAt: attempt.startedAt
  }));

  res.json(formatted);
});

app.get('/api/admin/students/:id', requireAdmin, async (req, res) => {
  const student = await prisma.student.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      attempts: {
        include: { test: true },
        orderBy: { completedAt: 'desc' }
      }
    }
  });

  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  const completed = student.attempts.filter((attempt) => attempt.status === 'COMPLETED');
  const average = completed.length ? Math.round(completed.reduce((sum, attempt) => sum + Number(attempt.percentage), 0) / completed.length) : 0;
  const bestResult = completed.length ? Math.max(...completed.map((attempt) => Number(attempt.percentage))) : 0;

  return res.json({
    ...student,
    completedAttempts: completed.length,
    averagePercentage: average,
    bestResult
  });
});

app.patch('/api/admin/students/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { firstName, lastName, username, isActive } = req.body || {};

  const student = await prisma.student.update({
    where: { id },
    data: {
      firstName: firstName ? String(firstName) : undefined,
      lastName: lastName ? String(lastName) : undefined,
      username: username ? String(username) : undefined,
      isActive: typeof isActive === 'boolean' ? isActive : undefined
    }
  });

  return res.json(student);
});

app.post('/api/admin/students/:id/reset-password', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const newPassword = Array.from({ length: 10 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[Math.floor(Math.random() * 38)]).join('');
  const hash = bcrypt.hashSync(newPassword, 12);

  const student = await prisma.student.update({
    where: { id },
    data: { passwordHash: hash }
  });

  return res.json({ username: student.username, password: newPassword });
});

app.delete('/api/admin/students/:id', requireAdmin, async (req, res) => {
  await prisma.student.delete({ where: { id: Number(req.params.id) } });
  return res.json({ ok: true });
});

app.patch('/api/admin/tests/:id', requireAdmin, async (req, res) => {
  const test = await prisma.test.update({
    where: { id: Number(req.params.id) },
    data: {
      title: req.body?.title ? String(req.body.title) : undefined,
      description: req.body?.description !== undefined ? String(req.body.description) : undefined,
      code: req.body?.code ? String(req.body.code) : undefined,
      isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
      durationSeconds: req.body?.durationSeconds !== undefined ? Number(req.body.durationSeconds) : undefined
    }
  });

  return res.json(test);
});

app.post('/api/admin/tests/:id/toggle', requireAdmin, async (req, res) => {
  const test = await prisma.test.findUnique({ where: { id: Number(req.params.id) } });
  if (!test) return res.status(404).json({ error: 'Test not found.' });

  const updated = await prisma.test.update({
    where: { id: test.id },
    data: { isActive: !test.isActive }
  });

  return res.json(updated);
});

app.delete('/api/admin/tests/:id', requireAdmin, async (req, res) => {
  await prisma.test.delete({ where: { id: Number(req.params.id) } });
  return res.json({ ok: true });
});

app.get('/api/students/:studentId/results', async (req, res) => {
  const studentId = Number(req.params.studentId);
  const results = await prisma.testAttempt.findMany({
    where: { studentId },
    include: { test: true },
    orderBy: { completedAt: 'desc' }
  });
  res.json(results);
});

app.post('/api/student/login', async (req, res) => {
  const username = String(req.body?.username || '');
  const password = String(req.body?.password || '');
  const student = await prisma.student.findUnique({ where: { username } });

  if (!student || !student.isActive) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const valid = await bcrypt.compare(password, student.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = signToken({ role: 'student', studentId: student.id, username: student.username });
  return res.json({ token, student: { id: student.id, username: student.username, firstName: student.firstName, lastName: student.lastName } });
});

app.post('/api/student/verify', async (req, res) => {
  const { username, password } = req.body || {};
  const student = await validateStudentCredentials(String(username || ''), String(password || ''));
  if (!student) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  return res.json({ valid: true, student: { id: student.id, username: student.username } });
});

app.post('/api/telegram/webhook', async (req, res) => {
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret.' });
  }

  if (!bot) {
    return res.status(500).json({ error: 'Telegram bot is not configured.' });
  }

  try {
    await bot.processUpdate(req.body);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return res.status(200).json({ ok: false });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

export default app;
