import { NextResponse } from 'next/server';
import { isAdmin, removeViewer, setViewerPassword, viewerInfo } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Só o dono gerencia a senha de visualização.
const denied = () => NextResponse.json({ error: 'Só o dono pode fazer isso.' }, { status: 403 });

export async function GET() {
  if (!(await isAdmin())) return denied();
  const v = await viewerInfo();
  return NextResponse.json({ active: Boolean(v), since: v?.since || null });
}

export async function POST(req) {
  if (!(await isAdmin())) return denied();
  try {
    const { senha } = await req.json();
    await setViewerPassword(senha);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Não deu para salvar.' }, { status: 400 });
  }
}

export async function DELETE() {
  if (!(await isAdmin())) return denied();
  await removeViewer();
  return NextResponse.json({ ok: true });
}
