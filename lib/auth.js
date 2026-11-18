import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getKv, setKv } from './db';

export const COOKIE = 'nozyx_sessao';
// Um só painel (o do dono). Os dados ficam numa chave própria dele no banco.
export const USER = 'admin';

const VIEWER_KEY = 'viewer:senha';
const hmac = (txt) => crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || '').update(txt).digest('hex');
const sign = (exp) => hmac(`nozyx-sessao-v2|${exp}`);
const signViewer = (exp, salt) => hmac(`nozyx-visual-v1|${exp}|${salt}`);

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/* ---------- senha "só visualizar" (criada pelo dono em Ajustes) ---------- */
const scrypt = (pass, salt) => crypto.scryptSync(String(pass), salt, 32).toString('hex');

export async function viewerInfo() {
  const v = await getKv(VIEWER_KEY);
  return v?.salt && v?.hash ? v : null;
}

export async function setViewerPassword(pass) {
  if (typeof pass !== 'string' || pass.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  if (safeEqual(pass, process.env.ADMIN_PASSWORD || '')) throw new Error('Use uma senha diferente da sua.');
  const salt = crypto.randomBytes(16).toString('hex'); // sal novo derruba quem entrou com a senha antiga
  await setKv(VIEWER_KEY, { salt, hash: scrypt(pass, salt), since: new Date().toISOString() });
}

export const removeViewer = () => setKv(VIEWER_KEY, null);

export async function checkViewer(pass) {
  const v = await viewerInfo();
  return Boolean(v && pass && safeEqual(scrypt(pass, v.salt), v.hash));
}

/* ---------- sessão ---------- */
/** Dono: "expiracao.assinatura". Visualização: "expiracao.v.assinatura". Trocar a senha derruba as sessões. */
export async function sessionToken(ms, role = 'admin') {
  const exp = Date.now() + ms;
  if (role === 'viewer') {
    const v = await viewerInfo();
    return `${exp}.v.${signViewer(exp, v.salt)}`;
  }
  return `${exp}.${sign(exp)}`;
}

/** 'admin', 'viewer' ou null (sem login). */
export async function getRole() {
  if (!process.env.ADMIN_PASSWORD) return null;
  const c = (await cookies()).get(COOKIE)?.value || '';
  const parts = c.split('.');
  const exp = parts[0];
  if (!exp || !(Number(exp) > Date.now())) return null;
  if (parts.length === 2) return safeEqual(parts[1], sign(exp)) ? 'admin' : null;
  if (parts.length === 3 && parts[1] === 'v') {
    const v = await viewerInfo();
    return v && safeEqual(parts[2], signViewer(exp, v.salt)) ? 'viewer' : null;
  }
  return null;
}

export const isAuthed = async () => Boolean(await getRole());
export const isAdmin = async () => (await getRole()) === 'admin';

export async function requireAuth() {
  const role = await getRole();
  if (!role) redirect('/login');
  return role;
}
