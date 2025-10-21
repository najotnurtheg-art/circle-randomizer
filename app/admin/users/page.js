'use client';
import { useEffect, useState } from 'react';

export default function AdminUsersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(null); // userId being edited
  const [editName, setEditName] = useState('');
  const [resetInfo, setResetInfo] = useState(null); // { username, displayName, tempPassword }

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
      if (!r.ok) throw new Error();
      await load();
    } catch {
      alert('Failed to update “Show on main page”.');
    }
  };

  const startRename = (u) => {
    setEditing(u.id);
    setEditName(u.displayName || u.username || '');
  };
  const cancelRename = () => {
    setEditing(null);
    setEditName('');
  };
  const saveRename = async (userId) => {
    const name = (editName || '').trim();
    if (!name) return alert('Name cannot be empty');
    try {
      const r = await fetch('/api/admin/users/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, displayName: name })
      });
      if (!r.ok) throw new Error();
      setEditing(null);
      setEditName('');
      await load();
    } catch {
      alert('Rename failed');
    }
  };

  const resetPassword = async (u) => {
    if (!confirm(`Reset password for ${u.displayName || u.username}?`)) return;
    try {
      const r = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'reset failed');
      setResetInfo({ username: u.username, displayName: u.displayName || u.username, tempPassword: j.tempPassword });
    } catch (e) {
      alert('Password reset failed.');
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
              <th style={th}>Username</th>
              <th style={th}>Balance</th>
              <th style={th}>Show on main page</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id}>
                <td style={td}>
                  {editing === u.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ padding: 6, border: '1px solid #ccc', borderRadius: 6, minWidth: 220 }}
                        placeholder="Display name"
                      />
                      <button className="btn" onClick={() => saveRename(u.id)}>Save</button>
                      <button className="btn" onClick={cancelRename} style={{ background: '#eee', color: '#111' }}>Cancel</button>
                    </div>
                  ) : (
                    <span>{u.displayName}</span>
                  )}
                </td>
                <td style={td}><code>{u.username}</code></td>
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
                <td style={td}>
                  {editing === u.id ? null : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn" onClick={() => startRename(u)}>Rename</button>
                      <button className="btn danger" onClick={() => resetPassword(u)}>Reset password</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td style={td} colSpan={5}>(no users)</td></tr>
            )}
          </tbody>
        </table>
      )}

      <style>{`
        .btn {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #ddd;
          background: #111;
          color: #fff;
          cursor: pointer;
        }
        .btn:hover { opacity: .9; }
        .btn.danger { background: #7f1d1d; border-color: #6b1515; }
      `}</style>

      {/* One-time password reveal popup */}
      {resetInfo && (
        <div style={overlay} onClick={() => setResetInfo(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>New password</h3>
            <div style={{ marginBottom: 8 }}>
              <div><b>User:</b> {resetInfo.displayName} <small style={{ opacity: .7 }}>({resetInfo.username})</small></div>
            </div>
            <div style={{ padding: 12, background: '#f7f7f7', borderRadius: 8, fontFamily: 'ui-monospace, monospace', marginBottom: 10 }}>
              {resetInfo.tempPassword}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => { navigator.clipboard?.writeText(resetInfo.tempPassword); }}>Copy</button>
              <button className="btn" onClick={() => setResetInfo(null)} style={{ background: '#eee', color: '#111' }}>Close</button>
            </div>
            <div style={{ fontSize: 12, opacity: .8, marginTop: 10 }}>
              This password is shown only once. Ask the user to log in and change it.
            </div>
          </div>
        </div>
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
const td = { padding: '10px 12px', borderBottom: '1px solid #eee', verticalAlign: 'middle' };

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 };
const modal = { background: '#fff', color: '#111', padding: 18, borderRadius: 12, width: 420, maxWidth: '95%' };
