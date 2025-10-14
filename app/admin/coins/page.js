'use client';
import { useEffect, useMemo, useState } from 'react';

export default function AdminCoins() {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [q, setQ] = useState('');

  const loadUsers = async () => {
    setErr(''); setOk('');
    const r = await fetch('/api/admin/users', { cache: 'no-store' });
    if (!r.ok) { setErr('Admin only'); return; }
    setUsers(await r.json());
  };

  useEffect(() => { loadUsers(); }, []);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter(u =>
      (u.displayName || '').toLowerCase().includes(s) ||
      (u.username || '').toLowerCase().includes(s)
    );
  }, [users, q]);

  const doGive = async () => {
    setErr(''); setOk('');
    if (!selectedId || !amount) { setErr('Select user and amount'); return; }
    const r = await fetch('/api/admin/coins/give', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedId, amount: Number(amount) }),
    });
    if (!r.ok) { setErr((await r.json()).error || 'Failed'); return; }
    setOk('Done');
    setAmount('');
    await loadUsers();
  };

  return (
    <div style={{padding: 20}}>
      <h1>Admin: Coins</h1>

      <div style={{marginBottom: 12}}>
        <input
          placeholder="Search user..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{padding: 8, width: 260}}
        />
      </div>

      <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:16}}>
        <select value={selectedId} onChange={(e)=>setSelectedId(e.target.value)} style={{padding:8}}>
          <option value="">Select user</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.displayName || u.username || u.id} — {u.wallet?.balance ?? 0} coins
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e)=>setAmount(e.target.value)}
          style={{padding:8, width:120}}
        />
        <button onClick={doGive} style={{padding:'8px 14px'}}>Give</button>
      </div>

      {err && <p style={{color:'crimson'}}>{err}</p>}
      {ok && <p style={{color:'green'}}>{ok}</p>}

      <div style={{overflowX:'auto', marginTop:16}}>
        <table border="1" cellPadding="6" style={{borderCollapse:'collapse', minWidth:700}}>
          <thead>
            <tr>
              <th>Display</th><th>Username</th><th>Wallet</th><th>Role</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(u => (
              <tr key={u.id}>
                <td>{u.displayName || '-'}</td>
                <td>{u.username || '-'}</td>
                <td>{u.wallet?.balance ?? 0}</td>
                <td>{u.role}</td>
                <td>{new Date(u.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{marginTop:12}}>
        <a href="/admin/users">Admin: Users</a> &nbsp;|&nbsp; <a href="/admin/history">Rewards History</a> &nbsp;|&nbsp; <a href="/">Home</a>
      </p>
    </div>
  );
}
