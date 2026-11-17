import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const COOKIE = 'nozyx_sessao';
// Um só usuário (o dono). Os dados ficam numa chave própria dele no banco.
export const USER = 'admin';

const sign = (exp) => crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || '').update(`nozyx-sessao-v2|${exp}`).digest('hex');

/** Sessão com validade: "expiracao.assinatura". Trocar a senha derruba todas. */
export function sessionToken(ms) {
  const exp = Date.now() + ms;
  return `${exp}.${sign(exp)}`;
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function isAuthed() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const c = (await cookies()).get(COOKIE)?.value || '';
  const [exp, sig] = c.split('.');
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  return safeEqual(sig, sign(exp));
}

export async function requireAuth() {
  if (!(await isAuthed())) redirect('/login');
}
