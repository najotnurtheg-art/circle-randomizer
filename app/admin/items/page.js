'use client';
import { useEffect, useState } from 'react';

export default function AdminItems() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name:'', tier:'50' });

  const load = async () => {
    const r = await fetch('/api/admin/items');
    if (!r.ok) { setErr('Admin only'); return; }
    setItems(await r.json());
  };
  useEffect(()=>{ load(); },[]);

  const add = async (e) => {
    e.preventDefault(); setErr('');
    const r = await fetch('/api/admin/items', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: form.name, tier: Number(form.tier) }) });
    if (!r.ok) { const j = await r.json(); setErr(j.error||'error'); return; }
    setForm({ name:'', tier:'50' }); load();
  };

  const updateTier = async (id, tier) => {
    await fetch(`/api/admin/items/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tier }) });
    load();
  };
  const toggleActive = async (id, isActive) => {
    await fetch(`/api/admin/items/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ isActive }) });
    load();
  };

  return (
    <div style={{padding:24,fontFamily:'system-ui, sans-serif'}}>
      <h2>Admin: Items</h2>
      <form onSubmit={add} style={{display:'flex',gap:8,alignItems:'center',margin:'12px 0'}}>
        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="item name" required style={{padding:8}}/>
        <select value={form.tier} onChange={e=>setForm({...form,tier:e.target.value})} style={{padding:8}}>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
        <button style={{padding:'8px 12px',background:'black',color:'white',borderRadius:8}}>Add</button>
      </form>
      {err && <div style={{color:'red'}}>{err}</div>}
      <table border="1" cellPadding="6" style={{borderCollapse:'collapse',width:'100%'}}>
        <thead><tr><th>Name</th><th>Tier</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map(it=>(
            <tr key={it.id}>
              <td>{it.name}</td>
              <td>{it.tier}</td>
              <td>{String(it.isActive)}</td>
              <td style={{display:'flex',gap:8}}>
                <button onClick={()=>updateTier(it.id,50)}>Set 50</button>
                <button onClick={()=>updateTier(it.id,100)}>Set 100</button>
                <button onClick={()=>updateTier(it.id,200)}>Set 200</button>
                <button onClick={()=>toggleActive(it.id,!it.isActive)}>{it.isActive?'Deactivate':'Activate'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{marginTop:12}}><a href="/">← Home</a></p>
    </div>
  );
}
