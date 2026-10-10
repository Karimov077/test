import { NextRequest, NextResponse } from 'next/server';
import { createTelegramBot } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token');

  if (!process.env.APP_SECRET || secret !== process.env.APP_SECRET) {
    return NextResponse.json({ error: 'Invalid webhook secret.' }, { status: 401 });
  }

  const bot = createTelegramBot();
  if (!bot) {
    return NextResponse.json({ error: 'Telegram bot is not configured.' }, { status: 500 });
  }

  try {
    const payload = await req.json();
    await bot.processUpdate(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
