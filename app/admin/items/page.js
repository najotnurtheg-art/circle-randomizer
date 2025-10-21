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

    // Parse JSON safely even if server sent nothing
    let j = {};
    try { j = await r.json(); } catch { j = {}; }
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);

    setName('');
    setImageUrl('');
    if (addFileRef.current) addFileRef.current.value = '';
    await load();
  } catch (e) {
    alert(`Failed to add item.\n\n${e.message}`);
  }
}
