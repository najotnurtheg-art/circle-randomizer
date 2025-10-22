'use client';

import { useEffect, useState } from 'react';
import AdminItemRow from '@/app/components/AdminItemRow';

export default function AdminItemsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const r = await fetch('/api/admin/items', { cache: 'no-store' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to load items');
      }
      const j = await r.json();
      setItems(Array.isArray(j) ? j : []);
    } catch (e) {
      console.error(e);
      setErr(e.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif', color: '#e5e7eb', background: '#0b0b0b', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Admin · Items</h1>

      {err && <div style={{ marginBottom: 12, color: '#fca5a5' }}>{err}</div>}
      {loading && <div>Loading…</div>}

      {!loading && (
        <div style={{ overflowX: 'auto', border: '1px solid #374151', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#111' }}>
                <th style={th}>Image</th>
                <th style={th}>Name</th>
                <th style={th}>Tier</th>
                <th style={th}>Active</th>
                <th style={th}>Store</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <AdminItemRow key={it.id} item={it} onChanged={load} />
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 16, textAlign: 'center', opacity: .75 }}>
                    No items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #374151',
  color: '#9ca3af',
  fontWeight: 700
};
