import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/src/lib/prisma';
import { signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  const student = await prisma.student.findUnique({ where: { username } });
  if (!student || !student.isActive) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, student.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  return NextResponse.json({
    token: signToken({ role: 'student', studentId: student.id, username: student.username }),
    student: {
      id: student.id,
      username: student.username,
      firstName: student.firstName,
      lastName: student.lastName
    }
  });
}
