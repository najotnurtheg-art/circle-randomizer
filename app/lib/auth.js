import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const NAME = 'cr_jwt';
const SECRET = process.env.JWT_SECRET;

export function setToken(payload) {
  const token = jwt.sign(payload, SECRET, { expiresIn: '30d' });
  cookies().set(NAME, token, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
}

export function clearToken() {
  cookies().set(NAME, '', { maxAge: 0, path: '/' });
}

export function getUser() {
  try {
    const t = cookies().get(NAME)?.value;
    if (!t) return null;
    return jwt.verify(t, SECRET);
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
