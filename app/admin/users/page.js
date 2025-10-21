'use client';
import { useEffect, useState } from 'react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState('');

  const load = async () => {
    const r = await fetch('/api/admin/users/list', { cache:'no-store' }); // your existing list endpoint
    const j = await r.json(); setUsers(j);
  };
  useEffect(()=>{ load(); },[]);

  const toggleFeatured = async (id, featured) => {
    setErr('');
    const r = await fetch('/api/admin/users/feature', {
      method:'PATCH', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ userId:id, featured })
    });
    if (!r.ok) { const j = await r.json().catch(()=>({})); setErr(j.error||'xato'); return; }
    await load();
  };

  return (
    <div style={{padding:20}}>
      <h2>Admin: Users</h2>
      {err && <div style={{color:'red'}}>{err}</div>}
      <table border="1" cellPadding="6" style={{borderCollapse:'collapse', width:'100%'}}>
        <thead><tr>
          <th>Name</th><th>Balance</th><th>Show on main?</th>
        </tr></thead>
        <tbody>
          {users.map(u=>(
            <tr key={u.id}>
              <td>{u.displayName || u.username || u.id}</td>
              <td>{u.balance}</td>
              <td>
                <label>
                  <input type="checkbox" checked={!!u.featured}
                         onChange={e=>toggleFeatured(u.id, e.target.checked)}/>
                  {' '}featured
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
