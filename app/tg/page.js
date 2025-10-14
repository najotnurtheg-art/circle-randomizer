'use client';
import { useEffect, useState } from 'react';

export default function TgAuth() {
  const [msg, setMsg] = useState('Opening Telegram WebApp...');

  useEffect(() => {
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-web-app.js';
    s.onload = async () => {
      const tg = window.Telegram?.WebApp;
      if (!tg) { setMsg('Please open from Telegram.'); return; }
      try {
        tg.expand();
        const initData = tg.initData; // signed string
        if (!initData) { setMsg('No initData. Open from Telegram.'); return; }

        const r = await fetch('/api/telegram/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });

        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setMsg(`Auth failed: ${j.error || r.status}`);
          return;
        }

        setMsg('Authorized! Redirecting...');
        window.location.href = '/';
      } catch (e) {
        setMsg('Auth error');
      }
    };
    document.body.appendChild(s);
  }, []);

  return (
    <div style={{padding: 20}}>
      <h1>Telegram Auth</h1>
      <p>{msg}</p>
    </div>
  );
}
