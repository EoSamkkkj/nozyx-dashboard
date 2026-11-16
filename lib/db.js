import { Redis } from '@upstash/redis';
import { emptyData, normalize } from './model';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasRedis = Boolean(url && token);
const db = hasRedis ? new Redis({ url, token }) : memory();

const key = (user) => `nozyx:dados:${user}`;
const backups = (user) => `nozyx:copias:${user}`;

export async function loadData(user) {
  const raw = await db.get(key(user));
  return raw ? normalize(raw) : emptyData();
}

/**
 * Salva só se ninguém salvou antes (mesma `rev`), para um celular não
 * apagar o que foi lançado no computador. Guarda as 30 versões anteriores.
 */
export async function saveData(user, rev, next) {
  const current = await loadData(user);
  if (current.rev !== rev) return { conflict: true, data: current };
  const clean = { ...normalize(next), rev: current.rev + 1, savedAt: new Date().toISOString() };
  if (current.rev > 0) {
    await db.lpush(backups(user), current);
    await db.ltrim(backups(user), 0, 29);
  }
  await db.set(key(user), clean);
  return { data: clean };
}

// Banco em memória só para testar no computador (sem Redis configurado).
function memory() {
  const m = (globalThis.__nozyxMem ||= new Map());
  const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
  return {
    async get(k) { return m.has(k) ? clone(m.get(k)) : null; },
    async set(k, v) { m.set(k, clone(v)); return 'OK'; },
    async lpush(k, v) { if (!m.has(k)) m.set(k, []); return m.get(k).unshift(clone(v)); },
    async ltrim(k, a, b) { if (m.has(k)) m.set(k, m.get(k).slice(a, b + 1)); return 'OK'; },
  };
}
