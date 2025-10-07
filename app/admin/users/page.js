'use client';
import { useEffect, useMemo, useState } from 'react';

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  const load = async () => {
    const r = await fetch('/api/admin/users');
    if (!r.ok) { setErr('Admin only'); return; }
    setRows(await r.json());
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r =>
      r.username.toLowerCase().includes(needle) ||
      (r.role||'').toLowerCase().includes(needle)
    );
  }, [rows, q]);

  return (
    <div style={{padding:24, fontFamily:'system-ui, sans-serif'}}>
      <h2>Admin: Users</h2>
      {err && <div style={{color:'red'}}>{err}</div>}

      <div style={{margin:'12px 0', display:'flex', gap:8}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search username / role" style={{padding:8, flex:1}}/>
        <button onClick={load}>Refresh</button>
      </div>

      <table border="1" cellPadding="6" style={{borderCollapse:'collapse', width:'100%'}}>
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Balance</th>
            <th>Joined</th>
            <th>User ID</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(u=>(
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td>{u.balance}</td>
              <td>{new Date(u.createdAt).toLocaleString()}</td>
              <td style={{fontFamily:'monospace', fontSize:12}}>{u.id}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{marginTop:12}}>
        <a href="/admin/coins">→ Give Coins</a> &nbsp;|&nbsp; <a href="/admin/history">Rewards History</a> &nbsp;|&nbsp; <a href="/">Home</a>
      </p>
    </div>
  );
}
