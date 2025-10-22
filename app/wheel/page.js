'use client';

import { useCallback, useEffect, useState } from 'react';
import WheelCanvas from '@/app/components/WheelCanvas';

const label = (s) =>
  s?.type === 'item'
    ? s.name
    : s?.type === 'coins'
    ? `+${s.amount} coins`
    : 'Another spin';

export default function WheelPage() {
  const [wager, setWager] = useState(50);
  const [segments, setSegments] = useState([]);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [balance, setBalance] = useState(0);
  const [err, setErr] = useState('');
  const [showList, setShowList] = useState(false);
  const [allItems, setAllItems] = useState([]);

  const loadSegments = useCallback(async (w) => {
    setErr('');
    try {
      const r = await fetch(`/api/segments?tier=${w}`, { cache: 'no-store' });
      const j = await r.json();
      const segs = Array.isArray(j) ? j : (j.segments || []);
      if (!Array.isArray(segs) || segs.length === 0) {
        setSegments([{ type: 'item', name: 'No items — Admin → Items' }]);
        return;
      }
      setSegments(segs.map((s, i) => ({
        id: s.id ?? `seg-${i}`,
        type: s.type ?? 'item',
        name: s.name ?? 'Prize',
        imageUrl: s.imageUrl ?? null,
        amount: s.amount ?? null,
      })));
    } catch {
      setSegments([{ type: 'item', name: 'Xatolik: /api/segments' }]);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    try {
      const r = await fetch('/api/me', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      setBalance(j?.balance ?? 0);
    } catch {}
  }, []);

  const loadAllItems = useCallback(async () => {
    try {
      const r = await fetch('/api/items/all', { cache: 'no-store' });
      const j = await r.json();
      if (Array.isArray(j)) setAllItems(j);
    } catch {}
  }, []);

  useEffect(() => { loadSegments(wager); }, [wager, loadSegments]);
  useEffect(() => { loadBalance(); }, [loadBalance]);

  const onSpin = async () => {
    if (spinning) return;
    setErr('');
    setSpinning(true);
    try {
      // Start spin (deduct)
      const start = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: wager }),
      });
      const startJ = await start.json();
      if (!start.ok) { setErr(startJ?.error || 'Start xato'); setSpinning(false); return; }

      // choose result on client
      const n = segments.length;
      if (!n) { setErr('Segment yo‘q'); setSpinning(false); return; }
      const idx = Math.floor(Math.random() * n);
      const step = (2 * Math.PI) / n;
      const TOP = -Math.PI / 2;
      const target = TOP - (idx * step + step / 2);

      await WheelCanvas.animateTo(angle, target, 10000, setAngle);

      const seg = segments[idx];
      // Apply
      const complete = await fetch('/api/spin/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: seg.id, reward: seg, tier: wager }),
      });
      const cj = await complete.json();
      if (!complete.ok) { setErr(cj?.error || 'Complete xato'); }

      await loadBalance();
      await loadSegments(wager);

      const msg =
        seg.type === 'item' ? `Tabriklaymiz! "${seg.name}"` :
        seg.type === 'coins' ? `Tabriklaymiz! +${seg.amount} coins` :
        'Yana bir aylantirish!';
      alert(msg);
    } catch {
      setErr('Spin xato');
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div style={{ padding: 20, color: '#e5e7eb', background: '#0b0b0b', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Wheel</h1>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          {[50, 100, 200].map((t) => (
            <button
              key={t}
              onClick={() => setWager(t)}
              disabled={spinning}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #374151',
                background: wager === t ? '#2563eb' : '#111',
                color: '#fff'
              }}
            >
              {t} tanga
            </button>
          ))}
          <div style={{ marginLeft: 'auto' }}>Balans: <b>{balance}</b></div>
        </div>

        <div style={{ display: 'grid', placeItems: 'center' }}>
          <WheelCanvas angle={angle} segments={segments.map(label)} />
          <button
            onClick={onSpin}
            disabled={spinning || segments.length === 0}
            style={{ marginTop: 14, padding: '10px 16px', borderRadius: 12, background: '#000', color: '#fff', border: '1px solid #374151' }}
          >
            {spinning ? 'Aylanyapti…' : `Spin (-${wager})`}
          </button>
          {err && <div style={{ marginTop: 8, color: '#fca5a5' }}>{err}</div>}

          {/* Items dropdown */}
          <div style={{ marginTop: 16, width: 380, maxWidth: '100%' }}>
            <button
              onClick={() => { setShowList(!showList); if (!allItems.length) loadAllItems(); }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #374151', background: '#111', color: '#fff' }}
            >
              Barcha sovg‘alar (narxlar bilan) {showList ? '▲' : '▼'}
            </button>
            {showList && (
              <div style={{ marginTop: 8, background: '#111', border: '1px solid #374151', borderRadius: 12, padding: 12, maxHeight: 280, overflow: 'auto' }}>
                {[50, 100, 200, 500].map((t) => (
                  <div key={t} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{t} tanga</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {allItems.filter(i => i?.tier === t).map(i => (
                        <li key={i.id} style={{ lineHeight: 1.6 }}>
                          {i.name} {i.imageUrl ? '🖼️' : ''}
                        </li>
                      ))}
                      {allItems.filter(i => i?.tier === t).length === 0 && <li style={{ opacity: .7 }}>—</li>}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 10 }}>
            <a href="/admin/items" style={{ color: '#93c5fd' }}>Admin → Items</a> ·{' '}
            <a href="/admin/items/new" style={{ color: '#93c5fd' }}>Yangi item qo‘shish</a>
          </div>
        </div>
      </div>
    </div>
  );
}
