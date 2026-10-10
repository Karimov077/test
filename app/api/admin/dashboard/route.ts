import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { verifyToken } from '@/lib/auth';

function authorized(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  try {
    const token = auth.replace('Bearer ', '');
    const payload = verifyToken(token) as { role?: string; telegramId?: string };
    return payload.role === 'admin' && payload.telegramId === (process.env.ADMIN_TELEGRAM_ID || '1840817356');
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const [totalStudents, activeStudents, totalTests, completedAttempts, avg] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { isActive: true } }),
    prisma.test.count(),
    prisma.testAttempt.count({ where: { status: 'COMPLETED' } }),
    prisma.testAttempt.aggregate({
      where: { status: 'COMPLETED' },
      _avg: { percentage: true }
    })
  ]);

  const recentResults = await prisma.testAttempt.findMany({
    where: { status: 'COMPLETED' },
    include: { student: true, test: true },
    orderBy: { completedAt: 'desc' },
    take: 5
  });

  return NextResponse.json({
    totalStudents,
    activeStudents,
    totalTests,
    completedAttempts,
    averageScore: Math.round(Number(avg._avg.percentage || 0)),
    recentResults: recentResults.length
  });
}
