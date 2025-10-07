import crypto from 'crypto';

/**
 * Parse the raw initData string into a map (key -> value).
 * Keep values EXACTLY as provided by Telegram (e.g., user is a JSON string).
 */
export function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  const out = {};
  for (const [k, v] of params) out[k] = v;
  return out;
}

/**
 * Validate Telegram WebApp initData signature.
 *
 * Spec (WebApp/Mini App):
 *   1) Build data_check_string: join all key=value pairs (excluding "hash"),
 *      sorted by key (ASCII), with "\n" as separator. Values are the raw
 *      strings from initData (e.g. user is JSON string).
 *   2) secretKey = HMAC_SHA256(data = <BOT_TOKEN>, key = "WebAppData")
 *   3) expectedHash = HMAC_SHA256(data = data_check_string, key = secretKey)
 *   4) Compare lowercase hex(expectedHash) === provided "hash"
 */
export function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return false;

  const params = new URLSearchParams(initData);
  const providedHash = params.get('hash');
  if (!providedHash) return false;

  // Build data_check_string
  const pairs = [];
  const keys = [];
  for (const k of params.keys()) {
    if (k === 'hash') continue;
    keys.push(k);
  }
  keys.sort(); // alphabetical by key

  for (const k of keys) {
    const v = params.get(k);
    pairs.push(`${k}=${v}`);
  }
  const dataCheckString = pairs.join('\n');

  // Step 2: secretKey = HMAC_SHA256(botToken, key="WebAppData")
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

  // Step 3: expectedHash = HMAC_SHA256(dataCheckString, key=secretKey)
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // Step 4: compare (Telegram sends lowercase hex)
  return expectedHash === providedHash;
}

/**
 * Extract Telegram user (object) from initData (the "user" param is JSON).
 */
export function getTelegramUser(initData) {
  const params = new URLSearchParams(initData);
  const raw = params.get('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * Optional freshness check (Telegram recommends ~5 minutes).
 * Returns true if auth_date is within maxSkewSeconds from now.
 */
export function isFresh(initData, maxSkewSeconds = 600) {
  const params = new URLSearchParams(initData);
  const authDateStr = params.get('auth_date');
  if (!authDateStr) return false;
  const authDateSec = Number(authDateStr);
  if (!Number.isFinite(authDateSec)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return Math.abs(nowSec - authDateSec) <= maxSkewSeconds;
}
