'use client';

import { useState } from 'react';

export default function AdminItemRow({ item, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const toggleActive = async () => {
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/admin/items/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, active: !item.active })
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || 'Toggle failed');
      }
      onChanged?.();
    } catch (e) {
      setErr(e.message || 'Server error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <tr style={{ borderBottom: '1px solid #1f2937' }}>
        <td style={td}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#1f2937' }} />
          )}
        </td>
        <td style={td}>
          <div style={{ fontWeight: 700 }}>{item.name}</div>
          <div style={{ fontSize: 12, opacity: .7 }}>{item.id}</div>
        </td>
        <td style={td}>
          <span>{item.tier}</span>
        </td>
        <td style={td}>
          <button
            onClick={toggleActive}
            disabled={busy}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #374151', background: item.active ? '#16a34a' : '#111', color: '#fff' }}
          >
            {item.active ? 'Active' : 'Inactive'}
          </button>
        </td>
        <td style={td}>
          {String(item.store ?? false)}
        </td>
        <td style={td}>
          {err && <span style={{ color: '#fca5a5' }}>{err}</span>}
        </td>
      </tr>
    </>
  );
}

const td = {
  padding: '10px 12px',
  verticalAlign: 'middle'
};
