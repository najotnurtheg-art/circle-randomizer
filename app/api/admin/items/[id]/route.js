'use client';
import { useEffect, useMemo, useState } from 'react';

const price = (tier) => tier==='T50' ? 50 : tier==='T100' ? 100 : tier==='T200' ? 200 : 500;

export default function AdminItemsStoreToggle() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    const r = await fetch('/api/admin/items', { cache: 'no-store' });
    if (!r.ok) { setErr('Admin only'); return; }
    setItems(await r.json());
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(i => {
      const okTier = tierFilter === 'ALL' || i.tier === tierFilter;
      const okName = !needle || i.name.toLowerCase().includes(needle);
      return okTier && okName;
    });
  }, [items, q, tierFilter]);

  const togglePurch = async (id, value) => {
    await fetch(`/api/admin/items/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ purchasable: !value })
    });
    load();
  };

  const toggleActive = async (id, value) => {
    await fetch(`/api/admin/items/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ isActive: !value })
    });
    load();
  };

  return (
    <div style={{padding:24, fontFamily:'system-ui, sans-serif'}}>
      <h2>Admin: Items → Store visibility</h2>
      <p style={{marginTop:4, color:'#555'}}>
        Use this page to choose which items are <b>allowed in the Store</b> (buy without spin).
        Your existing “Add Items” page is unchanged.
      </p>

      {err && <div style={{color:'red', margin:'8px 0'}}>{err}</div>}

      <div style={{display:'flex', gap:8, margin:'12px 0'}}>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search items…"
          style={{padding:8, flex:1}}
        />
        <select value={tierFilter} onChange={e=>setTierFilter(e.target.value)} style={{padding:8}}>
          <option value="ALL">All tiers</option>
          <option value="T50">T50</option>
          <option value="T100">T100</option>
          <option value="T200">T200</option>
          <option value="T500">T500</option>
        </select>
        <button onClick={load}>Refresh</button>
      </div>

      <div style={{border:'1px solid #eee', borderRadius:8, overflow:'hidden'}}>
        <table cellPadding="8" style={{borderCollapse:'collapse', width:'100%'}}>
          <thead style={{background:'#f8fafc'}}>
            <tr>
              <th align="left">Name</th>
              <th align="left">Tier</th>
              <th align="right">Price</th>
              <th align="center">Active</th>
              <th align="center">Purchasable (Store)</th>
              <th align="left">Updated</th>
              <th align="left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i=>(
              <tr key={i.id} style={{borderTop:'1px solid #eee'}}>
                <td>{i.imageUrl ? <img src={i.imageUrl} alt="" style={{width:28,height:28,objectFit:'cover',borderRadius:6,verticalAlign:'middle',marginRight:6}}/> : null}{i.name}</td>
                <td>{i.tier}</td>
                <td align="right">{price(i.tier)}</td>
                <td align="center">
                  <input type="checkbox" checked={!!i.isActive} onChange={()=>toggleActive(i.id, i.isActive)} />
                </td>
                <td align="center">
                  <input type="checkbox" checked={!!i.purchasable} onChange={()=>togglePurch(i.id, i.purchasable)} />
                </td>
                <td>{new Date(i.updatedAt).toLocaleString()}</td>
                <td>
                  {/* quick toggles; keep your separate page for create/edit */}
                  <button onClick={()=>togglePurch(i.id, i.purchasable)} style={{padding:'6px 10px'}}>Toggle Store</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{padding:16, color:'#666'}}>Nothing found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{marginTop:12}}>
        <a href="/admin/items">← Back to Items (add/edit)</a> &nbsp;|&nbsp;
        <a href="/admin/users">Users</a> &nbsp;|&nbsp;
        <a href="/admin/coins">Give Coins</a> &nbsp;|&nbsp;
        <a href="/admin/history">Rewards History</a> &nbsp;|&nbsp;
        <a href="/">Home</a>
      </p>
    </div>
  );
}
