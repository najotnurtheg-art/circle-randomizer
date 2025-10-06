'use client';
import { useState } from 'react';

export default function AdminCoins() {
  const [msg,setMsg]=useState('');
  const send = async (e) => {
    e.preventDefault(); setMsg('');
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const r = await fetch('/api/admin/transfer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    setMsg(r.ok ? 'Sent!' : 'Failed (admin only or user not found)');
  };
  return (
    <form onSubmit={send} style={{display:'flex',flexDirection:'column',gap:8,padding:24,fontFamily:'system-ui, sans-serif'}}>
      <h2>Admin: Give Coins</h2>
      <input name="toUsername" placeholder="username" required style={{padding:8}}/>
      <input name="amount" type="number" placeholder="coins" required style={{padding:8}}/>
      <button style={{padding:'8px 12px',background:'black',color:'white',borderRadius:8}}>Send</button>
      {msg && <div>{msg}</div>}
      <p><a href="/">← Home</a></p>
    </form>
  );
}
