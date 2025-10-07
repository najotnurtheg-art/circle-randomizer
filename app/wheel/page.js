'use client';
import { useEffect, useRef, useState } from 'react';

const TOP_ANGLE = -Math.PI/2; // pointer at top

function label(seg) {
  if (!seg) return '';
  if (seg.type === 'item') return seg.name;
  if (seg.type === 'coins') return `+${seg.amount} coins`;
  return 'Another spin';
}

export default function WheelPage() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wager, setWager] = useState(50);
  const [balance, setBalance] = useState(0);
  const [segments, setSegments] = useState([]);
  const [err, setErr] = useState('');
  const [state, setState] = useState({ status: 'IDLE', username: null, resultIndex: null, segments: [] });
  const [me, setMe] = useState(null);

  // popup after stop
  const [popup, setPopup] = useState(null); // { text, imageUrl }

  // items dropdown
  const [showList, setShowList] = useState(false);
  const [allItems, setAllItems] = useState([]);

  // to not restart same animation
  const currentSpinKey = useRef(null);

  const draw = (a, segs) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const size = 360; const dpr = window.devicePixelRatio || 1;
    canvas.width = size*dpr; canvas.height = size*dpr; canvas.style.width = size+'px'; canvas.style.height = size+'px';
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,size,size);
    const s = segs.length ? segs : [{type:'item', name:'/admin/items ga sovg‘a qo‘shing'}];
    const cx=size/2, cy=size/2, r=size/2-8; const n=s.length; const step=2*Math.PI/n;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(a);
    for(let i=0;i<n;i++){
      ctx.beginPath(); ctx.moveTo(0,0); ctx.fillStyle=i%2?'#e2e8f0':'#f8fafc';
      ctx.arc(0,0,r, i*step, (i+1)*step); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.rotate((i+0.5)*step); ctx.textAlign='center'; ctx.font='bold 14px system-ui'; ctx.fillStyle='#111827';
      ctx.fillText(label(s[i]), r*0.65, 6); ctx.restore();
    }
    ctx.restore();
    // top pointer
    ctx.beginPath(); ctx.moveTo(cx, 8); ctx.lineTo(cx-12, 28); ctx.lineTo(cx+12, 28); ctx.closePath(); ctx.fillStyle='#ef4444'; ctx.fill();
  };

  useEffect(()=>{ draw(angle, segments); },[angle, segments]);

  const getMe = async () => {
    const r = await fetch('/api/me'); if (!r.ok) { setMe(null); return; }
    const j = await r.json(); setMe(j); setBalance(j.balance||0);
  };

  const getSegments = async (w) => {
    const r = await fetch(`/api/segments?tier=${w}`);
    const j = await r.json();
    if (j.segments) setSegments(j.segments);
  };

  const getAllItems = async () => {
    const r = await fetch('/api/items/all'); setAllItems(await r.json());
  };

  // shared animation based on server state
  const startSharedSpin = (spin) => {
    if (!spin || !spin.segments?.length || typeof spin.resultIndex !== 'number' || !spin.spinStartAt) return;

    // build a unique key so we don't restart
    const key = `${spin.username}-${spin.resultIndex}-${spin.spinStartAt}`;
    if (currentSpinKey.current === key) return;
    currentSpinKey.current = key;

    setSegments(spin.segments); // show same slices
    const n = spin.segments.length;
    const step = 2 * Math.PI / n;
    const target = TOP_ANGLE - (spin.resultIndex * step + step / 2);
    const turns = 6; // visual cycles
    const final = target + turns * 2 * Math.PI;
    const duration = Number(spin.durationMs || 10000);
    const startAtMs = new Date(spin.spinStartAt).getTime();
    const startAngle = angle % (2 * Math.PI);

    // align to server start time
    const perfOffset = Math.max(0, Date.now() - startAtMs);
    const startPerf = performance.now() - perfOffset;

    // cancel existing RAF
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const run = (t) => {
      const elapsed = t - startPerf;
      const e = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - e, 3);
      setAngle(startAngle + (final - startAngle) * ease);
      if (e < 1) {
        rafRef.current = requestAnimationFrame(run);
      } else {
        rafRef.current = null;
        // after stop, show popup for watchers too
        const seg = spin.segments[spin.resultIndex];
        if (seg?.type === 'item') setPopup({ text: `'${spin.username}' siz '${seg.name}' yutib oldingiz🎉`, imageUrl: seg.imageUrl || null });
        else if (seg?.type === 'coins') setPopup({ text: `'${spin.username}' siz +${seg.amount} tangalarni yutib oldingiz🎉`, imageUrl: null });
        else setPopup({ text: `'${spin.username}' uchun yana bir aylantirish!`, imageUrl: null });
      }
    };
    rafRef.current = requestAnimationFrame(run);
  };

  const pollState = async () => {
    const r = await fetch('/api/spin/state', { cache: 'no-store' });
    const j = await r.json();
    setState(j);
    if (j.status === 'SPINNING') startSharedSpin(j);
  };

  useEffect(() => {
    getMe();
    getSegments(wager);
    pollState();
    const id = setInterval(pollState, 1000); // 1s polling is enough
    return () => { clearInterval(id); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeWager = (w) => {
    setWager(w);
    getSegments(w);
  };

  const spin = async () => {
    setErr(''); setPopup(null);
    const meR = await fetch('/api/me'); if (!meR.ok) { setErr('Iltimos, /login orqali kiring'); return; }
    const meJ = await meR.json(); setMe(meJ);

    // check lock on client (server also enforces)
    if (state.status === 'SPINNING' && state.username && state.username !== meJ.username) {
      setErr(`Band: hozir ${state.username} aylanmoqda`);
      return;
    }

    setSpinning(true);
    const r = await fetch('/api/spin', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ wager })
    });
    const j = await r.json();
    if (!r.ok) { setErr(j.error||'xato'); setSpinning(false); return; }

    // start the same shared animation immediately
    startSharedSpin(j);
    setBalance(j.balance || 0);
    setSpinning(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:24, fontFamily:'system-ui, sans-serif' }}>
      <h2 style={{ fontSize:24, fontWeight:600 }}>Wheel</h2>
      <div>Balance: <b>{balance}</b> coins</div>

      {/* Wager buttons */}
      <div style={{display:'flex', gap:8, marginTop:8}}>
        <button onClick={()=>changeWager(50)}  disabled={spinning} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background: wager===50?'#111':'#fff', color:wager===50?'#fff':'#111'}}>50 tanga</button>
        <button onClick={()=>changeWager(100)} disabled={spinning} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background: wager===100?'#111':'#fff', color:wager===100?'#fff':'#111'}}>100 tanga</button>
        <button onClick={()=>changeWager(200)} disabled={spinning} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background: wager===200?'#111':'#fff', color:wager===200?'#fff':'#111'}}>200 tanga</button>
      </div>

      <div>
        {state.status === 'SPINNING'
          ? <b>Hozir: {state.username} aylanmoqda</b>
          : <span>Keyingi o‘yinchi tayyor!</span>}
      </div>

      <canvas ref={canvasRef} style={{ borderRadius:'9999px', boxShadow:'0 10px 30px rgba(0,0,0,0.12)' }} />

      <button
        onClick={spin}
        disabled={spinning || (state.status==='SPINNING' && state.username !== me?.username)}
        style={{ padding:'10px 16px', borderRadius:12, background:'black', color:'white', opacity: spinning?0.5:1 }}>
        {spinning ? 'Aylanyapti…' : `Spin (-${wager})`}
      </button>

      {/* Show all items dropdown */}
      <div style={{marginTop:8, width:360}}>
        <button onClick={()=>{ setShowList(!showList); if(!allItems.length) getAllItems(); }} style={{width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background:'#fff'}}>
          Barcha sovg‘alar (narxlari bilan) {showList ? '▲' : '▼'}
        </button>
        {showList && (
          <div style={{border:'1px solid #eee', borderTop:'none', padding:10, borderRadius:'0 0 8px 8px', background:'#fff', maxHeight:260, overflow:'auto'}}>
            {[50,100,200,500].map(tier => (
              <div key={tier} style={{marginBottom:8}}>
                <div style={{fontWeight:700}}>{tier} tanga</div>
                <ul style={{margin:0, paddingLeft:18}}>
                  {allItems.filter(i=>i.tier===tier).map(i=>(
                    <li key={i.id}>{i.name}{i.imageUrl ? ' 🖼️' : ''}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POPUP after stop */}
      {popup && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}}
             onClick={()=>setPopup(null)}>
          <div style={{background:'white', padding:20, borderRadius:12, maxWidth:320, textAlign:'center'}} onClick={(e)=>e.stopPropagation()}>
            {popup.imageUrl && <img src={popup.imageUrl} alt="prize" style={{width:'100%', borderRadius:8, marginBottom:12}}/>}
            <div style={{fontWeight:700, marginBottom:8}}>{popup.text}</div>
            <button onClick={()=>setPopup(null)} style={{padding:'8px 12px', borderRadius:8, background:'black', color:'white'}}>OK</button>
          </div>
        </div>
      )}

      <p><a href="/">← Home</a></p>
    </div>
  );
}
