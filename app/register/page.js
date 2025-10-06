'use client';
import { useState } from 'react';

export default function Register() {
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const r = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (!r.ok) { const j = await r.json(); setErr(j.error||'error'); return; }
    location.href = '/wheel';
  };
  return (
    <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:8,padding:24}}>
      <h2>Create account</h2>
      <input name="username" placeholder="username" required style={{padding:8}}/>
      <input name="password" type="password" placeholder="password" required style={{padding:8}}/>
      {err && <div style={{color:'red'}}>{err}</div>}
      <button style={{padding:'10px 16px',background:'black',color:'white',borderRadius:8}}>Register</button>
    </form>
  );
}
