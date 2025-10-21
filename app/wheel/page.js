// ... inside startSharedSpin, when e >= 1 (animation done):
rafRef.current = null;

// 1) Ask the server to apply the reward and log it
try {
  const r = await fetch('/api/spin/complete', { method:'POST' });
  const j = await r.json();
  if (r.ok) {
    setBalance(j.balance || 0);
    if (j.popup) setPopup(j.popup);
  } else {
    // fallback popup from the chosen segment if server said no-pending (rare)
    const seg = spin.segments[spin.resultIndex];
    if (seg?.type === 'item') setPopup({ text:`'${spin.username}' siz '${seg.name}' yutib oldingiz🎉`, imageUrl: seg.imageUrl || null });
    else if (seg?.type === 'coins') setPopup({ text:`'${spin.username}' siz +${seg.amount} tangalarni yutib oldingiz🎉` });
    else setPopup({ text:`'${spin.username}' uchun yana bir aylantirish!` });
  }
} catch {
  // network fallback
}

// 2) Refresh side widgets
getLatestWins();
getFeatured();
getStore();
