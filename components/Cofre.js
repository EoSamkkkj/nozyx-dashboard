'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES, PERIODS, brDate, cashSummary, money, parseMoney, periodRange, todaySP, uid } from '@/lib/model';
import { PlanBars } from './Charts';
import { CountUp } from './Intro';
import { Field, Icon, Modal, MoneyInput } from './ui';

const CAT_ICON = { 'Tráfego pago': '📣', Ferramentas: '🧰', Equipamento: '🎧', Freelancer: '🤝', Impostos: '🧾', Retirada: '👛', Reserva: '🐷', Outros: '📦' };
const OPTS = PERIODS.filter(([k]) => k !== 'custom');

/** Cofre: o que entrou, o que saiu (tráfego, ferramentas, retiradas) e o que sobrou. */
export default function Cofre({ data, commit, readOnly }) {
  const [period, setPeriod] = useState('mes');
  const [form, setForm] = useState(false);
  const today = todaySP();
  const [a, b] = periodRange(period, data, today);
  const c = useMemo(() => cashSummary(data, a, b), [data, a, b]);
  const pct = c.entrou ? Math.round((c.saiu / c.entrou) * 100) : 0;

  const remove = (x) => {
    if (!confirm(`Apagar a saída de ${money(x.amount)} (${x.category}) do dia ${brDate(x.date)}?`)) return;
    commit((d) => { d.expenses = d.expenses.filter((e) => e.id !== x.id); }, 'Saída apagada.');
  };

  return (
    <>
      <section className="cofre-hero">
        <div className="seg cofre-periods">
          {OPTS.map(([k, l]) => (
            <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{l}</button>
          ))}
        </div>
        <p className="cofre-label">Sobrou no caixa</p>
        <p className={`cofre-value${c.liquido < 0 ? ' neg' : ''}`}><CountUp value={c.liquido} /></p>
        <p className="cofre-sub">{a === b ? brDate(a) : `${brDate(a)} a ${brDate(b)}`}</p>
        <div className="cofre-stats">
          <div><span>⬇ Entrou</span><b className="in"><CountUp value={c.entrou} /></b></div>
          <div><span>⬆ Saiu</span><b className="out"><CountUp value={c.saiu} /></b></div>
          <div><span>Gasto</span><b>{pct}%</b></div>
        </div>
        {c.entrou > 0 && (
          <div className="cofre-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
        )}
      </section>

      {!readOnly && (
        <button className="btn primary block" style={{ marginBottom: 14 }} onClick={() => setForm(true)}>
          <Icon name="plus" size={16} /> Registrar saída
        </button>
      )}

      <div className="split" style={{ marginTop: 0 }}>
        <div className="card">
          <div className="card-title"><h2>Para onde foi o dinheiro</h2></div>
          {c.byCat.length ? <PlanBars rows={c.byCat} field="value" format={money} /> : <p className="faint">Nenhuma saída no período.</p>}
        </div>
        <div className="card">
          <div className="card-title"><h2>Saídas</h2><span className="faint">{c.list.length}</span></div>
          {c.list.length ? (
            <ul className="rank">
              {c.list.map((x) => (
                <li key={x.id}>
                  <span className="cat-ic">{CAT_ICON[x.category] || '📦'}</span>
                  <div className="grow"><b>{x.category}</b><span className="faint">{brDate(x.date)}{x.note && ` · ${x.note}`}</span></div>
                  <span className="v out">−{money(x.amount)}</span>
                  {!readOnly && <button className="x-mini" aria-label="Apagar saída" onClick={() => remove(x)}>×</button>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="faint">{readOnly ? 'Nenhuma saída registrada no período.' : 'Toque em “Registrar saída” quando tirar dinheiro para tráfego pago, ferramentas ou uma retirada.'}</p>
          )}
        </div>
      </div>
      <p className="faint foot-note">“Entrou” conta os pagamentos recebidos no período (não as vendas a receber). “Sobrou” = entrou − saiu.</p>

      {form && <ExpenseForm commit={commit} onClose={() => setForm(false)} />}
    </>
  );
}

function ExpenseForm({ commit, onClose }) {
  const [f, setF] = useState({ amount: '', category: 'Tráfego pago', date: todaySP(), note: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    const amount = parseMoney(f.amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) return setError('Informe o valor. Ex.: 200 ou 150,50.');
    if (!f.date) return setError('Escolha a data.');
    const ok = await commit((d) => {
      d.expenses = [{ id: uid(), amount, category: f.category, date: f.date, note: f.note.trim() }, ...(d.expenses || [])];
    }, `Saída de ${money(amount)} registrada.`);
    if (ok) onClose();
  }

  return (
    <Modal title="Registrar saída" sub="Dinheiro que saiu do caixa da Nozyx" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Valor" required><MoneyInput value={f.amount} onChange={set('amount')} autoFocus /></Field>
        <div className="field">
          <span>Para quê</span>
          <div className="chips-pick">
            {CATEGORIES.map((k) => (
              <button type="button" key={k} className={f.category === k ? 'on' : ''} onClick={() => setF((x) => ({ ...x, category: k }))}>{CAT_ICON[k]} {k}</button>
            ))}
          </div>
        </div>
        <div className="grid2">
          <Field label="Data" required><input type="date" value={f.date} onChange={set('date')} /></Field>
          <Field label="Observação"><input value={f.note} onChange={set('note')} placeholder="Ex.: campanha Instagram" /></Field>
        </div>
        {error && <p className="alert">{error}</p>}
        <button className="btn primary">Registrar saída</button>
      </form>
    </Modal>
  );
}
