'use client';
import { useEffect, useRef, useState } from 'react';

const TOP = -Math.PI/2;
const segLabel = (s) => s?.type==='item' ? s.name : s?.type==='coins' ? `+${s.amount} coins` : 'Another spin';

export default function WheelPage() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const currentKey = useRef(null);

  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wager, setWager] = useState(50);
  const [balance, setBalance] = useState(0);
  const [segments, setSegments] = useState([]);

  const [state, setState] = useState({ status:'IDLE' });
  const [me, setMe] = useState(null);
  const [err, setErr] = useState('');

  const [showList, setShowList] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [featuredUsers, setFeaturedUsers] = useState([]);
  const [latestWins, setLatestWins] = useState([]);
  const [storeItems, setStoreItems] = useState([]);

  const [popup, setPopup] = useState(null);
  const [popupCountdown, setPopupCountdown] = useState(0);

  // draw
  const draw = (a, segs) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const size = 360, dpr = window.devicePixelRatio || 1;
    canvas.width = size*dpr; canvas.height = size*dpr;
    canvas.style.width = size+'px'; canvas.style.height = size+'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,size,size);

    const s = segs.length ? segs : [{type:'item', name:'/admin/items ga sovg‘a qo‘shing'}];
    const cx = size/2, cy = size/2, r = size/2-8, n = s.length, step = 2*Math.PI/n;

    ctx.save(); ctx.translate(cx,cy); ctx.rotate(a);
    for (let i=0;i<n;i++){
      ctx.beginPath(); ctx.moveTo(0,0);
      ctx.fillStyle = i%2? '#e2e8f0' : '#f8fafc';
      ctx.arc(0,0,r, i*step, (i+1)*step); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.rotate((i+0.5)*step);
      ctx.textAlign='center'; ctx.font='bold 14px system-ui'; ctx.fillStyle='#111827';
      ctx.fillText(segLabel(s[i]), r*0.65, 6);
      ctx.restore();
    }
    ctx.restore();
    // pointer
    ctx.beginPath(); ctx.moveTo(cx,8); ctx.lineTo(cx-12,28); ctx.lineTo(cx+12,28); ctx.closePath(); ctx.fillStyle='#ef4444'; ctx.fill();
  };
  useEffect(()=>{ draw(angle, segments); }, [angle, segments]);

  // data fetchers
  const getMe = async () => {
    const r = await fetch('/api/me', { cache:'no-store' });
    if (!r.ok) return false;
    const j = await r.json(); setMe(j); setBalance(j.balance||0); return true;
  };
  const loadSegments = async (w) => {
    const r = await fetch(`/api/segments?tier=${w}`, { cache:'no-store' });
    const j = await r.json(); setSegments(j.segments||[]);
  };
  const getAllItems = async () => {
    const r = await fetch('/api/items/all', { cache:'no-store' }); setAllItems(await r.json());
  };
  const getFeatured = async () => {
    const r = await fetch('/api/users/featured', { cache:'no-store' }); setFeaturedUsers(await r.json());
  };
  const getLatestWins = async () => {
    const r = await fetch('/api/spin/latest', { cache:'no-store' }); setLatestWins(await r.json());
  };
  const getStore = async () => {
    const r = await fetch('/api/store/list', { cache:'no-store' }); setStoreItems(await r.json());
  };

  // live sync
  const startShared = (spin) => {
    if (!spin || !spin.segments?.length || typeof spin.resultIndex !== 'number' || !spin.spinStartAt) return;
    const key = `${spin.userId}-${spin.resultIndex}-${spin.spinStartAt}`;
    if (currentKey.current === key) return;
    currentKey.current = key;

    setSegments(spin.segments);
    const n = spin.segments.length, step=2*Math.PI/n;
    const target = TOP - (spin.resultIndex*step + step/2);
    const turns = 6;
    const final = target + turns*2*Math.PI;
    const duration = Number(spin.durationMs || 10000);
    const startAt = new Date(spin.spinStartAt).getTime();

    const startAngle = angle % (2*Math.PI);
    const perfOffset = Math.max(0, Date.now()-startAt);
    const startPerf = performance.now() - perfOffset;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const run = (t) => {
      const e = Math.min(1, (t-startPerf)/duration);
      const ease = 1 - Math.pow(1-e, 3);
      setAngle(startAngle + (final - startAngle)*ease);
      if (e < 1) rafRef.current = requestAnimationFrame(run);
      else {
        rafRef.current = null;
        // apply reward
        fetch('/api/spin/complete', { method:'POST' })
          .then(r=>r.json()).then(j=>{
            if (j?.popup) setPopup(j.popup);
            getLatestWins();
            getMe();
          }).catch(()=>{});
      }
    };
    rafRef.current = requestAnimationFrame(run);
  };

  const poll = async () => {
    const r = await fetch('/api/spin/state', { cache:'no-store' });
    const j = await r.json(); setState(j);
    if (j.status === 'SPINNING') startShared(j);
  };

  useEffect(()=>{
    (async ()=>{
      await getMe();
      await loadSegments(wager);
      await getFeatured();
      await getLatestWins();
      await getStore();
      await poll();
      const i1 = setInterval(poll, 1000);
      const i2 = setInterval(getFeatured, 3000);
      const i3 = setInterval(getLatestWins, 4000);
      const i4 = setInterval(getStore, 6000);
      return () => { clearInterval(i1); clearInterval(i2); clearInterval(i3); clearInterval(i4); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // popup auto-close in 10s
  useEffect(()=>{
    if (!popup) return;
    setPopupCountdown(10);
    const t = setInterval(()=>{
      setPopupCountdown(s => {
        if (s <= 1) { clearInterval(t); setPopup(null); return 0; }
        return s-1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [popup]);

  // actions
  const changeWager = async (w) => { setWager(w); await loadSegments(w); };
  const spin = async () => {
    setErr('');
    const r = await fetch('/api/spin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ wager }) });
    const j = await r.json();
    if (!r.ok) { setErr(j?.error || 'server error'); return; }
    startShared(j);
  };
  const buy = async (itemId) => {
    const r = await fetch('/api/store/buy', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ itemId }) });
    const j = await r.json();
    if (!r.ok) { setErr(j?.error || 'xato'); return; }
    if (j.popup) setPopup(j.popup);
    setBalance(j.balance||0);
    getLatestWins(); getFeatured();
  };

  return (
    <div style={{ padding:'24px', paddingTop:74, fontFamily:'system-ui, sans-serif', color:'#e5e7eb', background:'#111', minHeight:'100vh' }}>
      <style>{`
        .wrap { display:grid; grid-template-columns: 260px 1fr 260px; gap:20px; align-items:start; }
        @media (max-width: 900px) { .wrap { grid-template-columns: 1fr; } .side { order:3 } .side-right { order:4 } .center{ order:2 } }
        .card { background:#1f2937; border:1px solid #374151; border-radius:12px; padding:12px; }
        .title { font-weight:700; margin-bottom:8px; color:#fff; }
        .pill { padding:8px 12px; border-radius:8px; border:1px solid #374151; background:#0b0b0b; color:#fff; }
        .btn { padding:10px 16px; border-radius:12px; background:#000; color:#fff; border:1px solid #374151; }
      `}</style>

      <div className="wrap">
        <div className="side">
          <div className="card" style={{marginBottom:16}}>
            <div className="title">Qoidalar (tanga olish)</div>
            <ul style={{margin:0, paddingLeft:16, lineHeight:1.6}}>
              <li>Onlayn <b>300.000 so‘m</b> = <b>10 tanga</b></li>
              <li>Oflayn <b>1.000.000 so‘m</b> = <b>10 tanga</b></li>
            </ul>
            <div style={{fontSize:12, opacity:.8, marginTop:6}}>Admin bu ro‘yxatni kengaytirishi mumkin.</div>
          </div>

          <div className="card">
            <div className="title">Oxirgi 5 yutuq</div>
            {latestWins.length === 0 ? <div style={{opacity:.8}}>Hali yutuqlar ro‘yxati yo‘q.</div> : (
              <ul style={{margin:0, paddingLeft:0, listStyle:'none', lineHeight:1.6}}>
                {latestWins.map(w=>(
                  <li key={w.id} style={{display:'flex', justifyContent:'space-between', gap:8, padding:'6px 0', borderBottom:'1px dashed #374151'}}>
                    <span style={{maxWidth:'60%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{w.displayName}</span>
                    <span title={new Date(w.when).toLocaleString()} style={{opacity:.8, fontSize:12}}>{new Date(w.when).toLocaleTimeString()}</span>
                    <b style={{maxWidth:'35%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{w.prize}</b>
                  </li>
                ))}
              </ul>
            )}
            <div style={{fontSize:12, opacity:.8, marginTop:6}}>Ro‘yxat har 4 soniyada yangilanadi.</div>
          </div>
        </div>

        <div className="center" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:12}}>
          <div style={{display:'flex', gap:8, marginTop:4}}>
            <button onClick={()=>changeWager(50)}  disabled={spinning} className="pill" style={{background:wager===50?'#2563eb':'#0b0b0b'}}>50 tanga</button>
            <button onClick={()=>changeWager(100)} disabled={spinning} className="pill" style={{background:wager===100?'#2563eb':'#0b0b0b'}}>100 tanga</button>
            <button onClick={()=>changeWager(200)} disabled={spinning} className="pill" style={{background:wager===200?'#2563eb':'#0b0b0b'}}>200 tanga</button>
          </div>

          <div style={{marginTop:4, color:'#cbd5e1'}}>
            {state.status === 'SPINNING' ? <b>Hozir: {state.username} aylanmoqda</b> : <span>Keyingi o‘yinchi tayyor!</span>}
          </div>

          <canvas ref={canvasRef} style={{ borderRadius:'9999px', boxShadow:'0 10px 30px rgba(0,0,0,0.35)', background:'#fff' }} />

          <div>Balans: <b>{balance}</b> tanga</div>
          {err && <div style={{color:'#fca5a5'}}>{err}</div>}

          <button onClick={spin} disabled={spinning || state.status==='SPINNING'} className="btn">
            {spinning ? 'Aylanyapti…' : `Spin (-${wager})`}
          </button>

          <div style={{marginTop:8, width:360, maxWidth:'100%'}}>
            <button onClick={()=>{ setShowList(!showList); if (!allItems.length) getAllItems(); }} className="pill" style={{width:'100%'}}>
              Barcha sovg‘alar (narxlari bilan) {showList ? '▲' : '▼'}
            </button>
            {showList && (
              <div className="card" style={{marginTop:6, maxHeight:260, overflow:'auto'}}>
                {[50,100,200,500].map(tier=>(
                  <div key={tier} style={{marginBottom:8}}>
                    <div className="title" style={{marginBottom:4, fontSize:14}}>{tier} tanga</div>
                    <ul style={{margin:0, paddingLeft:18}}>
                      {allItems.filter(i=>i.tier===tier).map(i=>(
                        <li key={i.id} style={{color:'#e5e7eb'}}>{i.name}{i.imageUrl?' 🖼️':''}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="side side-right">
          <div className="card" style={{marginBottom:16}}>
            <div className="title">Ishtirokchilar balansi</div>
            {featuredUsers.length === 0 ? (
              <div style={{opacity:.8}}>Hozircha ro‘yxat bo‘sh. Admin “Users” sahifasida belgilaydi.</div>
            ) : (
              <ul style={{margin:0, paddingLeft:0, listStyle:'none', lineHeight:1.6}}>
                {featuredUsers.map(u=>(
                  <li key={u.id} style={{display:'flex', justifyContent:'space-between', gap:8, padding:'4px 0', borderBottom:'1px dashed #374151'}}>
                    <span>{u.displayName}</span><b>{u.balance}</b>
                  </li>
                ))}
              </ul>
            )}
            <div style={{fontSize:12, opacity:.8, marginTop:6}}>Ro‘yxat har 3 soniyada yangilanadi.</div>
          </div>

          <div className="card">
            <div className="title">Do‘kon (spin’siz xarid)</div>
            {storeItems.length === 0 ? (
              <div style={{opacity:.8}}>Hozircha sotib olishga ruxsat etilgan mahsulotlar yo‘q.</div>
            ) : (
              <ul style={{margin:0, paddingLeft:0, listStyle:'none', display:'grid', gap:8}}>
                {storeItems.map(it=>(
                  <li key={it.id} style={{display:'flex', alignItems:'center', gap:10}}>
                    {it.imageUrl && <img src={it.imageUrl} alt="" style={{width:36, height:36, objectFit:'cover', borderRadius:6}}/>}
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600}}>{it.name}</div>
                      <div style={{fontSize:12, opacity:.8}}>{it.price} tanga</div>
                    </div>
                    <button onClick={()=>buy(it.id)} className="pill" style={{whiteSpace:'nowrap'}}>Sotib olish</button>
                  </li>
                ))}
              </ul>
            )}
            <div style={{fontSize:12, opacity:.8, marginTop:6, borderTop:'1px dashed #374151', paddingTop:6}}>
              Store items ko‘rsatilmoqda: <b>{storeItems.length}</b> ta.
            </div>
          </div>
        </div>
      </div>

      {popup && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}}
             onClick={()=>setPopup(null)}>
          <div style={{background:'white', padding:20, borderRadius:12, maxWidth:320, textAlign:'center'}} onClick={(e)=>e.stopPropagation()}>
            {popup.imageUrl && <img src={popup.imageUrl} alt="prize" style={{width:'100%', borderRadius:8, marginBottom:12}}/>}
            <div style={{fontWeight:700, marginBottom:8, color:'#111'}}>{popup.text}</div>
            <div style={{fontSize:12, color:'#444', marginBottom:10}}>{popupCountdown>0?`(yopiladi: ${popupCountdown}s)`:''}</div>
            <button onClick={()=>setPopup(null)} style={{padding:'8px 12px', borderRadius:8, background:'black', color:'white'}}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
