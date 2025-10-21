  const submitSetPwd = async () => {
    if (!pwd1 || pwd1.length < 6) return alert('Password must be at least 6 characters');
    if (pwd1 !== pwd2) return alert('Passwords do not match');
    setPwdBusy(true);
    try {
      const r = await fetch('/api/admin/users/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pwdFor.id, password: pwd1 })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      alert('Password updated.');
      closeSetPwd();
    } catch (e) {
      alert(`Failed to set password.\n\n${e.message}`);
      setPwdBusy(false);
    }
  };
