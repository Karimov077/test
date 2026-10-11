import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = String(body.password || '');

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Admin paroli noto‘g‘ri.' }, { status: 401 });
    }

    return NextResponse.json({ token: 'local-admin-session' });
  } catch {
    return NextResponse.json({ error: 'Kirish so‘rovini tekshirib bo‘lmadi.' }, { status: 400 });
  }
}
