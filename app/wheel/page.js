'use client';
import { useEffect, useRef, useState } from 'react';

const SEGMENTS = [0,0,2,5,0,10,0,0,3,0,20,0];

export default function WheelPage() {
  const canvasRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [lastIndex, setLastIndex] = useState(null);

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

    const cx = size / 2, cy = size / 2, r = size / 2 - 8;
    const n = SEGMENTS.length;
    const step = (2 * Math.PI) / n;

    // wheel
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

      // label
      ctx.save();
      ctx.rotate((i + 0.5) * step);
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px system-ui';
      ctx.fillStyle = '#111827';
      const label = SEGMENTS[i] === 0 ? '×0' : '×' + SEGMENTS[i];
      ctx.fillText(label, r * 0.65, 6);
      ctx.restore();
    }
    ctx.restore();

    // pointer
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx - 12, 28);
    ctx.lineTo(cx + 12, 28);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
  };

  useEffect(() => { draw(angle); }, [angle]);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);

    const n = SEGMENTS.length;
    const index = Math.floor(Math.random() * n); // random result (simple version)
    setLastIndex(index);

    const step = (2 * Math.PI) / n;
    const target = (Math.PI / 2) - (index * step + step / 2); // center under pointer
    const turns = 6;
    const final = target + turns * 2 * Math.PI;
    const start = performance.now();
    const duration = 4000;
    const startAngle = angle % (2 * Math.PI);

    const animate = (t) => {
      const e = Math.min(1, (t - start) / duration);
      const ease = 1 - Math.pow(1 - e, 3); // ease out
      setAngle(startAngle + (final - startAngle) * ease);
      if (e < 1) requestAnimationFrame(animate);
      else setSpinning(false);
    };
    requestAnimationFrame(animate);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:24, fontFamily:'system-ui, sans-serif' }}>
      <h2 style={{ fontSize:24, fontWeight:600 }}>Wheel</h2>
      <canvas ref={canvasRef} style={{ borderRadius:'9999px', boxShadow:'0 10px 30px rgba(0,0,0,0.12)' }} />
      <button onClick={spin} disabled={spinning}
        style={{ padding:'10px 16px', borderRadius:12, background:'black', color:'white', opacity:spinning?0.5:1 }}>
        {spinning ? 'Spinning…' : 'Spin'}
      </button>
      {lastIndex !== null && <div>Result: segment #{lastIndex} (×{SEGMENTS[lastIndex]})</div>}
      <a href="/" style={{ fontSize:14 }}>← Back home</a>
    </div>
  );
}
