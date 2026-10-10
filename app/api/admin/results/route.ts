import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function adminAuth(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  try {
    const payload = verifyToken(auth.replace('Bearer ', '')) as { role?: string; telegramId?: string };
    return payload.role === 'admin' && payload.telegramId === (process.env.ADMIN_TELEGRAM_ID || '1840817356');
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const attempts = await prisma.testAttempt.findMany({
    include: { student: true, test: true },
    orderBy: { completedAt: 'desc' }
  });

  return NextResponse.json(attempts.map((attempt) => ({
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
  })));
}
