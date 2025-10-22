'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import WheelCanvas from '@/app/components/WheelCanvas';

// Label helper
const segLabel = (s) =>
  s?.type === 'item'
    ? s.name
    : s?.type === 'coins'
    ? `+${s.amount} coins`
    : 'Another spin';

export default function WheelPage() {
  const [wager, setWager] = useState(50);
  const [segments, setSegments] = useState([]);        // [{id,type,name,imageUrl,amount}]
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [err, setErr] = useState('');
  const [balance, setBalance] = useState(0);
  const [showList, setShowList] = useState(false);
  const [allItems, setAllItems] = useState([]);

  // --- fetch segments for current wager ---
  const loadSegments = useCallback(async (w) => {
    setErr('');
    try {
      // Prefer new API: /api/segments?tier=50
      const r = await fetch(`/api/segments?tier=${w}`, { cache: 'no-store' });
      const j = await r.json();

      // Flexible shape support: {segments} OR array result
      const segs = Array.isArray(j) ? j : (j.segments || j.items || []);
      if (!Array.isArray(segs) || segs.length === 0) {
        setSegments([{ type: 'item', name: 'No items — add in /admin/items' }]);
        return;
      }

      // Normalize fields
      const normalized = segs.map((s, idx) => ({
        id: s.id ?? `seg-${idx}`,
        type: s.type ?? 'item',
        name: s.name ?? s.title ?? 'Prize',
        imageUrl: s.imageUrl ?? s.image ?? null,
        amount: s.amount ?? s.value ?? null,
      }));
      setSegments(normalized);
    } catch (e) {
      console.error('loadSegments failed', e);
      setErr('Segmentsni olishda xato.');
      setSegments([{ type: 'item', name: 'Xatolik: /api/segments' }]);
    }
  }, []);

  const loadAllItems = useCallback(async () => {
    try {
      const r = await fetch('/api/items/all', { cache: 'no-store' });
      const j = await r.json();
      if (Array.isArray(j)) setAllItems(j);
    } catch (e) {
      console.warn('all items load failed', e);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    try {
      const r = await fetch('/api/me', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        setBalance(j?.balance ?? 0);
      }
    } catch {}
  }, []);

  useEffect(() => { loadSegments(wager); }, [wager, loadSegments]);
  useEffect(() => { loadBalance(); }, [loadBalance]);

  // --- client-side spin flow that matches backend routes you've got now ---
  const onSpin = async () => {
    if (spinning) return;
    setErr('');
    setSpinning(true);

    try {
      // 1) Ask server to start spin (this decrements balance in your current API)
      const start = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // If your API needs userId, change here to pass it; many setups infer from session
        body: JSON.stringify({ tier: wager }),
      });
      const startJ = await start.json();
      if (!start.ok) {
        setErr(startJ?.error || 'Server xatosi (start)');
        setSpinning(false);
        return;
      }

      // 2) We already have the visible segments (from loadSegments). Choose a random result on client.
      // NOTE: Your earlier backend finishes the reward in /api/spin/complete
      const n = segments.length;
      if (!n) {
        setErr('Segmentlar topilmadi');
        setSpinning(false);
        return;
      }
      const resultIndex = Math.floor(Math.random() * n);
      const resultSeg = segments[resultIndex];

      // 3) Animate wheel for 10 seconds to that result
      // angle for pointer-at-top: segment center must land at -90deg
      const step = (2 * Math.PI) / n;
      const TOP = -Math.PI / 2;
      const target = TOP - (resultIndex * step + step / 2);

      // Let WheelCanvas animate and call us back when finished
      await WheelCanvas.animateTo(angle, target, 10000, setAngle);

      // 4) Tell server which reward was hit (apply prize / log)
      const complete = await fetch('/api/spin/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // When your API expects rewardId or coin payload, we send the normalized structure
        body: JSON.stringify({
          rewardId: resultSeg.id,
          reward: resultSeg,           // flexible, many backends accept this now
          tier: wager
        }),
      });
      const completeJ = await complete.json();
      if (!complete.ok) {
        setErr(completeJ?.error || 'Server xatosi (complete)');
        setSpinning(false);
        // try to reload balance back, in case of mismatch
        loadBalance();
        return;
      }

      // 5) Refresh balance & segments
      await loadBalance();
      await loadSegments(wager);

      // 6) Show popup (native)
      const msg =
        resultSeg.type === 'item'
          ? `Tabriklaymiz! Siz "${resultSeg.name}" yutdingiz 🎉`
          : resultSeg.type === 'coins'
          ? `Tabriklaymiz! Siz +${resultSeg.amount} tanga oldingiz 🎉`
          : 'Yana bir aylantirish!';
      alert(msg);
    } catch (e) {
      console.error('spin failed', e);
      setErr('Spin xatosi.');
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div style={{ padding: 20, color: '#e5e7eb', background: '#0b0b0b', minHeight: '100vh' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Wheel</h1>

        <div style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="pill"
            onClick={() => setWager(50)}
            disabled={spinning}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #374151', background: wager === 50 ? '#2563eb' : '#111', color: '#fff' }}
          >
            50 tanga
          </button>
          <button
            className="pill"
            onClick={() => setWager(100)}
            disabled={spinning}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #374151', background: wager === 100 ? '#2563eb' : '#111', color: '#fff' }}
          >
            100 tanga
          </button>
          <button
            className="pill"
            onClick={() => setWager(200)}
            disabled={spinning}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #374151', background: wager === 200 ? '#2563eb' : '#111', color: '#fff' }}
          >
            200 tanga
          </button>

          <div style={{ marginLeft: 'auto' }}>
            Balans: <b>{balance}</b>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', placeItems: 'center' }}>
          <WheelCanvas
            angle={angle}
            segments={segments.map(segLabel)}
          />

          <button
            onClick={onSpin}
            disabled={spinning || segments.length === 0}
            style={{ marginTop: 16, padding: '10px 16px', borderRadius: 12, background: '#000', color: '#fff', border: '1px solid #374151' }}
          >
            {spinning ? 'Aylanyapti…' : `Spin (-${wager})`}
          </button>

          {err && (
            <div style={{ marginTop: 10, color: '#fca5a5' }}>
              {err}
            </div>
          )}

          {/* Items dropdown (by tier) */}
          <div style={{ marginTop: 16, width: 380, maxWidth: '100%' }}>
            <button
              onClick={() => {
                setShowList(!showList);
                if (!allItems.length) loadAllItems();
              }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #374151', background: '#111', color: '#fff' }}
            >
              Barcha sovg‘alar {showList ? '▲' : '▼'}
            </button>

            {showList && (
              <div style={{ marginTop: 8, background: '#111', border: '1px solid #374151', borderRadius: 12, padding: 12, maxHeight: 280, overflow: 'auto' }}>
                {[50, 100, 200, 500].map((t) => (
                  <div key={t} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{t} tanga</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {allItems.filter((i) => i?.tier === t).map((i) => (
                        <li key={i.id} style={{ lineHeight: 1.6 }}>
                          {i.name} {i.imageUrl ? '🖼️' : ''}
                        </li>
                      ))}
                      {allItems.filter((i) => i?.tier === t).length === 0 && <li style={{ opacity: .7 }}>—</li>}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
