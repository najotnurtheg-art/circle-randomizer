'use client';
import { useEffect, useRef, useState } from 'react';

<<<<<<< HEAD
const TOP_ANGLE = -Math.PI / 2; // pointer at top
const label = (seg) =>
  seg?.type === 'item'
    ? seg.name
    : seg?.type === 'coins'
    ? `+${seg.amount} coins`
    : 'Another spin';
=======
const TOP_ANGLE = -Math.PI/2; // pointer at top

function label(seg) {
  if (!seg) return '';
  if (seg.type === 'item') return seg.name;
  if (seg.type === 'coins') return `+${seg.amount} coins`;
  return 'Another spin';
}
>>>>>>> parent of 987b5d3 (Update page.js)

export default function WheelPage() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wager, setWager] = useState(50);
  const [balance, setBalance] = useState(0);
  const [segments, setSegments] = useState([]);
  const [err, setErr] = useState('');
  const [state, setState] = useState({
    status: 'IDLE',
    userId: null,
    username: null,
    resultIndex: null,
    segments: [],
  });
  const [me, setMe] = useState(null);

  const [popup, setPopup] = useState(null);
  const [showList, setShowList] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [featuredUsers, setFeaturedUsers] = useState([]);
<<<<<<< HEAD
  const [latestWins, setLatestWins] = useState([]);
  const [storeItems, setStoreItems] = useState([]);
=======
  const [latestWins, setLatestWins] = useState([]); // NEW
>>>>>>> parent of 987b5d3 (Update page.js)

  const currentSpinKey = useRef(null);

  // ---------- drawing ----------
  const draw = (a, segs) => {
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
    const s = segs.length ? segs : [{ type: 'item', name: '/admin/items ga sovg‘a qo‘shing' }];
    const cx = size / 2,
      cy = size / 2,
      r = size / 2 - 8;
    const n = Math.max(1, s.length);
    const step = (2 * Math.PI) / n;
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
      ctx.fillText(label(s[i] || {}), r * 0.65, 6);
      ctx.restore();
    }
    ctx.restore();
<<<<<<< HEAD
    // pointer at top
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx - 12, 28);
    ctx.lineTo(cx + 12, 28);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
=======
    // top pointer
    ctx.beginPath(); ctx.moveTo(cx, 8); ctx.lineTo(cx-12, 28); ctx.lineTo(cx+12, 28); ctx.closePath(); ctx.fillStyle='#ef4444'; ctx.fill();
>>>>>>> parent of 987b5d3 (Update page.js)
  };
  useEffect(() => {
    draw(angle, segments);
  }, [angle, segments]);

  // ---------- helpers ----------
  const getMe = async () => {
    const r = await fetch('/api/me');
    if (!r.ok) {
      setMe(null);
      return false;
    }
    const j = await r.json();
    setMe(j);
    setBalance(j.balance || 0);
    return true;
  };
  const getSegments = async (w) => {
    const r = await fetch(`/api/segments?tier=${w}`, { cache: 'no-store' });
    const j = await r.json();
    if (j.segments && Array.isArray(j.segments)) setSegments(j.segments);
  };
  const getAllItems = async () => {
    const r = await fetch('/api/items/all', { cache: 'no-store' });
    setAllItems(await r.json());
  };
  const getFeatured = async () => {
    const r = await fetch('/api/users/featured', { cache: 'no-store' });
    setFeaturedUsers(await r.json());
  };
  const getLatestWins = async () => {
    const r = await fetch('/api/spin/latest', { cache: 'no-store' });
    setLatestWins(await r.json());
  };
  const getStore = async () => {
    try {
      const url =
        (typeof window !== 'undefined' ? window.location.origin : '') +
        '/api/store/list';
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) {
        console.warn('store list failed', r.status);
        setStoreItems([]);
        return;
      }
      const j = await r.json();
      if (Array.isArray(j)) setStoreItems(j);
      else {
        console.warn('store list not array', j);
        setStoreItems([]);
      }
    } catch (e) {
      console.warn('store list error', e);
      setStoreItems([]);
    }
  };
<<<<<<< HEAD
=======
  const getSegments = async (w) => {
    const r = await fetch(`/api/segments?tier=${w}`); const j = await r.json();
    if (j.segments) setSegments(j.segments);
  };
  const getAllItems = async () => { const r = await fetch('/api/items/all'); setAllItems(await r.json()); };
  const getFeatured = async () => { const r = await fetch('/api/users/featured', { cache:'no-store' }); setFeaturedUsers(await r.json()); };
  const getLatestWins = async () => { const r = await fetch('/api/spin/latest', { cache:'no-store' }); setLatestWins(await r.json()); }; // NEW
