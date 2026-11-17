import { NextResponse } from 'next/server';
import { isAuthed, USER } from '@/lib/auth';
import { loadData, saveData } from '@/lib/db';
import { changes, notify } from '@/lib/push';

export const dynamic = 'force-dynamic';

const denied = () => NextResponse.json({ error: 'Faça login de novo.' }, { status: 401 });

export async function GET() {
  if (!(await isAuthed())) return denied();
  return NextResponse.json({ data: await loadData(USER) });
}

export async function PUT(req) {
  if (!(await isAuthed())) return denied();
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }
  if (!body?.data || typeof body.rev !== 'number') {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }
  try {
    const before = await loadData(USER);
    const r = await saveData(USER, body.rev, body.data);
    if (r.conflict) return NextResponse.json({ error: 'conflito', data: r.data }, { status: 409 });
    try {
      for (const msg of changes(before, r.data)) await notify(USER, msg);
    } catch (e) {
      console.error('[push] aviso não enviado:', e);
    }
    return NextResponse.json({ data: r.data });
  } catch (e) {
    console.error('[dados] falha ao salvar:', e);
    return NextResponse.json({ error: 'Não consegui salvar no banco. Tente de novo.' }, { status: 500 });
  }
}
