'use client';
import { useEffect, useState } from 'react';

export default function AdminUsersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // rename
  const [editing, setEditing] = useState(null); // userId
  const [editName, setEditName] = useState('');

  // set password
  const [pwdFor, setPwdFor] = useState(null); // user object
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  async function load() {
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/admin/users', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'list failed');
      setRows(j);
    } catch (e) {
      setErr('Failed to load users (are you logged in as admin?)');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // -------- Featured toggle (optimistic) --------
  async function toggleFeatured(userId, featured) {
    setRows(rs => rs.map(x => x.id === userId ? { ...x, featured } : x)); // optimistic
    try {
      const r = await fetch('/api/admin/users/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, featured })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'toggle failed');
      // replace with server value
      setRows(rs => rs.map(x => x.id === userId ? { ...x, ...j } : x));
    } catch (e) {
      alert('Failed to update “Show on main page”.');
      setRows(rs => rs.map(x => x.id === userId ? { ...x, featured: !featured } : x)); // revert
    }
  }

  // -------- Rename --------
  const startRename = (u) => { setEditing(u.id); setEditName(u.displayName || u.username || ''); };
  const cancelRename = () => { setEditing(null); setEditName(''); };
  async function saveRename(userId) {
    const displayName = (editName || '').trim();
    if (!displayName) return alert('Name cannot be empty');
    try {
      const r = await fetch('/api/admin/users/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, displayName })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'rename failed');
      setEditing(null); setEditName('');
      await load();
    } catch {
      alert('Rename failed.');
    }
  }

  // -------- Set password modal --------
  const openSetPwd = (u) => { setPwdFor(u); setPwd1(''); setPwd2(''); setPwdBusy(false); };
  const closeSetPwd = () => { setPwdFor(null); setPwd1(''); setPwd2(''); };

  async function submitSetPwd() {
    if (!pwd1 || pwd1.length < 6) return alert('Password must be at least 6 characters');
    if (pwd1 !== pwd2) return alert('Passwords do not match');
    setPwdBusy(true);
    try {
      const r = await fetch('/api/admin/users/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pwdFor.id, password: pwd1 })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      alert('Password updated.');
      closeSetPwd();
    } catch (e) {
      alert(`Failed to set password.\n\n${e.message}`);
      setPwdBusy(false);
    }
  }

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
                      <button className="btn" onClick={cancelRename} style={{ background:'#eee', color:'#111' }}>Cancel</button>
                    </div>
                  ) : (
                    <span>{u.displayName}</span>
                  )}
                </td>
                <td style={td}><code>{u.username}</code></td>
                <td style={td}>{u.balance}</td>
                <td style={td}>
                  <label style={{ display:'inline-flex', alignItems:'center', gap: 8 }}>
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
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn" onClick={() => startRename(u)}>Rename</button>
                      <button className="btn danger" onClick={() => openSetPwd(u)}>Set password</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td style={td} colSpan={5}>(no users)</td></tr>}
          </tbody>
        </table>
      )}

      <style>{`
        .btn { padding:8px 12px; border-radius:8px; border:1px solid #ddd; background:#111; color:#fff; cursor:pointer; }
        .btn:hover { opacity:.9; }
        .btn.danger { background:#7f1d1d; border-color:#6b1515; }
      `}</style>

      {/* Set password modal */}
      {pwdFor && (
        <div style={overlay} onClick={closeSetPwd}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Set password</h3>
            <div style={{ marginBottom: 8 }}>
              <b>User:</b> {pwdFor.displayName} <small style={{ opacity:.7 }}>({pwdFor.username})</small>
            </div>
            <div style={{ display:'grid', gap:8 }}>
              <input
                type="password"
                placeholder="New password (min 6 chars)"
                value={pwd1}
                onChange={e => setPwd1(e.target.value)}
                style={inp}
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={pwd2}
                onChange={e => setPwd2(e.target.value)}
                style={inp}
              />
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn" disabled={pwdBusy} onClick={submitSetPwd}>Save</button>
                <button className="btn" onClick={closeSetPwd} style={{ background:'#eee', color:'#111' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #ddd', background:'#f8f8f8', fontWeight:700 };
const td = { padding:'10px 12px', borderBottom:'1px solid #eee', verticalAlign:'middle' };
const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 };
const modal = { background:'#fff', color:'#111', padding:18, borderRadius:12, width:420, maxWidth:'95%' };
const inp = { padding:8, border:'1px solid #ccc', borderRadius:8 };
