import { NextResponse } from 'next/server';
import { USER } from '@/lib/auth';
import { getKv, loadData, setKv } from '@/lib/db';
import { notify } from '@/lib/push';
import { dailyMessages } from '@/lib/daily';
import { todaySP } from '@/lib/model';

export const dynamic = 'force-dynamic';

// Chamado pela Vercel todo dia às 22h (horário de Brasília). Envia no máximo uma vez por dia.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  const hour = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date()));
  // sem CRON_SECRET, só aceita a chamada da Vercel e só à noite (21h–23h)
  const ok = secret ? auth === `Bearer ${secret}` : /vercel-cron/i.test(req.headers.get('user-agent') || '') && hour >= 21;
  if (!ok) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const today = todaySP();
  const flag = `resumo:${today}`;
  if (await getKv(flag)) return NextResponse.json({ ok: true, skipped: 'já enviado hoje' });
  await setKv(flag, true);
  const data = await loadData(USER);
  let sent = 0;
  for (const m of dailyMessages(data, today)) sent += await notify(USER, m);
  return NextResponse.json({ ok: true, sent });
}
