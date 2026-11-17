import * as webpush from 'web-push';
import { getKv, setKv } from './db';
import { computeSale, money } from './model';

// As chaves das notificações são criadas na primeira vez e guardadas no banco,
// então não é preciso configurar nada na Vercel.
async function vapid() {
  let keys = await getKv('vapid');
  if (!keys) {
    keys = webpush.generateVAPIDKeys();
    await setKv('vapid', keys);
  }
  return keys;
}

export async function publicKey() {
  return (await vapid()).publicKey;
}

const subsKey = (user) => `push:${user}`;
const list = async (user) => (await getKv(subsKey(user))) || [];

export async function subscribe(user, sub, device) {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) throw new Error('Inscrição inválida.');
  const subs = (await list(user)).filter((s) => s.endpoint !== sub.endpoint);
  subs.push({ endpoint: sub.endpoint, keys: sub.keys, device: String(device || '').slice(0, 80), since: new Date().toISOString() });
  await setKv(subsKey(user), subs.slice(-20));
  return subs.length;
}

export async function unsubscribe(user, endpoint) {
  await setKv(subsKey(user), (await list(user)).filter((s) => s.endpoint !== endpoint));
}

export async function deviceCount(user) {
  return (await list(user)).length;
}

/** Envia para todos os aparelhos inscritos; remove os que não existem mais. */
export async function notify(user, payload) {
  const subs = await list(user);
  if (!subs.length) return 0;
  const keys = await vapid();
  webpush.setVapidDetails('https://nozyx-dashboard.vercel.app', keys.publicKey, keys.privateKey);
  const dead = new Set();
  let sent = 0;
  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification(s, JSON.stringify(payload), { TTL: 60 * 60 * 24 })
        .then(() => { sent += 1; })
        .catch((e) => {
          if (e.statusCode === 404 || e.statusCode === 410) dead.add(s.endpoint);
          else console.error('[push] falha ao enviar:', e.statusCode || e.message);
        })
    )
  );
  if (dead.size) await setKv(subsKey(user), subs.filter((s) => !dead.has(s.endpoint)));
  return sent;
}

/** Compara antes × depois e avisa vendas e recebimentos novos. */
export function changes(before, after) {
  const clients = new Map(after.clients.map((c) => [c.id, c.name]));
  const oldSales = new Map(before.sales.map((s) => [s.id, s]));
  const msgs = [];
  for (const s of after.sales) {
    const old = oldSales.get(s.id);
    const who = clients.get(s.clientId) || 'Cliente';
    if (!old) {
      if (s.status === 'cancelado') continue;
      const total = computeSale(s).total;
      msgs.push({
        title: `💰 Venda registrada! ${money(total)}`,
        body: `${who} · ${s.planName}${s.qty > 1 ? ` · ${s.qty} vídeos` : ''}`,
        tag: `venda-${s.id}`,
      });
      continue;
    }
    const known = new Set(old.payments.map((p) => p.id));
    for (const p of s.payments) {
      if (known.has(p.id)) continue;
      const left = computeSale(s).balance;
      msgs.push({
        title: `✅ Recebido ${money(p.amount)}`,
        body: `${who} · ${p.method}${left ? ` · falta ${money(left)}` : ' · venda quitada'}`,
        tag: `pagamento-${p.id}`,
      });
    }
  }
  // restaurar um backup não dispara uma avalanche de avisos
  if (msgs.length > 5) return [{ title: 'Nozyx', body: `${msgs.length} lançamentos novos no painel.`, tag: 'lote' }];
  return msgs;
}
