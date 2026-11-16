'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, safeEqual, sessionToken } from '@/lib/auth';

export async function login(formData) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) redirect('/login?erro=config');
  if (!safeEqual(formData.get('senha') || '', pass)) redirect('/login?erro=senha');
  (await cookies()).set(COOKIE, sessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  redirect('/');
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect('/login');
}
