'use client';

import { useEffect, useRef, useState } from 'react';
import { money, moneyInput, normalize, parseMoney, paymentsCsv, salesCsv, todaySP } from '@/lib/model';
import { Field, Icon } from './ui';
import AppSetup from './AppSetup';
import Security from './Security';

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Settings({ data, commit, notify, storage, readOnly }) {
  const s = data.settings;
  const [f, setF] = useState({ name: s.name, accent: s.accent, goal: s.monthlyGoal ? moneyInput(s.monthlyGoal) : '', daily: s.dailyGoal ? moneyInput(s.dailyGoal) : '' });
  const [error, setError] = useState('');
  const file = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const day = todaySP();

  async function save(e) {
    e.preventDefault();
    const goal = parseMoney(f.goal);
    const daily = parseMoney(f.daily);
    if (Number.isNaN(goal) || goal < 0 || Number.isNaN(daily) || daily < 0) return setError('Meta inválida. Use, por exemplo, 3000 ou 3.000,00.');
    setError('');
    await commit((d) => {
      d.settings = { name: f.name.trim() || 'Nozyx', accent: f.accent, monthlyGoal: goal, dailyGoal: daily };
    }, 'Configurações salvas.');
  }

  async function restore(e) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    let parsed;
    try {
      parsed = JSON.parse(await picked.text());
    } catch {
      return notify('Esse arquivo não é um backup válido.');
    }
    const clean = normalize(parsed);
    if (!confirm(`Restaurar o backup "${picked.name}"? Ele tem ${clean.sales.length} venda(s) e ${clean.clients.length} cliente(s) e vai SUBSTITUIR todos os dados atuais. (Os dados atuais ficam guardados no histórico do banco.)`)) return;
    await commit((d) => {
      Object.assign(d, { ...clean, rev: d.rev });
    }, 'Backup restaurado.');
  }

  if (readOnly) {
    return (
      <div className="stack" style={{ gap: 14, maxWidth: 760 }}>
        <div className="card stack">
          <h2>Acesso só para visualizar 👀</h2>
          <p className="muted" style={{ fontSize: 14 }}>Você acompanha as vendas e recebe os avisos, mas não pode cadastrar nem mudar nada. Os números se atualizam sozinhos (ou puxe a tela para baixo).</p>
        </div>
        <AppSetup notify={notify} />
        <Security notify={notify} />
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 14, maxWidth: 760 }}>
      <AppSetup notify={notify} />
      <Security notify={notify} />
      <ViewerAccess notify={notify} />
      <form className="card stack" onSubmit={save}>
        <h2>Painel</h2>
        <div className="grid2">
          <Field label="Nome da agência"><input value={f.name} onChange={set('name')} /></Field>
          <Field label="Meta mensal de vendas" hint={s.monthlyGoal ? `Atual: ${money(s.monthlyGoal)}` : 'Deixe vazio para não usar meta.'}>
            <input inputMode="decimal" placeholder="Ex.: 3.000" value={f.goal} onChange={set('goal')} />
          </Field>
          <Field label="Meta do dia" hint={s.dailyGoal ? `Atual: ${money(s.dailyGoal)}` : 'Aparece no painel azul em "Hoje". Vazio = sem meta.'}>
            <input inputMode="decimal" placeholder="Ex.: 150" value={f.daily} onChange={set('daily')} />
          </Field>
        </div>
        <Field label="Cor de destaque">
          <div className="row">
            <input type="color" value={f.accent} onChange={set('accent')} />
            <button type="button" className="btn sm ghost" onClick={() => setF((x) => ({ ...x, accent: '#4A98FF' }))}>Azul Nozyx</button>
          </div>
        </Field>
        {error && <p className="alert">{error}</p>}
        <button className="btn primary" style={{ alignSelf: 'flex-start' }}>Salvar</button>
      </form>

      <div className="card stack">
        <h2>Exportar</h2>
        <p className="muted" style={{ fontSize: 14 }}>Planilhas CSV que abrem direto no Excel ou no Google Planilhas.</p>
        <div className="row">
          <button className="btn" onClick={() => download(`vendas-${day}.csv`, salesCsv(data), 'text/csv;charset=utf-8')}><Icon name="baixar" size={16} /> Vendas (CSV)</button>
          <button className="btn" onClick={() => download(`recebimentos-${day}.csv`, paymentsCsv(data), 'text/csv;charset=utf-8')}><Icon name="baixar" size={16} /> Recebimentos (CSV)</button>
        </div>
      </div>

      <div className="card stack">
        <h2>Backup</h2>
        <p className="muted" style={{ fontSize: 14 }}>Um arquivo com tudo (planos, clientes, vendas e recebimentos). Guarde de vez em quando no seu Drive. Para voltar a um backup, use “Restaurar”.</p>
        <div className="row">
          <button className="btn" onClick={() => download(`backup-${data.settings.name.toLowerCase().replace(/\W+/g, '-')}-${day}.json`, JSON.stringify(data, null, 2), 'application/json')}>
            <Icon name="baixar" size={16} /> Baixar backup
          </button>
          <button className="btn" onClick={() => file.current?.click()}><Icon name="subir" size={16} /> Restaurar backup</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={restore} />
        </div>
      </div>

      <div className="card stack">
        <h2>Armazenamento</h2>
        {storage === 'banco' ? (
          <p className="muted" style={{ fontSize: 14 }}>Os dados ficam salvos no banco online (Neon Postgres), protegidos pela sua senha. Dá para acessar de qualquer aparelho. O banco guarda também as 30 últimas versões, como segurança.</p>
        ) : (
          <p className="alert warn">Banco não configurado: este é o modo de teste e os dados somem quando o servidor reinicia.</p>
        )}
      </div>
    </div>
  );
}

/** O dono cria uma senha "só visualizar" para outra pessoa acompanhar as vendas. */
function ViewerAccess({ notify }) {
  const [info, setInfo] = useState(null);
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = () => fetch('/api/viewer').then((r) => r.json()).then(setInfo).catch(() => {});
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch('/api/viewer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ senha: pass }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(j.error || 'Não deu para salvar.');
    setError('');
    setPass('');
    notify(info?.active ? 'Senha trocada. Quem usava a antiga precisa entrar de novo.' : 'Acesso criado. Passe a senha para quem vai acompanhar.');
    load();
  }

  async function remove() {
    if (!confirm('Remover o acesso só visualizar? Quem estiver usando sai na hora.')) return;
    await fetch('/api/viewer', { method: 'DELETE' });
    notify('Acesso removido.');
    load();
  }

  return (
    <form className="card stack" onSubmit={save}>
      <div className="spread">
        <h2>Acesso só visualizar</h2>
        {info?.active && <span className="chip ok">Ativo</span>}
      </div>
      <p className="muted" style={{ fontSize: 14 }}>
        Uma segunda senha para outra pessoa acompanhar as vendas pelo app: ela vê o painel e as vendas e recebe as notificações, mas não pode cadastrar, editar nem apagar nada.
      </p>
      <Field label={info?.active ? 'Nova senha (troca a atual)' : 'Senha de visualização'} hint="Pelo menos 6 caracteres, diferente da sua senha.">
        <input className="secret" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} />
      </Field>
      {error && <p className="alert">{error}</p>}
      <div className="row">
        <button className="btn primary" disabled={busy || pass.length < 6}>{busy ? 'Salvando…' : info?.active ? 'Trocar senha' : 'Criar acesso'}</button>
        {info?.active && <button type="button" className="btn ghost" onClick={remove}>Remover acesso</button>}
      </div>
    </form>
  );
}
