'use client';
import { useEffect, useMemo, useState } from 'react';

const TIER_LABEL = { T50:'50', T100:'100', T200:'200', T500:'500' };
const TO_TIER = (n) => n===50?'T50':n===100?'T100':n===200?'T200':'T500';
const PRICE = (tier) => tier==='T50'?50: tier==='T100'?100: tier==='T200'?200:500;

export default function AdminItems() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [err, setErr] = useState('');

  // (Optional) simple add form fields if you already had them; we keep them so your top row stays
  const [newName, setNewName] = useState('');
  const [newTier, setNewTier] = useState('50');
  const [newImg, setNewImg] = useState('');

  const load = async () => {
    setErr('');
    const r = await fetch('/api/admin/items', { cache:'no-store' });
    if (!r.ok) { setErr('Admin only'); return; }
    setItems(await r.json());
  };

  useEffect(()=>{ load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(i => {
      const okName = !needle || i.name.toLowerCase().includes(needle);
      const okTier = tierFilter==='ALL' || i.tier===tierFilter;
      return okName && okTier;
    });
  }, [items, q, tierFilter]);

  // --- actions ---
  const patch = async (id, data) => {
    const r = await fetch(`/api/admin/items/${id}`, {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    if (!r.ok) {
      const j = await r.json().catch(()=> ({}));
      alert('Failed: ' + (j.error||r.status));
      return false;
    }
    await load();
    return true;
  };

  const setTier = (id, n) => patch(id, { tier: TO_TIER(n) });
  const toggleActive = (id, v) => patch(id, { isActive: !v });
  const togglePurch = (id, v) => patch(id, { purchasable: !v });
  const setImageUrl = async (id) => {
    const url = prompt('Paste image URL (leave empty to clear):', '');
    if (url === null) return;
    await patch(id, { imageUrl: url.trim() || null });
  };

  // optional "add" shortcut if you already had creation elsewhere
  const quickAdd = async () => {
    if (!newName.trim()) return alert('Enter name');
    const r = await fetch('/api/items', {  // your existing create route (leave as-is if you already have one)
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: newName.trim(), tier: TO_TIER(Number(newTier)||50), imageUrl: newImg.trim()||undefined })
    });
    if (!r.ok) { alert('Create failed'); return; }
    setNewName(''); setNewTier('50'); setNewImg('');
    load();
  };

  return (
    <div style={{padding:24, fontFamily:'system-ui, sans-serif'}}>
      <h2>Admin: Items</h2>

      {/* top controls / add */}
      <div style={{display:'flex', gap:8, margin:'12px 0', alignItems:'center'}}>
        <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="item name" style={{padding:8, minWidth:220}}/>
        <select value={newTier} onChange={e=>setNewTier(e.target.value)} style={{padding:8}}>
          <option value="50">50</option><option value="100">100</option><option value="200">200</option><option value="500">500</option>
        </select>
        <input value={newImg} onChange={e=>setNewImg(e.target.value)} placeholder="or paste image URL (optional)" style={{padding:8, minWidth:280}}/>
        <button onClick={quickAdd} style={{padding:'8px 14px', background:'#000', color:'#fff', borderRadius:8}}>Add</button>
      </div>

      {/* filters */}
      <div style={{display:'flex', gap:8, margin:'8px 0'}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" style={{padding:8, flex:1}}/>
        <select value={tierFilter} onChange={e=>setTierFilter(e.target.value)} style={{padding:8}}>
          <option value="ALL">All tiers</option>
          <option value="T50">T50</option>
          <option value="T100">T100</option>
          <option value="T200">T200</option>
          <option value="T500">T500</option>
        </select>
        <button onClick={load}>Refresh</button>
      </div>

      {err && <div style={{color:'red'}}>{err}</div>}

      <table border="1" cellPadding="8" style={{borderCollapse:'collapse', width:'100%'}}>
        <thead style={{background:'#f8fafc'}}>
          <tr>
            <th>Preview</th>
            <th>Name</th>
            <th>Tier</th>
            <th>Price</th>
            <th>Active</th>
            <th>In Store</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(it => (
            <tr key={it.id}>
              <td>{it.imageUrl ? <img src={it.imageUrl} alt="" style={{width:36,height:36,objectFit:'cover',borderRadius:6}}/> : '—'}</td>
              <td>{it.name}</td>
              <td>{it.tier} ({TIER_LABEL[it.tier]})</td>
              <td>{PRICE(it.tier)}</td>
              <td>{String(it.isActive)}</td>
              <td>
                <label style={{cursor:'pointer'}}>
                  <input type="checkbox" checked={!!it.purchasable} onChange={()=>togglePurch(it.id, it.purchasable)} /> Show in Store
                </label>
              </td>
              <td style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                <button onClick={()=>setTier(it.id,50)}>Set 50</button>
                <button onClick={()=>setTier(it.id,100)}>Set 100</button>
                <button onClick={()=>setTier(it.id,200)}>Set 200</button>
                <button onClick={()=>setTier(it.id,500)}>Set 500</button>
                <button onClick={()=>toggleActive(it.id, it.isActive)}>{it.isActive ? 'Deactivate' : 'Activate'}</button>
                <button onClick={()=>setImageUrl(it.id)}>Set image URL</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan="7" style={{padding:12, color:'#666'}}>No items</td></tr>
          )}
        </tbody>
      </table>

      <p style={{marginTop:12}}>
        <a href="/admin/users">Users</a> &nbsp;|&nbsp; <a href="/admin/coins">Give Coins</a> &nbsp;|&nbsp; <a href="/admin/history">Rewards History</a> &nbsp;|&nbsp; <a href="/admin/items/store">Store toggle (alt view)</a>
      </p>
    </div>
  );
}
