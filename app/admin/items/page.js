'use client';

import { useEffect, useRef, useState } from 'react';

// --- Small helpers -----------------------------------------------------------
function safeJson(res) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return Promise.resolve(null);
  return res.json().catch(() => null);
}
const prettyTier = (t) => (t === 'T50' ? 50 : t === 'T100' ? 100 : t === 'T200' ? 200 : 500);

// -----------------------------------------------------------------------------
export default function AdminItemsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const nameRef = useRef(null);
  const tierRef = useRef(null);
  const urlRef = useRef(null);
  const fileRef = useRef(null);
  const searchRef = useRef(null);

  const [filter, setFilter] = useState('');

  // --- load items safely ------------------------------------------------------
  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/items', { cache: 'no-store' });
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setItems(Array.isArray(j) ? j : []);
    } catch (e) {
      setErr('Failed to load items: ' + (e?.message || 'unknown error'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // --- actions ----------------------------------------------------------------
  const addItem = async () => {
    setErr('');
    const name = nameRef.current.value.trim();
    const tierNum = Number(tierRef.current.value);
    const imageUrl = urlRef.current.value.trim();
    if (!name || !tierNum) return;

    const body = { name, tier: tierNum, imageUrl: imageUrl || null };
    try {
      const res = await fetch('/api/admin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      nameRef.current.value = '';
      urlRef.current.value = '';
      await load();
    } catch (e) {
      setErr('Failed to add item. ' + (e?.message || ''));
    }
  };

  const setTier = async (id, tierNum) => {
    try {
      const res = await fetch('/api/admin/items/setTier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tier: tierNum }),
      });
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setErr('Failed to change tier: ' + (e?.message || ''));
    }
  };

  const toggleActive = async (id, active) => {
    try {
      const res = await fetch('/api/admin/items/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active }),
      });
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setErr('Failed to toggle active: ' + (e?.message || ''));
    }
  };

  const toggleStore = async (id, show) => {
    try {
      const res = await fetch('/api/admin/items/toggleStore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, purchasable: show }),
      });
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setErr('Failed to toggle store flag: ' + (e?.message || ''));
    }
  };

  const setImageUrl = async (id) => {
    const v = prompt('Paste image URL for this item:');
    if (v == null) return;
    try {
      const res = await fetch('/api/admin/items/setImageUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, imageUrl: v.trim() || null }),
      });
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setErr('Failed to set image: ' + (e?.message || ''));
    }
  };

  const uploadImage = async (id) => {
    const f = fileRef.current?.files?.[0];
    if (!f) { alert('Choose a file first'); return; }
    const fd = new FormData();
    fd.append('file', f);
    fd.append('id', id);
    try {
      const res = await fetch('/api/admin/items/uploadImage', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setErr('Failed to upload image: ' + (e?.message || ''));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(filter.toLowerCase())
  );

  // --- UI ---------------------------------------------------------------------
  const th = { padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #eee' };
  const td = { padding: '10px 12px', borderBottom: '1px solid #eee', verticalAlign: 'middle' };
  const btn = { padding: '6px 10px', borderRadius: 8, border: '1px solid #333', background: '#000', color: '#fff', cursor: 'pointer' };

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Admin: Items</h1>

      {/* Add row */}
      <div style={{ display:'flex', gap:8, alignItems:'center', margin:'10px 0 16px' }}>
        <input ref={nameRef} placeholder="item name" style={{ padding:8, width:260 }} />
        <select ref={tierRef} defaultValue={50} style={{ padding:8 }}>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={500}>500</option>
        </select>
        <input ref={urlRef} placeholder="or paste image URL (optional)" style={{ padding:8, width:320 }} />
        <button onClick={addItem} style={btn}>Add</button>
        <input ref={fileRef} type="file" accept="image/*" />
        <input
          ref={searchRef}
          placeholder="Search…"
          onChange={(e)=>setFilter(e.target.value)}
          style={{ padding:8, flex:1, minWidth:180 }}
        />
      </div>

      {err && (
        <div style={{ background:'#ffe8e8', color:'#900', padding:10, borderRadius:8, marginBottom:10 }}>
          {err}
        </div>
      )}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', minWidth:900 }}>
            <thead>
              <tr>
                <th style={th}>Preview</th>
                <th style={th}>Name</th>
                <th style={th}>Tier</th>
                <th style={th}>Active</th>
                <th style={th}>Store</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id}>
                  <td style={td}>
                    {it.imageUrl ? (
                      <img src={it.imageUrl} alt="" style={{ width:44, height:44, objectFit:'cover', borderRadius:6 }} />
                    ) : (
                      <div style={{ width:44, height:44, background:'#eee', borderRadius:6 }} />
                    )}
                  </td>
                  <td style={td}>{it.name}</td>
                  <td style={td}>T{prettyTier(it.tier)}</td>
                  <td style={td}>
                    <label style={{ display:'inline-flex', gap:6, alignItems:'center' }}>
                      <input
                        type="checkbox"
                        checked={!!it.isActive}
                        onChange={(e)=>toggleActive(it.id, e.target.checked)}
                      />
                      Active
                    </label>
                  </td>
                  <td style={td}>
                    <label style={{ display:'inline-flex', gap:6, alignItems:'center' }}>
                      <input
                        type="checkbox"
                        checked={!!it.purchasable}
                        onChange={(e)=>toggleStore(it.id, e.target.checked)}
                      />
                      Show in Store
                    </label>
                  </td>
                  <td style={{ ...td, whiteSpace:'nowrap' }}>
                    <button onClick={()=>setTier(it.id, 50)} style={{ ...btn, background:'#111' }}>Set 50</button>{' '}
                    <button onClick={()=>setTier(it.id, 100)} style={{ ...btn, background:'#111' }}>Set 100</button>{' '}
                    <button onClick={()=>setTier(it.id, 200)} style={{ ...btn, background:'#111' }}>Set 200</button>{' '}
                    <button onClick={()=>setTier(it.id, 500)} style={{ ...btn, background:'#111' }}>Set 500</button>{' '}
                    <button onClick={()=>toggleActive(it.id, false)} style={{ ...btn, background:'#6b7280' }}>Deactivate</button>{' '}
                    <button onClick={()=>setImageUrl(it.id)} style={{ ...btn, background:'#374151' }}>Set image URL</button>{' '}
                    <button onClick={()=>uploadImage(it.id)} style={{ ...btn, background:'#1f2937' }}>Upload image</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding:20, color:'#666' }}>No items match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
