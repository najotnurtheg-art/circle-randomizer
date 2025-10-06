'use client';
import { useEffect, useRef, useState } from 'react';

function label(seg) {
  if (!seg) return '';
  if (seg.type === 'item') return seg.name;
  if (seg.type === 'coins') return `+${seg.amount} coins`;
  return 'Another spin';
}

export default function WheelPage() {
  const canvasRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wager, setWager] = useState(50);
  const [balance, setBalance] = useState(0);
  const [segments, setSegments] = useState([]);
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');
  const [state, setState] = useState({ status: 'IDLE', username: null, resultIndex: null, segments: [] });
  const [me, setMe] = useState(null);

  const draw = (a, segs) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const size = 360; const dpr = window.devicePixelRatio || 1;
    canvas.width = size*dpr; canvas.height = size*dpr; canvas.style.width = size+'px'; canvas.style.height = size+'px';
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,size,size);
    const s = segs.length ? segs : [{type:'item', name:'Add items in /admin/items'}];
    const cx=size/2, cy=size/2, r=size/2-8; const n=s.length; const step=2*Math.PI/n;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(a);
    for(let i=0;i<n;i++){
      ctx.beginPath(); ctx.moveTo(0,0); ctx.fillStyle=i%2?'#e2e8f0':'#f8fafc';
      ctx.arc(0,0,r, i*step, (i+1)*step); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.rotate((i+0.5)*step); ctx.textAlign='center'; ctx.font='bold 14px system-ui'; ctx.fillStyle='#111827';
      ctx.fillText(label(s[i]), r*0.65, 6); ctx.restore();
    }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(cx, 8); ctx.lineTo(cx-12, 28); ctx.lineTo(cx+12, 28); ctx.closePath(); ctx.fillStyle='#ef4444'; ctx.fill();
  };

  // load me + balance
  const loadMe = async () => {
    const r = await fetch('/api/me');
    if (r.ok) {
      const j = await r.json();
      setMe(j);
      setBalance(j.balance || 0);
    } else {
      setMe(null);
    }
  };

  // poll global spin state
  const loadState = async () => {
    const r = await fetch('/api/spin/state');
    const j = await r.json();
    setState(j);
    if (j.status !== 'IDLE' && j.segments?.length) setSegments(j.segments);
    if (j.status === 'RESULT' && typeof j.resultIndex === 'number') {
      // animate to show the result (everyone sees it!)
      animateTo(j.resultIndex, j.segments || []);
    }
  };

  useEffect(() => { loadMe(); }, []);
  useEffect(() => {
    draw(angle, segments);
  }, [angle, segments]);

  useEffect(() => {
    loadState();
    const id = setInterval(loadState, 1200); // every ~1.2s
    return () => clearInterval(id);
  }, []);

  const animateTo = (idx, segs) => {
    if (!segs.length) return;
    const n = segs.length; const step = 2*Math.PI/n; const target = (Math.PI/2)-(idx*step+step/2);
    const turns = 6; const final = target + turns*2*Math.PI; const start = performance.now(); const duration = 4000; const startAngle = angle%(2*Math.PI);
    const run = (t) => { const e = Math.min(1,(t-start)/duration); const ease = 1-Math.pow(1-e,3); setAngle(startAngle+(final-startAngle)*ease); if (e<1) requestAnimationFrame(run); };
    requestAnimationFrame(run);
  };

  const spin = async () => {
    setErr(''); setMessage('');
    if (!me) { setErr('Please login at /login'); return; }
    if (state.status !== 'IDLE' && state.username !== me.username) {
      setErr(`Busy: ${state.username} is spinning`);
      return;
    }
    setSpinning(true);
    const r = await fetch('/api/spin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ wager }) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || 'error'); setSpinning(false); return; }
    setSegments(j.segments || []);
    animateTo(j.resultIndex, j.segments || []);
    // message + balance
    if (j.result?.type === 'item') setMessage(`You won item: ${j.result.name}`);
    if (j.result?.type === 'coins') setMessage(`You won +${j.result.amount} coins!`);
    if (j.result?.type === 'another_spin') setMessage(`Another spin (no prize).`);
    setBalance(j.balance || 0);
    setSpinning(false);

    // release lock (only spinner can)
    await fetch('/api/spin/reset', { method: 'POST' });
    await loadState();
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:24, fontFamily:'system-ui, sans-serif' }}>
      <h2 style={{ fontSize:24, fontWeight:600 }}>Wheel</h2>
      <div>Balance: <b>{balance}</b> coins</div>
      <div>
        {state.status === 'SPINNING' && <b>Now spinning: {state.username}</b>}
        {state.status === 'RESULT' && <span> Last spinner: <b>{state.username}</b></span>}
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center', marginTop:8}}>
        <span>Wager:</span>
        <select value={wager} onChange={e=>setWager(Number(e.target.value))}>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
        <button onClick={spin} disabled={spinning || (state.status!=='IDLE' && state.username !== me?.username)} style={{ padding:'8px 12px', borderRadius:12, background:'black', color:'white', opacity: spinning?0.5:1 }}>
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
