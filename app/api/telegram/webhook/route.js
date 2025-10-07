export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

async function sendMessage(token, chatId, text, url) {
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [[{ text: 'Open Wheel', web_app: { url } }]]
      }
    })
  });
  return resp.json();
}

export async function POST(req) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: 'No TELEGRAM_BOT_TOKEN' }, { status: 500 });

  const update = await req.json();
  const origin = req.nextUrl.origin;         // e.g., https://your-app.vercel.app
  const webAppUrl = `${origin}/tg`;

  const msg = update.message;
  if (msg && msg.chat && msg.chat.id) {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    if (text.startsWith('/start')) {
      await sendMessage(token, chatId, 'Tap to open the wheel:', webAppUrl);
    } else {
      await sendMessage(token, chatId, 'Open the wheel:', webAppUrl);
    }
  }

  // Handle menu_button clicks etc. if needed later.

  return NextResponse.json({ ok: true });
}
