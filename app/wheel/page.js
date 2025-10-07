'use client';
import { useEffect, useRef, useState } from 'react';

const TOP_ANGLE = -Math.PI/2; // pointer is at top

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
  const [err, setErr] = useState('');
  const [state, setState] = useState({ status: 'IDLE', username: null, resultIndex: null, segments: [] });
  const [me, setMe] = useState(null);

  // Popup after stop
  const [popup, setPopup] = useState(null); // { text, imageUrl }

  // Items dropdown
  const [showList, setShowList] = useState(false);
  const [allItems, setAllItems] = useState([]);

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

  const animateTo = (idx, segs, onDone) => {
    if (!segs.length) return;
    const n = segs.length; const step = 2*Math.PI/n;
    const target = TOP_ANGLE - (idx*step + step/2);
    const turns = 6; // visual cycles
    const final = target + turns*2*Math.PI;
    const start = performance.now(); const duration = 10000; // 10 seconds
    const startAngle = angle%(2*Math.PI);
    const run = (t) => {
      const e = Math.min(1,(t-start)/duration);
      const ease = 1-Math.pow(1-e,3);
      setAngle(startAngle+(final-startAngle)*ease);
      if (e<1) requestAnimationFrame(run); else if (onDone) onDone();
    };
    requestAnimationFrame(run);
  };

  const loadMe = async () => {
    const r = await fetch('/api/me');
    if (r.ok) { const j = await r.json(); setMe(j); setBalance(j.balance||0); } else setMe(null);
  };
  const loadState = async () => {
    const r = await fetch('/api/spin/state');
    const j = await r.json();
    setState(j);
    if (j.status !== 'IDLE' && j.segments?.length) setSegments(j.segments);
    if (j.status === 'RESULT' && typeof j.resultIndex === 'number') {
      animateTo(j.resultIndex, j.segments||[]);
    }
  };
  const loadSegments = async (w) => {
    const r = await fetch(`/api/segments?tier=${w}`);
    const j = await r.json();
    if (j.segments) setSegments(j.segments);
  };
  const loadAllItems = async () => {
    const r = await fetch('/api/items/all');
    setAllItems(await r.json());
  };

  useEffect(()=>{ loadMe(); loadSegments(wager); },[]);
  useEffect(()=>{ draw(angle, segments); },[angle, segments]);
  useEffect(()=>{ loadState(); const id=setInterval(loadState,1200); return ()=>clearInterval(id); },[]);

  const changeWager = (w) => {
    setWager(w);
    loadSegments(w);
  };

  const spin = async () => {
    setErr(''); setPopup(null);
    if (!me) { setErr('Iltimos, /login orqali kiring'); return; }
    if (state.status !== 'IDLE' && state.username !== me.username) { setErr(`Band: hozir ${state.username} aylantirmoqda`); return; }
    setSpinning(true);
    const r = await fetch('/api/spin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ wager }) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error||'xato'); setSpinning(false); return; }
    setSegments(j.segments||[]);
    // show reward ONLY after animation ends
    animateTo(j.resultIndex, j.segments||[], () => {
      if (j.result?.type === 'item') {
        setPopup({ text: `'${j.username}' siz '${j.result.name}' yutib oldingiz🎉`, imageUrl: j.result.imageUrl || null });
      } else if (j.result?.type === 'coins') {
        setPopup({ text: `'${j.username}' siz +${j.result.amount} tangalarni yutib oldingiz🎉`, imageUrl: null });
      } else {
        setPopup({ text: `'${j.username}' uchun yana bir aylantirish!`, imageUrl: null });
      }
      setBalance(j.balance||0);
      setSpinning(false);
    });
    await fetch('/api/spin/reset', { method:'POST' });
    await loadState();
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
        {state.status === 'SPINNING' && <b>Hozir: {state.username} aylanmoqda</b>}
        {state.status === 'RESULT' && <span> Oxirgi: <b>{state.username}</b></span>}
      </div>

      <canvas ref={canvasRef} style={{ borderRadius:'9999px', boxShadow:'0 10px 30px rgba(0,0,0,0.12)' }} />

      <button onClick={spin} disabled={spinning || (state.status!=='IDLE' && state.username !== me?.username)} style={{ padding:'10px 16px', borderRadius:12, background:'black', color:'white', opacity: spinning?0.5:1 }}>
        {spinning ? 'Aylanyapti…' : `Spin (-${wager})`}
      </button>

      {/* Show all items dropdown */}
      <div style={{marginTop:8, width:360}}>
        <button onClick={()=>{ setShowList(!showList); if(!allItems.length) loadAllItems(); }} style={{width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background:'#fff'}}>
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
