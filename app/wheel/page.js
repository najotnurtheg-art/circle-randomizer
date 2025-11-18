'use client';

import { useEffect, useRef, useState } from 'react';

const TOP_ANGLE = -Math.PI / 2;
const label = (seg) =>
  seg?.type === 'item' ? seg.name : seg?.type === 'coins' ? `+${seg.amount} coins` : 'Another spin';

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
    spinStartAt: null,
    durationMs: null,
  });
  const [me, setMe] = useState(null);

  const [popup, setPopup] = useState(null);
  const [popupCountdown, setPopupCountdown] = useState(0);

  const [showList, setShowList] = useState(false);

  const [allItems, setAllItems] = useState([]);
  const [featuredUsers, setFeaturedUsers] = useState([]);
  const [latestWins, setLatestWins] = useState([]);
  const [storeItems, setStoreItems] = useState([]);
  const [storeBuyingId, setStoreBuyingId] = useState(null);

  const currentSpinKey = useRef(null);

  // draw
  const draw = (a, segs) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const r = Math.min(w, h) / 2 - 10;
    const cx = w / 2;
    const cy = h / 2;
    const n = segs.length || 8;
    const step = (2 * Math.PI) / n;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    for (let i = 0; i < n; i++) {
      const start = i * step;
      const end = start + step;
      const seg = segs[i];
      const colors = ['#06b6d4', '#f59e0b', '#22c55e', '#60a5fa', '#f472b6', '#a78bfa', '#fb7185', '#34d399'];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (seg) {
        ctx.save();
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const mid = start + step / 2;
        const tx = Math.cos(mid) * (r * 0.65);
        const ty = Math.sin(mid) * (r * 0.65);
        ctx.translate(tx, ty);
        ctx.rotate(mid + Math.PI / 2);
        const text = label(seg);
        const maxW = r * 0.9;
        const words = text.split(' ');
        let line = '';
        let y = 0;
        for (let widx = 0; widx < words.length; widx++) {
          const testLine = line ? line + ' ' + words[widx] : words[widx];
          const m = ctx.measureText(testLine);
          if (m.width > maxW && widx > 0) {
            ctx.fillText(line, 0, y);
            line = words[widx];
            y += 16;
          } else {
            line = testLine;
          }
        }
        if (line) ctx.fillText(line, 0, y);
        ctx.restore();
      }
    }
    ctx.restore();

    // pointer
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -r - 4);
    ctx.lineTo(-10, -r - 24);
    ctx.lineTo(10, -r - 24);
    ctx.closePath();
    ctx.fillStyle = '#f97316';
    ctx.fill();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  // base fetch helpers
  const getMe = async () => {
    try {
      const r = await fetch('/api/me', { cache: 'no-store' });
      if (!r.ok) return null;
      const data = await r.json();
      setMe(data);
      setBalance(data.balance);
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const getAllItems = async () => {
    try {
      const r = await fetch('/api/wheel', { cache: 'no-store' });
      if (r.ok) setAllItems(await r.json());
    } catch {}
  };

  const getFeaturedUsers = async () => {
    try {
      const r = await fetch('/api/admin/users?featured=1', { cache: 'no-store' });
      if (r.ok) setFeaturedUsers(await r.json());
    } catch {}
  };

  const getLatestWins = async () => {
    try {
      const r = await fetch('/api/spin/latest', { cache: 'no-store' });
      if (r.ok) setLatestWins(await r.json());
    } catch {}
  };
  const getStore = async () => {
    try {
      const r = await fetch('/api/store', { cache: 'no-store' });
      if (r.ok) setStoreItems(await r.json());
    } catch {}
  };

  const buyStoreItem = async (itemId) => {
    if (!itemId) return;
    setErr('');
    setPopup(null);
    setStoreBuyingId(itemId);
    try {
      const authed = await getMe();
      if (!authed) {
        setErr('Iltimos, /login orqali kiring');
        return;
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
      if (typeof j.balance === 'number') {
        setBalance(j.balance);
      }
      if (j.popup) {
        setPopup(j.popup);
      }
      await getLatestWins();
    } catch (e) {
      console.error(e);
      setErr('server xatosi');
    } finally {
      setStoreBuyingId(null);
      await getStore();
    }
  };

  // animate shared
  const startSharedSpin = (spin) => {
    if (!spin || !spin.segments?.length || typeof spin.resultIndex !== 'number' || !spin.spinStartAt) return;
    const key = `${spin.userId}-${spin.resultIndex}-${spin.spinStartAt}`;
    if (currentSpinKey.current === key) return;
    currentSpinKey.current = key;

    setSegments(spin.segments);
    const n = spin.segments.length;
    const step = (2 * Math.PI) / n;
    const targetIndex = spin.resultIndex;
    const targetAngle = TOP_ANGLE - targetIndex * step - step / 2;

    const startTime = Date.now();
    const duration = spin.durationMs || 10000;
    const totalTurns = 4;
    const startAngle = angle;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const animate = () => {
      const now = Date.now();
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const currentAngle = startAngle + totalTurns * 2 * Math.PI * t + (targetAngle - startAngle) * eased;
      setAngle(currentAngle);
      draw(currentAngle, spin.segments);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
  };

  // spin start
  const startSpin = async () => {
    setErr('');
    setPopup(null);
    if (spinning || state.status === 'SPINNING') return;
    if (!me) {
      const m = await getMe();
      if (!m) {
        setErr('Iltimos, /login orqali kiring');
        return;
      }
    }
    try {
      setSpinning(true);
      const response = await fetch('/api/spin/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wager }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErr(data.error || 'xato');
        setSpinning(false);
        return;
      }
      setState((prev) => ({
        ...prev,
        status: 'SPINNING',
        userId: data.userId,
        username: data.username,
        resultIndex: data.resultIndex,
        segments: data.segments || [],
        spinStartAt: data.spinStartAt || Date.now(),
        durationMs: data.durationMs || 10000,
      }));
      if (typeof data.balance === 'number') setBalance(data.balance);
      if (data.segments?.length) {
        startSharedSpin({
          userId: data.userId,
          resultIndex: data.resultIndex,
          segments: data.segments,
          spinStartAt: data.spinStartAt || Date.now(),
          durationMs: data.durationMs || 10000,
        });
      }
    } catch (e) {
      console.error(e);
      setErr('server xatosi');
      setSpinning(false);
    }
  };

  // complete spin (when server writes result)
  const completeSpin = async () => {
    try {
      const r = await fetch('/api/spin/result', { cache: 'no-store' });
      if (!r.ok) {
        setSpinning(false);
        return;
      }
      const data = await r.json();
      if (data && data.popup) {
        setPopup(data.popup);
        setPopupCountdown(5);
      }
      if (typeof data.balance === 'number') setBalance(data.balance);
      await getLatestWins();
    } catch (e) {
      console.error(e);
    } finally {
      setSpinning(false);
      setState((prev) => ({ ...prev, status: 'IDLE' }));
    }
  };

  // polling state + history + store + featured users
  useEffect(() => {
    getMe();
    getAllItems();
    getFeaturedUsers();
    getLatestWins();
    getStore();
    const id = setInterval(() => {
      getFeaturedUsers();
      getLatestWins();
      getStore();
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // subscribe to spin state
  useEffect(() => {
    let stopped = false;

    const pollState = async () => {
      try {
        const r = await fetch('/api/spin/state', { cache: 'no-store' });
        if (!r.ok) return;
        const s = await r.json();
        setState((prev) => ({ ...prev, ...s }));
        if (s.currentSpin) {
          startSharedSpin(s.currentSpin);
          if (s.currentSpin.status === 'FINISHED') {
            await completeSpin();
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    pollState();
    const id = setInterval(() => {
      if (stopped) return;
      pollState();
    }, 1000);

    return () => {
      stopped = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // animate current angle on state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draw(angle, segments.length ? segments : allItems.filter((i) => i.price === wager));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle, segments, allItems, wager]);

  // popup countdown
  useEffect(() => {
    if (!popup) return;
    if (popupCountdown <= 0) return;
    const id = setInterval(() => {
      setPopupCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          setPopup(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [popup, popupCountdown]);

  const currentSegments = segments.length
    ? segments
    : allItems.filter((i) => i.price === wager).map((it) => ({
        type: 'item',
        name: it.name,
        itemId: it.id,
      }));

  const userSpinning =
    state.status === 'SPINNING' && state.username ? `${state.username} aylantiryapti...` : null;

  const onModeChange = (value) => {
    if (spinning) return;
    setWager(value);
    setSegments([]);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top, #1f2937, #020617)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: 16,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Super Aylana
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              {me ? (
                <>
                  <b>{me.name}</b> ({me.login}) —{' '}
                  <span style={{ fontWeight: 600, color: '#a5b4fc' }}>{balance} coins</span>
                </>
              ) : (
                'Kirmagansiz'
              )}
            </div>
            <a href="/login" className="pill">
              Login
            </a>
            <a href="/admin" className="pill pill-ghost">
              Admin
            </a>
          </div>
        </header>

        {err && (
          <div
            style={{
              marginBottom: 12,
              padding: '8px 12px',
              borderRadius: 999,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        <div className="layout">
          {/* LEFT */}
          <div className="side side-left">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="title">O‘yin g‘ildiragi</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[50, 100, 200].map((v) => (
                    <button
                      key={v}
                      className={`pill ${wager === v ? '' : 'pill-ghost'}`}
                      onClick={() => onModeChange(v)}
                      disabled={spinning}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {userSpinning && (
                <div
                  style={{
                    marginBottom: 8,
                    fontSize: 14,
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: 'rgba(56,189,248,0.1)',
                    border: '1px dashed rgba(56,189,248,0.5)',
                  }}
                >
                  {userSpinning}
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: 320, height: 320 }}>
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={320}
                    style={{ width: '100%', height: '100%', borderRadius: '999px', background: '#0f172a' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220 }}>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>Tanlangan rejim: {wager} coins</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>Balansingiz: {balance} coins</div>
                  <button
                    className="spin-btn"
                    disabled={spinning}
                    onClick={startSpin}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 999,
                      border: 'none',
                      background:
                        'radial-gradient(circle at top, rgba(251,191,36,1), rgba(217,119,6,1))',
                      color: '#111827',
                      fontWeight: 800,
                      letterSpacing: '.04em',
                      textTransform: 'uppercase',
                      cursor: spinning ? 'default' : 'pointer',
                    }}
                  >
                    {spinning ? 'Aylanmoqda…' : 'Aylantirish'}
                  </button>
                  <button
                    className="pill pill-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => setShowList((x) => !x)}
                  >
                    {showList ? 'Yopish' : 'Sektorlarni ko‘rish'}
                  </button>
                </div>
              </div>

              {showList && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px dashed rgba(148,163,184,0.5)',
                    fontSize: 13,
                    maxHeight: 180,
                    overflow: 'auto',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Sektorlar</div>
                  <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                    {currentSegments.map((seg, idx) => (
                      <li key={idx}>
                        {seg.type === 'item'
                          ? seg.name
                          : seg.type === 'coins'
                          ? `+${seg.amount} coins`
                          : 'Yana aylantirish'}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Recent wins */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="title">So‘nggi yutuqlar</div>
              {latestWins.length === 0 ? (
                <div style={{ opacity: 0.8 }}>Hozircha yutuqlar yo‘q.</div>
              ) : (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 0,
                    listStyle: 'none',
                    display: 'grid',
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  {latestWins.map((w) => (
                    <li
                      key={w.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '4px 0',
                        borderBottom: '1px dashed #374151',
                      }}
                    >
                      <span>
                        <b>{w.username}</b> — {w.prize}
                      </span>
                      <span style={{ opacity: 0.7, fontSize: 12 }}>
                        {new Date(w.createdAt).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                Ro‘yxat har 4 soniyada yangilanadi.
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="side side-right">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="title">Ishtirokchilar balansi</div>
              {featuredUsers.length === 0 ? (
                <div style={{ opacity: 0.8 }}>
                  Hozircha ro‘yxat bo‘sh. Admin “Users” sahifasida belgilaydi.
                </div>
              ) : (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 0,
                    listStyle: 'none',
                    lineHeight: 1.6,
                  }}
                >
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

            {/* Store */}
            <div className="card">
              <div className="title">Do‘kon (spin’siz xarid)</div>
              {storeItems.length === 0 ? (
                <div style={{ opacity: 0.8 }}>
                  Hozircha sotib olishga ruxsat etilgan mahsulotlar yo‘q.
                </div>
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
                    <li
                      key={it.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {it.imageUrl && (
                        <img
                          src={it.imageUrl}
                          alt="prize"
                          style={{
                            width: 36,
                            height: 36,
                            objectFit: 'cover',
                            borderRadius: 6,
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          {it.price} tanga
                        </div>
                      </div>
                      <button
                        className="pill"
                        style={{ whiteSpace: 'nowrap' }}
                        disabled={spinning || storeBuyingId === it.id}
                        onClick={() => buyStoreItem(it.id)}
                      >
                        {storeBuyingId === it.id ? '...' : 'Sotib olish'}
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
                Store items ko‘rsatilmoqda: <b>{storeItems.length}</b> ta.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP */}
      {popup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setPopup(null)}
        >
          <div
            style={{
              background: 'white',
              padding: 20,
              borderRadius: 12,
              maxWidth: 320,
              textAlign: 'center',
              color: '#020617',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {popup.imageUrl && (
              <img
                src={popup.imageUrl}
                alt="prize"
                style={{ width: '100%', borderRadius: 8, marginBottom: 12 }}
              />
            )}
            <div
              style={{
                fontWeight: 700,
                marginBottom: 8,
                color: '#111',
              }}
            >
              {popup.text}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#444',
                marginBottom: 12,
              }}
            >
              {popupCountdown > 0 ? `(yopiladi: ${popupCountdown}s)` : ''}
            </div>
            <button
              onClick={() => setPopup(null)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'black',
                color: 'white',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
