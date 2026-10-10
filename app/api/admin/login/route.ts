import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const telegramId = String(body.telegramId || '');
    const password = String(body.password || '');

    if (telegramId !== (process.env.ADMIN_TELEGRAM_ID || '1840817356')) {
      return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
    }

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
    }

    return NextResponse.json({ token: signToken({ role: 'admin', telegramId }) });
  } catch {
    return NextResponse.json({ error: 'Unable to process admin login.' }, { status: 500 });
  }
}
