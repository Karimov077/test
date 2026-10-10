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

  const tests = await prisma.test.findMany({ include: { questions: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(tests);
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json();
  const title = String(body.title || '').trim();
  const code = String(body.code || '').trim();
  const description = String(body.description || '').trim();

  if (!title || !code) {
    return NextResponse.json({ error: 'Title and code are required.' }, { status: 400 });
  }

  try {
    const created = await prisma.test.create({
      data: {
        title,
        description,
        code,
        isActive: Boolean(body.isActive ?? true),
        durationSeconds: Number(body.durationSeconds || 900)
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Test creation failed. Code must be unique.' }, { status: 400 });
  }
}
