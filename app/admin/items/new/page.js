'use client';

import { useState } from 'react';
import ImageUploader from '@/app/components/ImageUploader';

export default function AdminNewItemPage() {
  const [name, setName] = useState('');
  const [tier, setTier] = useState(50);
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    if (!name?.trim()) { setErr('Nom kiriting'); return; }
    if (![50, 100, 200, 500].includes(Number(tier))) { setErr('Tier noto‘g‘ri'); return; }

    setBusy(true);
    try {
      const r = await fetch('/api/admin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), tier: Number(tier), imageUrl: imageUrl || null }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j?.error || 'Yaratishda xato.');
        return;
      }
      setMsg('Yaratildi ✅');
      setName('');
      setTier(50);
      setImageUrl('');
    } catch (e) {
      setErr('Server xatosi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 20, color: '#e5e7eb', background: '#0b0b0b', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Admin · Yangi Item</h1>

        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 14, color: '#d1d5db' }}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: iPhone kabro"
              style={{ padding: 10, borderRadius: 8, border: '1px solid #374151', background: '#0b0b0b', color: '#e5e7eb' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 14, color: '#d1d5db' }}>Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(Number(e.target.value))}
              style={{ padding: 10, borderRadius: 8, border: '1px solid #374151', background: '#0b0b0b', color: '#e5e7eb' }}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>

          <ImageUploader value={imageUrl} onChange={setImageUrl} />

          <button
            disabled={busy}
            style={{ marginTop: 6, padding: '10px 14px', borderRadius: 10, border: '1px solid #374151', background: '#111', color: '#fff' }}
          >
            {busy ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>

          {msg && <div style={{ color: '#86efac' }}>{msg}</div>}
          {err && <div style={{ color: '#fca5a5' }}>{err}</div>}
        </form>

        <div style={{ marginTop: 18 }}>
          <a href="/admin/items" style={{ color: '#93c5fd' }}>← Items ro‘yxati</a>
        </div>
      </div>
    </div>
  );
}
