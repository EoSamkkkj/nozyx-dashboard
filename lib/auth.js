import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const COOKIE = 'nozyx_sessao';
// Um só usuário (o dono). Os dados ficam numa chave própria dele no banco.
export const USER = 'admin';

export function sessionToken() {
  return crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || '').update('nozyx-painel-sessao-v1').digest('hex');
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function isAuthed() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const c = (await cookies()).get(COOKIE)?.value;
  return Boolean(c) && safeEqual(c, sessionToken());
}

export async function requireAuth() {
  if (!(await isAuthed())) redirect('/login');
}
