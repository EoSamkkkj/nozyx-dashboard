import { NextResponse } from 'next/server';
import { isAuthed, USER } from '@/lib/auth';
import { fcmSubscribe, fcmUnsubscribe } from '@/lib/fcm';
import { deviceCount, notify, publicKey, subscribe, unsubscribe } from '@/lib/push';
import { loadData } from '@/lib/db';
import { dailyMessages } from '@/lib/daily';
import { todaySP } from '@/lib/model';

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
    if (body.action === 'subscribe-native') {
      await fcmSubscribe(USER, body.token, body.device);
      return NextResponse.json({ devices: await deviceCount(USER) });
    }
    if (body.action === 'unsubscribe-native') {
      await fcmUnsubscribe(USER, body.token);
      return NextResponse.json({ devices: await deviceCount(USER) });
    }
    if (body.action === 'unsubscribe') {
      await unsubscribe(USER, body.endpoint);
      return NextResponse.json({ devices: await deviceCount(USER) });
    }
    if (body.action === 'test') {
      const sent = await notify(USER, { title: 'Venda aprovada! 🎉', body: 'Valor: R$ 250,00\nTeste · é assim que as vendas vão chegar', tag: 'teste', url: '/#vendas' });
      return NextResponse.json({ sent });
    }
    if (body.action === 'test-resumo') {
      let sent = 0;
      for (const m of dailyMessages(await loadData(USER), todaySP())) sent += await notify(USER, m);
      return NextResponse.json({ sent });
    }
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Falhou.' }, { status: 400 });
  }
}
