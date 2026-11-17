'use client';

import { useRef, useState } from 'react';
import { money, moneyInput, normalize, parseMoney, paymentsCsv, salesCsv, todaySP } from '@/lib/model';
import { Field, Icon } from './ui';
import AppSetup from './AppSetup';

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Settings({ data, commit, notify, storage }) {
  const s = data.settings;
  const [f, setF] = useState({ name: s.name, accent: s.accent, goal: s.monthlyGoal ? moneyInput(s.monthlyGoal) : '' });
  const [error, setError] = useState('');
  const file = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const day = todaySP();

  async function save(e) {
    e.preventDefault();
    const goal = parseMoney(f.goal);
    if (Number.isNaN(goal) || goal < 0) return setError('Meta inválida. Use, por exemplo, 3000 ou 3.000,00.');
    setError('');
    await commit((d) => {
      d.settings = { name: f.name.trim() || 'Nozyx', accent: f.accent, monthlyGoal: goal };
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

  return (
    <div className="stack" style={{ gap: 14, maxWidth: 760 }}>
      <AppSetup notify={notify} />
      <form className="card stack" onSubmit={save}>
        <h2>Painel</h2>
        <div className="grid2">
          <Field label="Nome da agência"><input value={f.name} onChange={set('name')} /></Field>
          <Field label="Meta mensal de vendas" hint={s.monthlyGoal ? `Atual: ${money(s.monthlyGoal)}` : 'Deixe vazio para não usar meta.'}>
            <input inputMode="decimal" placeholder="Ex.: 3.000" value={f.goal} onChange={set('goal')} />
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
