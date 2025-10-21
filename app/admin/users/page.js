'use client';
import { useEffect, useState } from 'react';

export default function AdminUsersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/admin/users/list', { cache: 'no-store' });
      if (!r.ok) throw new Error('list failed');
      const j = await r.json();
      setRows(j);
    } catch (e) {
      setErr('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleFeatured = async (userId, featured) => {
    try {
      const r = await fetch('/api/admin/users/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, featured })
      });
      if (!r.ok) throw new Error('toggle failed');
      await load();
    } catch {
      alert('Failed to update “Show on main page”.');
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Admin: Users</h1>

      {err && <div style={{ color: 'crimson', marginBottom: 12 }}>{err}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Balance</th>
              <th style={th}>Show on main page</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id}>
                <td style={td}>{u.displayName}</td>
                <td style={td}>{u.balance}</td>
                <td style={td}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!u.featured}
                      onChange={e => toggleFeatured(u.id, e.target.checked)}
                    />
                    Featured
                  </label>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td style={td} colSpan={3}>(no users)</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #ddd',
  background: '#f8f8f8',
  fontWeight: 700
};
const td = {
  padding: '10px 12px',
  borderBottom: '1px solid #eee'
};
