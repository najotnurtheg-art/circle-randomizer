import crypto from 'crypto';

// Parse initData string into an object (key -> value)
export function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  const out = {};
  for (const [k, v] of params) out[k] = v;
  return out;
}

// Verify signature according to Telegram docs
export function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return false;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;

  params.delete('hash');

  // Create data_check_string sorted by keys
  const data = [];
  const keys = Array.from(params.keys()).sort();
  for (const k of keys) data.push(`${k}=${params.get(k)}`);
  const dataCheckString = data.join('\n');

  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  return hmac === hash;
}

// Extract Telegram user object from initData
export function getTelegramUser(initData) {
  const params = new URLSearchParams(initData);
  const raw = params.get('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
