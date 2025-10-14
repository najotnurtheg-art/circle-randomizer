'use client';
import { useEffect, useState, useRef } from 'react';

export default function AdminItems() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name:'', tier:'50', imageUrl:'' });
  const fileRef = useRef(null);

  const load = async () => {
    const r = await fetch('/api/admin/items');
    if (!r.ok) { setErr('Admin only'); return; }
    setItems(await r.json());
  };
  useEffect(()=>{ load(); },[]);

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/upload', { method:'POST', body: fd });
    if (!r.ok) throw new Error('upload failed');
    const j = await r.json();
    return j.url;
  };

  const add = async (e) => {
    e.preventDefault(); setErr('');
    let imageUrl = form.imageUrl || '';
    const f = fileRef.current?.files?.[0];
    if (f) imageUrl = await uploadFile(f);

    const r = await fetch('/api/admin/items', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: form.name, tier: Number(form.tier), imageUrl: imageUrl || null })
    });
    if (!r.ok) { const j = await r.json(); setErr(j.error||'error'); return; }
    setForm({ name:'', tier:'50', imageUrl:'' });
    if (fileRef.current) fileRef.current.value = '';
    load();
  };

  const update = async (id, data) => {
    await fetch(`/api/admin/items/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    load();
  };

  const handleRowUpload = async (id, file) => {
    const url = await uploadFile(file);
    await update(id, { imageUrl: url });
  };

  return (
    <div style={{padding:24,fontFamily:'system-ui, sans-serif'}}>
      <h2>Admin: Items</h2>
      <form onSubmit={add} style={{display:'flex',gap:8,alignItems:'center',margin:'12px 0', flexWrap:'wrap'}}>
        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="item name" required style={{padding:8}}/>
        <select value={form.tier} onChange={e=>setForm({...form,tier:e.target.value})} style={{padding:8}}>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
          <option value="500">500 (grand prize)</option>
        </select>
        <input value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} placeholder="or paste image URL (optional)" style={{padding:8, width:260}}/>
        <input type="file" ref={fileRef} accept="image/*" />
        <button style={{padding:'8px 12px',background:'black',color:'white',borderRadius:8}}>Add</button>
      </form>
      {err && <div style={{color:'red'}}>{err}</div>}

      <table border="1" cellPadding="6" style={{borderCollapse:'collapse',width:'100%'}}>
        <thead><tr><th>Preview</th><th>Name</th><th>Tier</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map(it=>(
            <tr key={it.id}>
              <td>{it.imageUrl ? <img src={it.imageUrl} alt="" style={{width:64,height:64,objectFit:'cover'}}/> : '—'}</td>
              <td>{it.name}</td>
              <td>{it.tier}</td>
              <td>{String(it.isActive)}</td>
              <td style={{display:'flex',gap:8,flexWrap:'wrap', alignItems:'center'}}>
                <button onClick={()=>update(it.id, { tier:50 })}>Set 50</button>
                <button onClick={()=>update(it.id, { tier:100 })}>Set 100</button>
                <button onClick={()=>update(it.id, { tier:200 })}>Set 200</button>
                <button onClick={()=>update(it.id, { tier:500 })}>Set 500</button>
                <button onClick={()=>update(it.id, { isActive: !it.isActive })}>{it.isActive?'Deactivate':'Activate'}</button>
                <label style={{cursor:'pointer'}}>
                  <input type="file" accept="image/*" style={{display:'none'}}
                         onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleRowUpload(it.id, f); }} />
                  Upload image
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{marginTop:12}}><a href="/">← Home</a></p>
    </div>
  );
}
