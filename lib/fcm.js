import crypto from 'crypto';
import { getKv, setKv } from './db';

// Notificações do app Android nativo, pelo Firebase Cloud Messaging (FCM v1).
// A chave da conta de serviço fica na variável FIREBASE_SERVICE_ACCOUNT da Vercel (o JSON inteiro).

let cached = { token: '', exp: 0 };

function account() {
  try {
    const j = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
    return j?.private_key && j?.client_email ? j : null;
  } catch {
    return null;
  }
}

export const fcmReady = () => Boolean(account());

const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

async function accessToken(sa) {
  if (cached.token && cached.exp > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'RS256', typ: 'JWT' });
  const claim = b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${claim}`), sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`token FCM: ${j.error_description || j.error}`);
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cached.token;
}

const key = (user) => `fcm:${user}`;
const list = async (user) => (await getKv(key(user))) || [];

export async function fcmSubscribe(user, token, device) {
  if (!token || typeof token !== 'string') throw new Error('Token inválido.');
  const all = (await list(user)).filter((t) => t.token !== token);
  all.push({ token, device: String(device || '').slice(0, 80), since: new Date().toISOString() });
  await setKv(key(user), all.slice(-20));
  return all.length;
}

export async function fcmUnsubscribe(user, token) {
  await setKv(key(user), (await list(user)).filter((t) => t.token !== token));
}

export const fcmCount = async (user) => (await list(user)).length;

export async function fcmNotify(user, msg) {
  const sa = account();
  const tokens = await list(user);
  if (!sa || !tokens.length) return 0;
  const auth = await accessToken(sa);
  const dead = new Set();
  let sent = 0;
  await Promise.all(
    tokens.map(async ({ token }) => {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: 'POST',
        headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: msg.title, body: msg.body },
            data: { url: msg.url || '/', sound: msg.sound || 'venda' },
            android: {
              priority: 'HIGH',
              ttl: '86400s',
              notification: { channel_id: msg.sound === 'recorde' ? 'recorde' : 'vendas_som', icon: 'ic_stat_nozyx', color: '#4A98FF', tag: msg.tag || undefined, sound: msg.sound || 'venda', default_vibrate_timings: true },
            },
          },
        }),
      }).catch(() => null);
      if (r?.ok) sent += 1;
      else if (r && (r.status === 404 || r.status === 400)) dead.add(token);
      else console.error('[fcm] falha ao enviar:', r?.status);
    })
  );
  if (dead.size) await setKv(key(user), tokens.filter((t) => !dead.has(t.token)));
  return sent;
}
