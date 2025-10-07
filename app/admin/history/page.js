'use client';
import { useEffect, useState } from 'react';

export default function History() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');

  const load = async () => {
    const r = await fetch('/api/admin/history');
    if (!r.ok) { setErr('Admin only'); return; }
    setRows(await r.json());
  };
  useEffect(()=>{ load(); },[]);

  return (
    <div style={{padding:24, fontFamily:'system-ui, sans-serif'}}>
      <h2>Rewards History</h2>
      {err && <div style={{color:'red'}}>{err}</div>}
      <table border="1" cellPadding="6" style={{borderCollapse:'collapse', width:'100%'}}>
        <thead><tr><th>Time</th><th>Username</th><th>Coins (Wager)</th><th>Prize</th></tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id}>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.username}</td>
              <td>{r.wager}</td>
              <td>{r.prize}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{marginTop:12}}><a href="/">← Home</a></p>
    </div>
  );
}
