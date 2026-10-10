import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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

  const students = await prisma.student.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = await req.json();
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const username = String(body.username || `student_${Date.now()}`).trim();
  const password = String(body.password || '').trim() || 'K7mP29xQ';

  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'First and last name are required.' }, { status: 400 });
  }

  try {
    const created = await prisma.student.create({
      data: {
        firstName,
        lastName,
        username,
        passwordHash: bcrypt.hashSync(password, 12)
      }
    });

    return NextResponse.json({
      id: created.id,
      username: created.username,
      password,
      message: 'Student created successfully.'
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Student creation failed. Check username uniqueness.' }, { status: 400 });
  }
}
