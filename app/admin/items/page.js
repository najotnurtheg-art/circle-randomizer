'use client';
import { useEffect, useRef, useState } from 'react';

const TIERS = [50, 100, 200, 500];

export default function AdminItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // add form
  const [name, setName] = useState('');
  const [tier, setTier] = useState(200);
  const [imageUrl, setImageUrl] = useState('');
  const addFileRef = useRef(null);

  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const r = await fetch('/api/admin/items', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'load failed');
      setItems(j);
    } catch (e) {
      setErr('Failed to load items (admin login required).');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // ---------- helpers ----------
  const toDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  async function addItem(e) {
    e.preventDefault();
    if (!name.trim()) return alert('Enter item name.');
    try {
      const r = await fetch('/api/admin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          tier,
          imageUrl: imageUrl || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'add failed');
      setName('');
      setImageUrl('');
      if (addFileRef.current) addFileRef.current.value = '';
      await load();
    } catch (e) {
      alert(`Failed to add item.\n\n${e.message}`);
    }
  }

  async function setTierFor(id, t) {
    try {
      const r = await fetch('/api/admin/items/set-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tier: t }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'tier failed');
      await load();
    } catch (e) {
      alert('Failed to change tier.');
    }
  }

  async function setActive(id, isActive) {
    try {
      const r = await fetch('/api/admin/items/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'active failed');
      await load();
    } catch {
      alert('Failed to update active flag.');
    }
  }

  async function setStoreFlag(id, purchasable) {
    try {
      const r = await fetch('/api/admin/items/set-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, purchasable }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'store failed');
      await load();
    } catch {
      alert('Failed to update store flag.');
    }
  }

  async function setImageFor(id, url) {
    try {
      const r = await fetch('/api/admin/items/set-image-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, imageUrl: url }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'image failed');
      await load();
    } catch (e) {
      alert(`Failed to set image.\n\n${e.message}`);
    }
  }

  // pick a file and convert to data: URL, then call setImageFor
  async function uploadImageForItem(id, file) {
    if (!file) return;
    if (file.size > 1.8 * 1024 * 1024) { // ~1.8 MB
      alert('Image is too large. Please choose a file smaller than 2 MB.');
      return;
    }
    try {
      const dataUrl = await toDataUrl(file);
      await setImageFor(id, dataUrl);
    } catch (e) {
      alert('Failed to read file.');
    }
  }

  // uploader for the ADD row – fills the URL input automatically
  async function onAddFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.8 * 1024 * 1024) {
      alert('Image is too large. Please choose a file smaller than 2 MB.');
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await toDataUrl(file);
      setImageUrl(dataUrl); // ← fills the “paste image URL” box
    } catch {
      alert('Failed to read file.');
    }
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 12px 0' }}>Admin: Items</h1>

      {/* Add form */}
      <form onSubmit={addItem} style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="item name"
          style={inp}
        />
        <select value={tier} onChange={e => setTier(Number(e.target.value))} style={sel}>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* paste url box */}
        <input
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          placeholder="or paste image URL (optional)"
          style={{ ...inp, minWidth: 320 }}
        />

        {/* NEW: file uploader (fills the box above with a data URL) */}
        <input
          type="file"
          accept="image/*"
          ref={addFileRef}
          onChange={onAddFileChange}
        />

        <button className="btn" type="submit">Add</button>
      </form>

      {/* Search */}
      <input
        placeholder="Search…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ ...inp, marginBottom: 10, minWidth: 280 }}
      />

      {err && <div style={{ color: 'crimson', marginBottom: 8 }}>{err}</div>}
      {loading ? <div>Loading…</div> : (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
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
            {filtered.map(it => (
              <tr key={it.id}>
                <td style={td}>
                  {it.imageUrl ? (
                    <img src={it.imageUrl} alt="" style={{ width: 40, height: 40, objectFit:'cover', borderRadius:6 }} />
                  ) : <div style={{ width:40, height:40, border:'1px solid #ddd', borderRadius:6 }} />}
                </td>
                <td style={td}>{it.name}</td>
                <td style={td}>T{it.tier?.replace('T','') || it.tier}</td>
                <td style={td}>{String(it.isActive)}</td>
                <td style={td}>
                  <label style={{ display:'inline-flex', gap:6, alignItems:'center' }}>
                    <input
                      type="checkbox"
                      checked={!!it.purchasable}
                      onChange={e => setStoreFlag(it.id, e.target.checked)}
                    />
                    Show in Store
                  </label>
                </td>
                <td style={{ ...td, whiteSpace:'nowrap' }}>
                  {/* quick tier buttons */}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <button className="btn sm" onClick={() => setTierFor(it.id, 50)}>Set 50</button>
                    <button className="btn sm" onClick={() => setTierFor(it.id, 100)}>Set 100</button>
                    <button className="btn sm" onClick={() => setTierFor(it.id, 200)}>Set 200</button>
                    <button className="btn sm" onClick={() => setTierFor(it.id, 500)}>Set 500</button>
                    <button className="btn sm" onClick={() => setActive(it.id, !it.isActive)}>
                      {it.isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    {/* Set image by URL (prompt) */}
                    <button
                      className="btn sm"
                      onClick={() => {
                        const url = prompt('Paste image URL (or data: URL)', it.imageUrl || '');
                        if (url != null) setImageFor(it.id, url);
                      }}
                    >Set image URL</button>

                    {/* NEW: upload image for this item */}
                    <label className="btn sm" style={{ cursor:'pointer' }}>
                      Upload image
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display:'none' }}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          await uploadImageForItem(it.id, f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td style={td} colSpan={6}>(no items)</td></tr>
            )}
          </tbody>
        </table>
      )}

      <style>{`
        .btn { padding:8px 12px; border-radius:8px; border:1px solid #dcdcdc; background:#111; color:#fff; }
        .btn:hover { opacity:.92; }
        .btn.sm { padding:6px 8px; font-size:12px; }
      `}</style>
    </div>
  );
}

const th = { textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e5e7eb', background:'#f8fafc' };
const td = { padding:'10px 12px', borderBottom:'1px solid #f1f5f9', verticalAlign:'middle' };
const inp = { padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:8 };
const sel = { padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:8 };
