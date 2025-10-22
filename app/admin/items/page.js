'use client';

import { useEffect, useState } from 'react';

const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #334155', color: '#e5e7eb' };
const td = { padding: '8px 10px', borderBottom: '1px dashed #334155', color: '#e5e7eb' };
const input = { padding: 8, border: '1px solid #334155', borderRadius: 8, background: '#0b0f19', color: '#e5e7eb' };
const btn = { padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b0f19', color: '#e5e7eb', cursor: 'pointer' };

export default function AdminItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // create form
  const [name, setName] = useState('');
  const [tier, setTier] = useState('T50');
  const [purchasable, setPurchasable] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const load = async () => {
    setErr('');
    const r = await fetch('/api/admin/items', { cache: 'no-store' });
    if (!r.ok) { setErr('Load failed'); return; }
    const j = await r.json();
    setItems(j);
  };

  useEffect(() => { load(); }, []);

  const createItem = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    const r = await fetch('/api/admin/items', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name, tier, isActive: true, purchasable, imageUrl: imageUrl || null })
    });
    setLoading(false);
    if (!r.ok) { const j = await r.json().catch(()=>({})); setErr(j.error||'Create failed'); return; }
    setName(''); setTier('T50'); setPurchasable(false); setImageUrl('');
    await load();
  };

  const toggleActive = async (id, current) => {
    const r = await fetch(`/api/admin/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ isActive: !current })
    });
    if (!r.ok) { alert('Failed to update'); return; }
    await load();
  };

  const toggleStore = async (id, current) => {
    const r = await fetch(`/api/admin/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ purchasable: !current })
    });
    if (!r.ok) { alert('Failed to update'); return; }
    await load();
  };

  const saveName = async (id, newName) => {
    if (!newName?.trim()) return;
    const r = await fetch(`/api/admin/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name: newName.trim() })
    });
    if (!r.ok) { alert('Failed to rename'); return; }
    await load();
  };

  const saveTier = async (id, newTier) => {
    const r = await fetch(`/api/admin/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ tier: newTier })
    });
    if (!r.ok) { alert('Failed to change tier'); return; }
    await load();
  };

  const removeImage = async (id) => {
    const r = await fetch(`/api/admin/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ imageUrl: null })
    });
    if (!r.ok) { alert('Failed to remove image'); return; }
    await load();
  };

  const uploadImage = async (id, file) => {
    if (!file) return;
    // upload to /api/upload
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    const j = await r.json();
    if (!r.ok) {
      alert(j?.hint ? `Upload failed: ${j.error}\n${j.hint}` : (j?.error || 'Upload failed'));
      return;
    }
    // patch item with imageUrl
    const r2 = await fetch(`/api/admin/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ imageUrl: j.url })
    });
    if (!r2.ok) { alert('Failed to attach image'); return; }
    await load();
  };

  const attachUrl = async (id) => {
    const url = prompt('Paste image URL (https://...)');
    if (!url) return;
    const r = await fetch(`/api/admin/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ imageUrl: url })
    });
    if (!r.ok) { alert('Failed to save image URL'); return; }
    await load();
  };

  return (
    <div style={{ padding: 20, background:'#0b0f19', minHeight:'100vh', color:'#e5e7eb' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Admin · Items</h2>

      <form onSubmit={createItem} style={{ display:'grid', gridTemplateColumns:'1fr 140px 140px 1fr auto', gap:10, alignItems:'center', background:'#111827', padding:12, borderRadius:12, border:'1px solid #334155', marginBottom:16 }}>
        <input style={input} placeholder="Item name" value={name} onChange={e=>setName(e.target.value)} required />
        <select style={input} value={tier} onChange={e=>setTier(e.target.value)}>
          <option value="T50">50</option>
          <option value="T100">100</option>
          <option value="T200">200</option>
          <option value="T500">500</option>
        </select>
        <label style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input type="checkbox" checked={purchasable} onChange={e=>setPurchasable(e.target.checked)} />
          Store
        </label>
        <input style={input} placeholder="(optional) image URL" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
        <button style={btn} disabled={loading}>{loading ? 'Saving…' : 'Add'}</button>
      </form>

      {err && <div style={{ color:'#fca5a5', marginBottom:12 }}>{err}</div>}

      <div style={{ overflowX:'auto', border:'1px solid #334155', borderRadius:12 }}>
        <table style={{ borderCollapse:'collapse', width:'100%', minWidth:900 }}>
          <thead>
            <tr style={{ background:'#0f172a' }}>
              <th style={th}>Image</th>
              <th style={th}>Name</th>
              <th style={th}>Tier</th>
              <th style={th}>Active</th>
              <th style={th}>Store</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td style={td}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {it.imageUrl ? (
                      <>
                        <img src={it.imageUrl} alt="" style={{ width:48, height:48, objectFit:'cover', borderRadius:8, border:'1px solid #334155' }} />
                        <button style={btn} onClick={()=>removeImage(it.id)}>Remove</button>
                      </>
                    ) : (
                      <>
                        <label style={{ ...btn, display:'inline-block' }}>
                          Upload
                          <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>uploadImage(it.id, e.target.files?.[0])}/>
                        </label>
                        <button style={btn} onClick={()=>attachUrl(it.id)}>Paste URL</button>
                      </>
                    )}
                  </div>
                </td>
                <td style={td}>
                  <input
                    defaultValue={it.name}
                    style={{ ...input, width:'100%' }}
                    onBlur={e=>saveName(it.id, e.target.value)}
                  />
                </td>
                <td style={td}>
                  <select value={it.tier} style={input} onChange={e=>saveTier(it.id, e.target.value)}>
                    <option value="T50">50</option>
                    <option value="T100">100</option>
                    <option value="T200">200</option>
                    <option value="T500">500</option>
                  </select>
                </td>
                <td style={td}>
                  <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="checkbox" checked={it.isActive} onChange={()=>toggleActive(it.id, it.isActive)} />
                    {it.isActive ? 'Active' : 'Off'}
                  </label>
                </td>
                <td style={td}>
                  <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="checkbox" checked={it.purchasable} onChange={()=>toggleStore(it.id, it.purchasable)} />
                    {it.purchasable ? 'Shown in store' : 'Hidden'}
                  </label>
                </td>
                <td style={td}>
                  {/* example delete (optional) */}
                  {/* <button style={{...btn, borderColor:'#7f1d1d'}} onClick={()=>del(it.id)}>Delete</button> */}
                  <span style={{ opacity:.6 }}>—</span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td style={{...td, color:'#94a3b8'}} colSpan={6}>No items yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
