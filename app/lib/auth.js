import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const NAME = 'cr_jwt';
const SECRET = process.env.JWT_SECRET;

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  // In dev we cannot set secure+samesite=none on http://localhost
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    // 30 days
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function setToken(payload) {
  if (!SECRET) throw new Error('JWT_SECRET is not set');
  const token = jwt.sign(payload, SECRET, { expiresIn: '30d' });
  cookies().set(NAME, token, cookieOptions());
}

export function clearToken() {
  cookies().set(NAME, '', { ...cookieOptions(), maxAge: 0 });
}

export function getUser() {
  try {
    const token = cookies().get(NAME)?.value || null;
    if (!token) return null;
    if (!SECRET) return null;
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export function requireUser() {
  const u = getUser();
  if (!u) throw new Error('unauth');
  return u;
}

export function requireAdmin() {
  const u = requireUser();
  if (u.role !== 'ADMIN') throw new Error('forbidden');
  return u;
}
