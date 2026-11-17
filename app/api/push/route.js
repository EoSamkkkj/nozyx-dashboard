import { NextResponse } from 'next/server';
import { isAuthed, USER } from '@/lib/auth';
import { deviceCount, notify, publicKey, subscribe, unsubscribe } from '@/lib/push';

export const dynamic = 'force-dynamic';

const denied = () => NextResponse.json({ error: 'Faça login de novo.' }, { status: 401 });

export async function GET() {
  if (!(await isAuthed())) return denied();
  return NextResponse.json({ publicKey: await publicKey(), devices: await deviceCount(USER) });
}

// { action: 'subscribe', subscription, device } | { action: 'unsubscribe', endpoint } | { action: 'test' }
export async function POST(req) {
  if (!(await isAuthed())) return denied();
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === 'subscribe') {
      const devices = await subscribe(USER, body.subscription, body.device);
      return NextResponse.json({ devices });
    }
    if (body.action === 'unsubscribe') {
      await unsubscribe(USER, body.endpoint);
      return NextResponse.json({ devices: await deviceCount(USER) });
    }
    if (body.action === 'test') {
      const sent = await notify(USER, { title: '💰 Venda registrada! R$ 250,00', body: 'Teste · é assim que as vendas vão chegar', tag: 'teste' });
      return NextResponse.json({ sent });
    }
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Falhou.' }, { status: 400 });
  }
}