>>>>>>> parent of 987b5d3 (Update page.js)

  const ensureTelegramAutoLogin = async () => {
    const ok = await getMe();
    if (ok) return true;
    const loadSdk = () =>
      new Promise((resolve) => {
        if (window.Telegram?.WebApp) return resolve();
        const s = document.createElement('script');
        s.src = 'https://telegram.org/js/telegram-web-app.js';
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      });
    await loadSdk();
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.initData) return false;
    try {
      tg.expand?.();
      const r = await fetch('/api/telegram/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });
      if (!r.ok) return false;
      await getMe();
      return true;
    } catch {
      return false;
    }
  };

<<<<<<< HEAD
  // ---------- spin normalize + animation ----------
  const normalizeSpin = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    // Prefer server-provided values
    let segs = Array.isArray(raw.segments) && raw.segments.length ? raw.segments : segments;
    if (!Array.isArray(segs) || segs.length === 0) return null;

    const idx =
      typeof raw.resultIndex === 'number' && raw.resultIndex >= 0 && raw.resultIndex < segs.length
        ? raw.resultIndex
        : null;
    if (idx === null) return null;

    const startAt = raw.spinStartAt ? new Date(raw.spinStartAt) : new Date();
    const dur = Number(raw.durationMs || 10000);
    const username = raw.username || (me?.displayName || me?.username || 'Player');

    return {
      userId: raw.userId || me?.id || 'me',
      username,
      segments: segs,
      resultIndex: idx,
      spinStartAt: startAt.toISOString(),
      durationMs: isFinite(dur) && dur > 0 ? dur : 10000,
    };
  };

  const startSharedSpin = (rawSpin) => {
    const spin = normalizeSpin(rawSpin);
    if (!spin) {
      console.warn('spin payload invalid', rawSpin);
      return;
    }

=======
  // ---------- live spin sync ----------
  const startSharedSpin = (spin) => {
    if (!spin || !spin.segments?.length || typeof spin.resultIndex !== 'number' || !spin.spinStartAt) return;
>>>>>>> parent of 987b5d3 (Update page.js)
    const key = `${spin.userId}-${spin.resultIndex}-${spin.spinStartAt}`;
    if (currentSpinKey.current === key) return;
    currentSpinKey.current = key;

    setSegments(spin.segments);

    const n = spin.segments.length;
    const step = (2 * Math.PI) / n;
    const target = TOP_ANGLE - (spin.resultIndex * step + step / 2);
    const turns = 6;
    const final = target + turns * 2 * Math.PI;
    const duration = Number(spin.durationMs || 10000);
    const startAtMs = new Date(spin.spinStartAt).getTime() || Date.now();
    const startAngle = angle % (2 * Math.PI);

    const perfOffset = Math.max(0, Date.now() - startAtMs);
    const startPerf = performance.now() - perfOffset;

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
        const seg = spin.segments[spin.resultIndex];
        if (seg?.type === 'item')
          setPopup({
            text: `'${spin.username}' siz '${seg.name}' yutib oldingiz🎉`,
            imageUrl: seg.imageUrl || null,
          });
        else if (seg?.type === 'coins')
          setPopup({
            text: `'${spin.username}' siz +${seg.amount} tangalarni yutib oldingiz🎉`,
            imageUrl: null,
          });
        else setPopup({ text: `'${spin.username}' uchun yana bir aylantirish!`, imageUrl: null });
        // refresh latest wins after a spin ends
        getLatestWins();
        releaseSpin(); // free global lock at the end
      }
    };
    rafRef.current = requestAnimationFrame(run);
  };

  const pollState = async () => {
    const r = await fetch('/api/spin/state', { cache: 'no-store' });
    const j = await r.json();
    setState(j);
    if (j && j.status === 'SPINNING') startSharedSpin(j);
  };

  // ---------- mount ----------
  useEffect(() => {
    (async () => {
      await ensureTelegramAutoLogin();
      await getSegments(wager);
      await getFeatured();
      await getLatestWins();                 // initial load
      await pollState();
      const id1 = setInterval(pollState, 1000);
<<<<<<< HEAD
      const id2 = setInterval(getFeatured, 3000);
      const id3 = setInterval(getLatestWins, 4000);
      const id4 = setInterval(getStore, 6000);
      return () => {
        clearInterval(id1);
        clearInterval(id2);
        clearInterval(id3);
        clearInterval(id4);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
=======
      const id2 = setInterval(getFeatured, 3000);   // balances refresh
      const id3 = setInterval(getLatestWins, 4000); // wins refresh
      return () => { clearInterval(id1); clearInterval(id2); clearInterval(id3); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
>>>>>>> parent of 987b5d3 (Update page.js)
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

<<<<<<< HEAD
  // ---------- AUTO-CLOSE POPUP AFTER 10s ----------
  useEffect(() => {
    if (!popup) return;
    setPopupCountdown(10);
    const tick = setInterval(() => {
      setPopupCountdown((s) => {
        if (s <= 1) {
          clearInterval(tick);
          setPopup(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [popup]);

  // ---------- actions ----------
  const releaseSpin = async () => {
    try { await fetch('/api/spin/release', { method: 'POST' }); } catch {}
  };

  const changeWager = (w) => {
    setWager(w);
    getSegments(w);
  };

=======
  // ---------- actions ----------
  const changeWager = (w) => { setWager(w); getSegments(w); };
>>>>>>> parent of 987b5d3 (Update page.js)
  const spin = async () => {
    setErr('');
    setPopup(null);
    const authed = await getMe();
    if (!authed) {
      const ok = await ensureTelegramAutoLogin();
      if (!ok) {
        setErr('Iltimos, /login orqali kiring');
        return;
      }
    }
    if (state.status === 'SPINNING' && state.userId && state.userId !== me?.id) {
      setErr(`Band: hozir ${state.username} aylanmoqda`);
      return;
    }
    setSpinning(true);
    const r = await fetch('/api/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wager }),
    });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || 'xato');
      setSpinning(false);
      return;
    }
    // Start animation even if server omitted some fields
    startSharedSpin(j);
    setBalance(j.balance || 0);
    setSpinning(false);
  };

<<<<<<< HEAD
  const buy = async (itemId) => {
    setErr('');
    const authed = await getMe();
    if (!authed) {
      const ok = await ensureTelegramAutoLogin();
      if (!ok) {
        setErr('Iltimos, /login orqali kiring');
        return;
      }
    }
    const r = await fetch('/api/store/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || 'xato');
      return;
    }
    setBalance(j.balance || 0);
    if (j.popup) setPopup(j.popup);
    getLatestWins();
    getFeatured();
  };

  // ---------- UI ----------
  return (
    <div
      style={{
        padding: '24px',
        paddingTop: 74, // 50px extra space from top (24 + 50)
        fontFamily: 'system-ui, sans-serif',
        color: '#e5e7eb',
        background: '#111',
        minHeight: '100vh',
      }}
    >
=======
  // ---------- UI ----------
  return (
    <div style={{ padding:24, fontFamily:'system-ui, sans-serif', color:'#e5e7eb', background:'#111', minHeight:'100vh' }}>
>>>>>>> parent of 987b5d3 (Update page.js)
      <style>{`
        .wrap { display:grid; grid-template-columns: 260px 1fr 260px; gap:20px; align-items:start; }
        @media (max-width: 900px) {
          .wrap { grid-template-columns: 1fr; }
          .side { order: 3; }
          .side-right { order: 4; }
          .center { order: 2; }
        }
        .card { background:#1f2937; border:1px solid #374151; border-radius:12px; padding:12px; }
        .title { font-weight:700; margin-bottom:8px; color:#fff; }
        .pill { padding:8px 12px; border-radius:8px; border:1px solid #374151; background:#0b0b0b; color:#fff; }
        .btn { padding:10px 16px; border-radius:12px; background:#000; color:#fff; border:1px solid #374151; }
        a { color:#93c5fd; }
      `}</style>

      <div className="wrap">
        {/* LEFT: terms */}
        <div className="side">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="title">Qoidalar (tanga olish)</div>
            <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
              <li>
                Onlayn <b>300.000 so‘m</b> = <b>10 tanga</b>
              </li>
              <li>
                Oflayn <b>1.000.000 so‘m</b> = <b>10 tanga</b>
              </li>
            </ul>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
              Admin bu ro‘yxatni kerak bo‘lsa keyin kengaytirishi mumkin.
            </div>
          </div>

          {/* NEW: latest 5 prizes */}
          <div className="card">
            <div className="title">Oxirgi 5 yutuq</div>
            {latestWins.length === 0 ? (
              <div style={{ opacity: 0.8 }}>Hali yutuqlar ro‘yxati yo‘q.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', lineHeight: 1.6 }}>
                {latestWins.map((w) => (
                  <li
                    key={w.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '6px 0',
                      borderBottom: '1px dashed #374151',
                    }}
                  >
                    <span
                      style={{
                        maxWidth: '60%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {w.displayName}
                    </span>
                    <span
                      title={new Date(w.when).toLocaleString()}
                      style={{ opacity: 0.8, fontSize: 12 }}
                    >
                      {new Date(w.when).toLocaleTimeString()}
                    </span>
                    <b
                      style={{
                        maxWidth: '35%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {w.prize}
                    </b>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
              Ro‘yxat har 4 soniyada yangilanadi.
            </div>
          </div>
        </div>

<<<<<<< HEAD
        {/* CENTER column */}
        <div className="center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={() => (setWager(50) || getSegments(50))}
              disabled={spinning}
              className="pill"
              style={{ background: wager === 50 ? '#2563eb' : '#0b0b0b' }}
            >
              50 tanga
            </button>
            <button
              onClick={() => (setWager(100) || getSegments(100))}
              disabled={spinning}
              className="pill"
              style={{ background: wager === 100 ? '#2563eb' : '#0b0b0b' }}
            >
              100 tanga
            </button>
            <button
              onClick={() => (setWager(200) || getSegments(200))}
              disabled={spinning}
              className="pill"
              style={{ background: wager === 200 ? '#2563eb' : '#0b0b0b' }}
            >
              200 tanga
            </button>
          </div>

          <div style={{ marginTop: 4, color: '#cbd5e1' }}>
            {state.status === 'SPINNING' ? (
              <b>Hozir: {state.username} aylanmoqda</b>
            ) : (
              <span>Keyingi o‘yinchi tayyor!</span>
            )}
=======
        {/* CENTER: wheel */}
        <div className="center" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:12}}>
          <div style={{display:'flex', gap:8, marginTop:4}}>
            <button onClick={()=>setWager(50) || getSegments(50)}  disabled={spinning} className="pill" style={{background:wager===50?'#2563eb':'#0b0b0b'}}>50 tanga</button>
            <button onClick={()=>setWager(100)|| getSegments(100)} disabled={spinning} className="pill" style={{background:wager===100?'#2563eb':'#0b0b0b'}}>100 tanga</button>
            <button onClick={()=>setWager(200)|| getSegments(200)} disabled={spinning} className="pill" style={{background:wager===200?'#2563eb':'#0b0b0b'}}>200 tanga</button>
          </div>

          <div style={{marginTop:4, color:'#cbd5e1'}}>
            {state.status === 'SPINNING'
              ? <b>Hozir: {state.username} aylanmoqda</b>
              : <span>Keyingi o‘yinchi tayyor!</span>}
>>>>>>> parent of 987b5d3 (Update page.js)
          </div>

          <canvas
            ref={canvasRef}
            style={{
              borderRadius: '9999px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              background: '#fff',
            }}
          />

          <div>
            Balans: <b>{balance}</b> tanga
          </div>

          <button
            onClick={spin}
<<<<<<< HEAD
            disabled={spinning || (state.status === 'SPINNING' && state.userId && state.userId !== me?.id)}
=======
            disabled={spinning || (state.status==='SPINNING' && state.userId && state.userId !== me?.id)}
>>>>>>> parent of 987b5d3 (Update page.js)
            className="btn"
          >
            {spinning ? 'Aylanyapti…' : `Spin (-${wager})`}
          </button>

          {/* items dropdown */}
          <div style={{ marginTop: 8, width: 360, maxWidth: '100%' }}>
            <button
              onClick={() => {
                setShowList(!showList);
                if (!allItems.length) getAllItems();
              }}
              className="pill"
              style={{ width: '100%' }}
            >
              Barcha sovg‘alar (narxlari bilan) {showList ? '▲' : '▼'}
            </button>
            {showList && (
              <div className="card" style={{ marginTop: 6, maxHeight: 260, overflow: 'auto' }}>
                {[50, 100, 200, 500].map((tier) => (
                  <div key={tier} style={{ marginBottom: 8 }}>
                    <div className="title" style={{ marginBottom: 4, fontSize: 14 }}>
                      {tier} tanga
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {allItems
                        .filter((i) => i.tier === tier)
                        .map((i) => (
                          <li key={i.id} style={{ color: '#e5e7eb' }}>
                            {i.name}
                            {i.imageUrl ? ' 🖼️' : ''}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {err && <div style={{ color: '#fca5a5' }}>{err}</div>}
        </div>

<<<<<<< HEAD
        {/* RIGHT column */}
        <div className="side side-right">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="title">Ishtirokchilar balansi</div>
            {featuredUsers.length === 0 ? (
              <div style={{ opacity: 0.8 }}>Hozircha ro‘yxat bo‘sh. Admin “Users” sahifasida belgilaydi.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', lineHeight: 1.6 }}>
                {featuredUsers.map((u) => (
                  <li
                    key={u.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '4px 0',
                      borderBottom: '1px dashed #374151',
                    }}
                  >
                    <span>{u.displayName}</span>
                    <b>{u.balance}</b>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
              Ro‘yxat har 3 soniyada yangilanadi.
            </div>
          </div>

          {/* Store card */}
          <div className="card">
            <div className="title">Do‘kon (spin’siz xarid)</div>
            {storeItems.length === 0 ? (
              <div style={{ opacity: 0.8 }}>Hozircha sotib olishga ruxsat etilgan mahsulotlar yo‘q.</div>
            ) : (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 0,
                  listStyle: 'none',
                  display: 'grid',
                  gap: 8,
                }}
              >
                {storeItems.map((it) => (
                  <li key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {it.imageUrl && (
                      <img
                        src={it.imageUrl}
                        alt=""
                        style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{it.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{it.price} tanga</div>
                    </div>
                    <button onClick={() => buy(it.id)} className="pill" style={{ whiteSpace: 'nowrap' }}>
                      Sotib olish
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div
              style={{
                fontSize: 12,
                opacity: 0.8,
                marginTop: 6,
                borderTop: '1px dashed #374151',
                paddingTop: 6,
              }}
            >
              Store items ko‘rsatilmoqda: <b>{storeItems.length}</b> ta. Xarid qilinganda balansdan
              yechiladi va g‘oliblar ro‘yxatiga qo‘shiladi.
            </div>
          </div>
=======
        {/* RIGHT: featured users + balances */}
        <div className="side side-right card">
          <div className="title">Ishtirokchilar balansi</div>
          {featuredUsers.length === 0 ? (
            <div style={{opacity:.8}}>Hozircha ro‘yxat bo‘sh. Admin “Users” sahifasida belgilaydi.</div>
          ) : (
            <ul style={{margin:0, paddingLeft:0, listStyle:'none', lineHeight:1.6}}>
              {featuredUsers.map(u=>(
                <li key={u.id} style={{display:'flex', justifyContent:'space-between', gap:8, padding:'4px 0', borderBottom:'1px dashed #374151'}}>
                  <span>{u.displayName}</span>
                  <b>{u.balance}</b>
                </li>
              ))}
            </ul>
          )}
          <div style={{fontSize:12, opacity:.8, marginTop:6}}>Ro‘yxat har 3 soniyada yangilanadi.</div>
>>>>>>> parent of 987b5d3 (Update page.js)
        </div>
      </div>

      {/* POPUP */}
      {popup && (
<<<<<<< HEAD
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setPopup(null)}
        >
          <div
            style={{ background: 'white', padding: 20, borderRadius: 12, maxWidth: 320, textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            {popup.imageUrl && (
              <img src={popup.imageUrl} alt="prize" style={{ width: '100%', borderRadius: 8, marginBottom: 12 }} />
            )}
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#111' }}>{popup.text}</div>
            <div style={{ fontSize: 12, color: '#444', marginBottom: 10 }}>
              {popupCountdown > 0 ? `(yopiladi: ${popupCountdown}s)` : ''}
            </div>
            <button
              onClick={() => setPopup(null)}
              style={{ padding: '8px 12px', borderRadius: 8, background: 'black', color: 'white' }}
            >
              OK
            </button>
=======
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}}
             onClick={()=>setPopup(null)}>
          <div style={{background:'white', padding:20, borderRadius:12, maxWidth:320, textAlign:'center'}} onClick={(e)=>e.stopPropagation()}>
            {popup.imageUrl && <img src={popup.imageUrl} alt="prize" style={{width:'100%', borderRadius:8, marginBottom:12}}/>}
            <div style={{fontWeight:700, marginBottom:8, color:'#111'}}>{popup.text}</div>
            <button onClick={()=>setPopup(null)} style={{padding:'8px 12px', borderRadius:8, background:'black', color:'white'}}>OK</button>
>>>>>>> parent of 987b5d3 (Update page.js)
          </div>
        </div>
      )}
    </div>
  );
}
