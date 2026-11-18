'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, checkViewer, safeEqual, sessionToken } from '@/lib/auth';
import { getKv, setKv } from '@/lib/db';

const MAX_TENTATIVAS = 5;
const BLOQUEIO = 15 * 60 * 1000;
const DIA = 24 * 60 * 60 * 1000;

export async function login(formData) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) redirect('/login?erro=config');

  // Trava por aparelho/rede: 5 senhas erradas seguidas = 15 minutos bloqueado.
  const ip = ((await headers()).get('x-forwarded-for') || 'local').split(',')[0].trim();
  const key = `login:${ip}`;
  const t = (await getKv(key)) || { erros: 0, ate: 0 };
  if (t.ate > Date.now()) redirect(`/login?erro=bloqueio&min=${Math.ceil((t.ate - Date.now()) / 60000)}`);

  const codigo = String(formData.get('codigo') || '');
  const role = safeEqual(codigo, pass) ? 'admin' : (await checkViewer(codigo)) ? 'viewer' : null;
  if (!role) {
    const erros = t.ate && t.ate <= Date.now() ? 1 : t.erros + 1;
    const ate = erros >= MAX_TENTATIVAS ? Date.now() + BLOQUEIO : 0;
    await setKv(key, { erros: ate ? 0 : erros, ate });
    if (ate) redirect('/login?erro=bloqueio&min=15');
    redirect(`/login?erro=senha&resta=${MAX_TENTATIVAS - erros}`);
  }
  if (t.erros || t.ate) await setKv(key, { erros: 0, ate: 0 });

  // "Manter conectado" = 90 dias; senão a sessão vale 12 horas.
  const lembrar = formData.get('lembrar') === 'on';
  const ms = lembrar ? 90 * DIA : DIA / 2;
  (await cookies()).set(COOKIE, await sessionToken(ms, role), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: ms / 1000,
  });
  redirect('/');
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect('/login');
}
