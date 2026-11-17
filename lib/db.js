import { neon } from '@neondatabase/serverless';
import { emptyData, normalize } from './model';

// Banco Neon (Postgres), ligado pela integração da Vercel.
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const hasDatabase = Boolean(url);
const store = hasDatabase ? postgres(neon(url)) : memory();

export async function loadData(user) {
  const row = await store.get(user);
  return row ? normalize({ ...row.dados, rev: row.rev }) : emptyData();
}

/**
 * Salva só se ninguém salvou antes (mesma `rev`), para um celular não
 * apagar o que foi lançado no computador. Guarda as 30 versões anteriores.
 */
export async function saveData(user, rev, next) {
  const clean = { ...normalize(next), savedAt: new Date().toISOString() };
  delete clean.rev;
  const saved = await store.put(user, rev, clean);
  if (!saved) return { conflict: true, data: await loadData(user) };
  return { data: { ...clean, rev: rev + 1 } };
}

/** Configurações internas (chaves das notificações, aparelhos inscritos). */
export const getKv = (k) => store.getKv(k);
export const setKv = (k, v) => store.setKv(k, v);

function postgres(sql) {
  let ready;
  const setup = () =>
    (ready ||= (async () => {
      await sql`create table if not exists nozyx_kv (chave text primary key, valor jsonb not null)`;
      await sql`create table if not exists nozyx_dados (usuario text primary key, dados jsonb not null, rev integer not null, atualizado timestamptz not null default now())`;
      await sql`create table if not exists nozyx_copias (id bigserial primary key, usuario text not null, dados jsonb not null, rev integer not null, criado timestamptz not null default now())`;
    })().catch((e) => { ready = null; throw e; }));

  return {
    async getKv(k) {
      await setup();
      const [row] = await sql`select valor from nozyx_kv where chave = ${k}`;
      return row ? row.valor : null;
    },
    async setKv(k, v) {
      await setup();
      await sql`insert into nozyx_kv (chave, valor) values (${k}, ${JSON.stringify(v)}::jsonb) on conflict (chave) do update set valor = excluded.valor`;
    },
    async get(user) {
      await setup();
      const [row] = await sql`select dados, rev from nozyx_dados where usuario = ${user}`;
      return row || null;
    },
    async put(user, rev, dados) {
      await setup();
      if (rev === 0) {
        const r = await sql`insert into nozyx_dados (usuario, dados, rev) values (${user}, ${JSON.stringify(dados)}::jsonb, 1) on conflict (usuario) do nothing returning rev`;
        return r.length > 0;
      }
      const [old] = await sql`select dados, rev from nozyx_dados where usuario = ${user}`;
      if (!old || old.rev !== rev) return false;
      const r = await sql`update nozyx_dados set dados = ${JSON.stringify(dados)}::jsonb, rev = rev + 1, atualizado = now() where usuario = ${user} and rev = ${rev} returning rev`;
      if (!r.length) return false;
      await sql`insert into nozyx_copias (usuario, dados, rev) values (${user}, ${JSON.stringify(old.dados)}::jsonb, ${old.rev})`;
      await sql`delete from nozyx_copias where usuario = ${user} and id not in (select id from nozyx_copias where usuario = ${user} order by id desc limit 30)`;
      return true;
    },
  };
}

// Banco em memória só para testar no computador (sem banco configurado).
function memory() {
  const m = (globalThis.__nozyxMem ||= new Map());
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const kv = (globalThis.__nozyxKv ||= new Map());
  return {
    async getKv(k) { return kv.has(k) ? clone(kv.get(k)) : null; },
    async setKv(k, v) { kv.set(k, clone(v)); },
    async get(user) { return m.has(user) ? clone(m.get(user)) : null; },
    async put(user, rev, dados) {
      if ((m.get(user)?.rev ?? 0) !== rev) return false;
      m.set(user, { dados: clone(dados), rev: rev + 1 });
      return true;
    },
  };
}
