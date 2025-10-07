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
    const r = await fetch('/api/admin/users');
    if (!r.ok) { setErr('Admin only'); return; }
    setUsers(await r.json());
  };

  useEffect(()=>{ loadUsers(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(u => u.username.toLowerCase().includes(needle));
  }, [users, q]);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk('');
    const val = parseInt(amount, 10);
    if (!selectedId) { setErr('Pick a user'); return; }
    if (!Number.isInteger(val) || val <= 0) { setErr('Enter a positive integer amount'); return; }

    const r = await fetch('/api/admin/coins', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId: selectedId, amount: val })
    });
    const j = await r.json();
    if (!r.ok) { setErr(j.error||'error'); return; }
    setOk(`Sent ${val} to ${j.username}. New balance: ${j.balance}`);
    setAmount('');
    // refresh balances list
    loadUsers();
  };

  const selectedUser = users.find(u => u.id === selectedId);

  return (
    <div style={{padding:24, fontFamily:'system-ui, sans-serif'}}>
      <h2>Admin: Give Coins</h2>

      <form onSubmit={submit} style={{display:'grid', gap:10, maxWidth:520, marginTop:12}}>
        <div style={{display:'flex', gap:8}}>
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search user..."
            style={{padding:8, flex:1}}
          />
          <button type="button" onClick={loadUsers}>Refresh</button>
        </div>

        <select value={selectedId} onChange={e=>setSelectedId(e.target.value)} required style={{padding:8}}>
          <option value="">— Pick a user —</option>
          {filtered.map(u=>(
            <option key={u.id} value={u.id}>
              {u.username} (balance: {u.balance}, role: {u.role})
            </option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={e=>setAmount(e.target.value)}
          placeholder="Coins to send (e.g., 500)"
          required
          style={{padding:8}}
        />

        <button style={{padding:'10px 16px', background:'black', color:'white', borderRadius:8}}>
          Send
        </button>
      </form>

      {err && <div style={{color:'red', marginTop:10}}>{err}</div>}
      {ok && <div style={{color:'green', marginTop:10}}>{ok}</div>}

      <div style={{marginTop:20}}>
        {selectedUser && (
          <div style={{fontSize:14, color:'#555'}}>
            Selected: <b>{selectedUser.username}</b> — Current balance: <b>{selectedUser.balance}</b>
          </div>
        )}
      </div>

      <hr style={{margin:'20px 0'}}/>

      <h3>All Users (latest 500)</h3>
      <div style={{maxHeight:300, overflow:'auto', border:'1px solid #eee'}}>
        <table border="1" cellPadding="6" style={{borderCollapse:'collapse', width:'100%'}}>
          <thead><tr><th>Username</th><th>Balance</th><th>Role</th><th>Joined</th></tr></thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id} style={{background: u.id===selectedId ? '#f1f5f9' : 'transparent'}}>
                <td>{u.username}</td>
                <td>{u.balance}</td>
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
