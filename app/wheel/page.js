'use client';
import { useEffect, useRef, useState } from 'react';

export default function WheelPage() {
  const canvasRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wager, setWager] = useState(50);
  const [balance, setBalance] = useState(0);
  const [segments, setSegments] = useState([{type:'item', name:'Loading...'}]);
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');

  const loadMe = async () => {
    const r = await fetch('/api/me');
    if (!r.ok) { setErr('Please login at /login'); return; }
    const me = await r.json(); setBalance(me.balance || 0);
  };
  const loadItems = async () => {
    const r = await fetch(`/api/items?tier=${wager}`); const list = await r.json();
    const base = list.map(i => ({ type:'item', name:i.name }));
    const extras = [{ type:'another_spin' }, { type:'coins', amount: wager===50?100:wager===100?200:50 }];
    // random next-tier item handled by server during spin — here just preview
    setSegments([...base, ...extras, { type:'item', name:'(Next-tier random)' }]);
  };

  const draw = (a) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const size = 360; const dpr = window.devicePixelRatio || 1;
    canvas.width = size*dpr; canvas.height = size*dpr; canvas.style.width = size+'px'; canvas.style.height = size+'px';
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,size,size);
    const cx=size/2, cy=size/2, r=size/2-8; const n=segments.length||1; const step=2*Math.PI/n;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(a);
    for(let i=0;i<n;i++){
      ctx.beginPath(); ctx.moveTo(0,0); ctx.fillStyle=i%2?'#e2e8f0':'#f8fafc';
      ctx.arc(0,0,r, i*step, (i+1)*step); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.rotate((i+0.5)*step); ctx.textAlign='center'; ctx.font='bold 14px system-ui'; ctx.fillStyle='#111827';
      const lab = segments[i]?.type==='item' ? segments[i].name : segments[i]?.type==='coins' ? (`+${segments[i].amount} coins`) : 'Another spin';
      ctx.fillText(lab, r*0.65, 6); ctx.restore();
    }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(cx, 8); ctx.lineTo(cx-12, 28); ctx.lineTo(cx+12, 28); ctx.closePath(); ctx.fillStyle='#ef4444'; ctx.fill();
  };

  useEffect(()=>{ draw(angle); }, [angle, segments]);
  useEffect(()=>{ loadMe(); }, []);
  useEffect(()=>{ loadItems(); }, [wager]);

  const spin = async () => {
    setErr(''); setMessage('');
    if (spinning) return; setSpinning(true);
    const r = await fetch('/api/spin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ wager }) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || 'error'); setSpinning(false); return; }
    setBalance(j.balance || 0);
    const segs = j.segments;
    const idx = j.resultIndex;
    setSegments(segs);
    // animate to selected index
    const n = segs.length; const step = 2*Math.PI/n; const target = (Math.PI/2)-(idx*step+step/2);
    const turns = 6; const final = target + turns*2*Math.PI; const start = performance.now(); const duration = 4000; const startAngle = angle%(2*Math.PI);
    const animate = (t) => { const e = Math.min(1,(t-start)/duration); const ease = 1-Math.pow(1-e,3); setAngle(startAngle+(final-startAngle)*ease); if(e<1) requestAnimationFrame(animate); else setSpinning(false); };
    requestAnimationFrame(animate);

    // message
    if (j.result.type === 'item') setMessage(`You won item: ${j.result.name}`);
    if (j.result.type === 'coins') setMessage(`You won +${j.result.amount} coins!`);
    if (j.result.type === 'another_spin') setMessage(`Another spin (no prize).`);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:24, fontFamily:'system-ui, sans-serif' }}>
      <h2 style={{ fontSize:24, fontWeight:600 }}>Wheel</h2>
      <div>Balance: <b>{balance}</b> coins</div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <span>Wager:</span>
        <select value={wager} onChange={e=>setWager(Number(e.target.value))}>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
        <button onClick={spin} disabled={spinning} style={{ padding:'8px 12px', borderRadius:12, background:'black', color:'white', opacity:spinning?0.5:1 }}>
          {spinning ? 'Spinning…' : `Spin (-${wager})`}
        </button>
      </div>
      <canvas ref={canvasRef} style={{ borderRadius:'9999px', boxShadow:'0 10px 30px rgba(0,0,0,0.12)' }} />
      {err && <div style={{color:'red'}}>{err}</div>}
      {message && <div>{message}</div>}
      <p><a href="/">← Home</a></p>
    </div>
  );
}
