'use client';

import { useEffect, useRef } from 'react';

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function animate(from, to, duration, onFrame) {
  return new Promise((resolve) => {
    const start = performance.now();
    const base = from % (2 * Math.PI);
    const delta = to - base;
    const final = base + 6 * 2 * Math.PI + delta; // 6 full turns then land exactly
    const run = (t) => {
      const p = Math.min(1, (t - start) / duration);
      onFrame(base + (final - base) * easeOutCubic(p));
      if (p < 1) requestAnimationFrame(run);
      else resolve();
    };
    requestAnimationFrame(run);
  });
}

export default function WheelCanvas({ angle, segments }) {
  const canvasRef = useRef(null);

  const draw = (a) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 360;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const s = Array.isArray(segments) && segments.length
      ? segments
      : ['Add items in /admin/items'];

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 8;
    const n = s.length;
    const step = (2 * Math.PI) / Math.max(1, n);

    // Disc
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);

    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.fillStyle = i % 2 ? '#e2e8f0' : '#f8fafc';
      ctx.arc(0, 0, r, i * step, (i + 1) * step);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.rotate((i + 0.5) * step);
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px system-ui';
      ctx.fillStyle = '#111827';
      const text = String(segments[i]).slice(0, 28);
      ctx.fillText(text, r * 0.65, 6);
      ctx.restore();
    }
    ctx.restore();

    // Pointer top
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx - 12, 28);
    ctx.lineTo(cx + 12, 28);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Center disc
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#111827';
    ctx.fill();
  };

  useEffect(() => { draw(angle); }, [angle, segments]);

  return (
    <canvas
      ref={canvasRef}
      style={{ borderRadius: '9999px', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', background: '#fff' }}
    />
  );
}

// Promise animator (page uses this)
WheelCanvas.animateTo = async (from, to, duration, setAngle) => {
  await animate(from, to, duration, setAngle);
};
