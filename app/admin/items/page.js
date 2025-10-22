'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useRef, useState } from 'react';

const TIERS = [50, 100, 200, 500];

export default function AdminItemsPage() {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  // add form
  const [name, setName] = useState('');
  const [tier, setTier] = useState(50);
  const [imageUrl, setImageUrl] = useState('');
  const addFileRef = useRef(null);

  const [q, setQ] = useState('');

  useEffect(() => setReady(true), []);

  const safeJson = async (r) => {
    try { return await r.json(); } catch { return {}; }
  };

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await fetch('/api/admin/items', { cache: 'no-store' });
      const j = await safeJson(r);
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setItems(Array.isArray(j) ? j : []);
    } catch (e) {
      setErr('Admin bo‘limi uchun login talab qilinadi yoki API xatosi.');
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (ready) load(); }, [ready]); // only after mount

  // dataURL helper
  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  // add item
  const addItem = async (e) => {
    e.preventDefault();
    if (!name.trim()) { alert('Item name kiriting'); return; }
    try {
      const r = await fetch('/api/admin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), tier, imageUrl: imageUrl || null }),
      });
      const j = await safeJson(r);
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setName(''); setImageUrl('');
      if (addFileRef.current) addFileRef.current.value = '';
      await load();
    } catch (e) {
      alert(`Failed to add item.\n${e.message}`);
    }
  };

  // buttons
  const setTierFor = async (id, t) => {
    const r = await fetch('/api/admin/items/set-tier', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, tier: t }),
    });
    const j = await safeJson(r);
    if (!r.ok) return alert(j.error || 'Tier update failed');
    load();
  };

  const toggleActive = async (id, isActive) => {
    const r = await fetch('/api/admin/items/set-active', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive }),
    });
    const j = await safeJson(r);
    if (!r.ok) return alert(j.error || 'Active update failed');
    load();
  };

  const toggleStore = async (id, purchasable) => {
    const r = await fetch('/api/admin/items/set-store', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, purchasable }),
    });
    const j = await safeJson(r);
    if (!r.ok) return alert(j.error || 'Store update failed');
    load();
  };

  const setImageFor = async (id, url) => {
    const r = await fetch('/api/admin/items/set-image-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, imageUrl: url || null }),
    });
    const j = await safeJson(r);
    if (!r.ok) return alert(j.error || 'Image update failed');
    load();
  };

  const uploadFor = async (id, f) => {
    if (!f) return;
    if (f.size > 1.9 * 1024 * 1024) { alert('Image < 2MB bo‘lsin'); return; }
    try {
      const dataUrl = await fileToDataUrl(f);
      await setImageFor(id, dataUrl);
    } catch {
      alert('Faylni o‘qib bo‘lmadi');
    }
  };

  const onAddFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 1.9 * 1024 * 1024) { alert('Image < 2MB bo‘lsin'); e.target.value=''; return; }
    const dataUrl = await fileToDataUrl(f);
    setImageUrl(dataUrl);
  };

  if (!ready) return null;

  const filtered = items.filter(i => (i.name||'').toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 12px 0' }}>Admin: Items</h1>

      <form onSubmit={addItem} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="item name" style={inp}/>
        <select value={tier} onChange={e=>setTier(Number(e.target.value))} style={inp}>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="or paste image URL (optional)" style={{...inp, minWidth:300}}/>
        <input ref={addFileRef} type="file" accept="image/*" onChange={onAddFile}/>
        <button className="btn">Add</button>
      </form>

      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" style={{...inp, marginBottom:10}} />

      {err && <div style={{ color:'crimson', marginBottom:8 }}>{err}</div>}
      {loading ? <div>Loading…</div> : (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Preview</th>
              <th style={th}>Name</th>
              <th style={th}>Tier</th>
              <th style={th}>Active</th>
              <th style={th}>Store</th>
              <th style={th}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(it => (
              <tr key={it.id}>
                <td style={td}>
                  {it.imageUrl
                    ? <img src={it.imageUrl} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:6}}/>
                    : <div style={{width:40,height:40,border:'1px solid #ddd',borderRadius:6}}/>}
                </td>
                <td style={td}>{it.name}</td>
                <td style={td}>{String(it.tier)}</td>
                <td style={td}>
                  <label style={{display:'inline-flex',gap:6,alignItems:'center'}}>
                    <input type="checkbox" checked={!!it.isActive} onChange={e=>toggleActive(it.id, e.target.checked)}/>
                    Active
                  </label>
                </td>
                <td style={td}>
                  <label style={{display:'inline-flex',gap:6,alignItems:'center'}}>
                    <input type="checkbox" checked={!!it.purchasable} onChange={e=>toggleStore(it.id, e.target.checked)}/>
                    Show in Store
                  </label>
                </td>
                <td style={td}>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    <button className="btn sm" type="button" onClick={()=>setTierFor(it.id,50)}>Set 50</button>
                    <button className="btn sm" type="button" onClick={()=>setTierFor(it.id,100)}>Set 100</button>
                    <button className="btn sm" type="button" onClick={()=>setTierFor(it.id,200)}>Set 200</button>
                    <button className="btn sm" type="button" onClick={()=>setTierFor(it.id,500)}>Set 500</button>
                    <button className="btn sm" type="button" onClick={()=>{
                      const url = prompt('Image URL yoki data URL', it.imageUrl || '');
                      if (url !== null) setImageFor(it.id, url);
                    }}>Set image URL</button>
                    <label className="btn sm" style={{cursor:'pointer'}}>
                      Upload image
                      <input type="file" accept="image/*" style={{display:'none'}} onChange={async (e)=>{
                        const f = e.target.files?.[0];
                        await uploadFor(it.id, f);
                        e.target.value='';
                      }}/>
                    </label>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td style={td} colSpan={6}>(empty)</td></tr>}
          </tbody>
        </table>
      )}

      <style>{`
        .btn { padding:8px 12px; border-radius:8px; border:1px solid #d1d5db; background:#111; color:#fff; }
        .btn.sm { padding:6px 8px; font-size:12px; }
        .btn:hover { opacity: .92; }
      `}</style>
    </div>
  );
}

const th = { textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e5e7eb', background:'#f8fafc' };
const td = { padding:'10px 12px', borderBottom:'1px solid #f1f5f9', verticalAlign:'middle' };
const inp = { padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:8 };
