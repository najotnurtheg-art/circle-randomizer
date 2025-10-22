'use client';

import { useState } from 'react';

export default function ImageUploader({ label = 'Image', value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const onFile = async (e) => {
    setErr('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErr('Faqat rasm yuklang (jpg/png/webp).');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setErr('Rasm hajmi 3MB dan kichik bo‘lsin.');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setBusy(true);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok || !j?.url) {
        setErr(j?.error || 'Yuklashda xato.');
        return;
      }
      onChange?.(j.url);
    } catch (e) {
      setErr('Yuklashda xato.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label style={{ fontSize: 14, color: '#d1d5db' }}>{label}</label>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={value} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
          <button
            type="button"
            onClick={() => onChange?.('')}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #374151', background: '#111', color: '#fff' }}
          >
            Remove
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          disabled={busy}
          style={{ padding: 8, borderRadius: 8, border: '1px solid #374151', background: '#0b0b0b', color: '#e5e7eb' }}
        />
      )}
      {busy && <div style={{ fontSize: 12, color: '#9ca3af' }}>Yuklanmoqda…</div>}
      {err && <div style={{ fontSize: 12, color: '#fca5a5' }}>{err}</div>}
    </div>
  );
}
