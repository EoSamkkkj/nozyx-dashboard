'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES, PERIODS, brDate, cashSummary, money, parseMoney, parseStatement, periodRange, todaySP, uid } from '@/lib/model';
import { PlanBars } from './Charts';
import { CountUp } from './Intro';
import { Field, Icon, Modal, MoneyInput } from './ui';

const CAT_ICON = { 'Tráfego pago': '📣', Ferramentas: '🧰', Equipamento: '🎧', Freelancer: '🤝', Impostos: '🧾', 'Alimentação': '🛒', Transporte: '⛽', Pet: '🐾', 'Pix para pessoas': '💸', Retirada: '👛', Reserva: '🐷', Outros: '📦' };
const OPTS = PERIODS.filter(([k]) => k !== 'custom');

/** Cofre: o que entrou, o que saiu (tráfego, ferramentas, retiradas) e o que sobrou. */
export default function Cofre({ data, commit, readOnly }) {
  const [period, setPeriod] = useState('mes');
  const [form, setForm] = useState(false);
  const [paste, setPaste] = useState(false);
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
        <div className="cofre-actions">
          <button className="btn primary" onClick={() => setForm(true)}><Icon name="plus" size={16} /> Registrar saída</button>
          <button className="btn" onClick={() => setPaste(true)}><Icon name="subir" size={16} /> Colar extrato</button>
        </div>
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
      {paste && <PasteForm data={data} commit={commit} onClose={() => setPaste(false)} />}
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
    <Modal title="Registrar saída" sub="Todo gasto que saiu da conta" onClose={onClose}>
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

/** Fim do mês: cola a lista do banco, o app separa as linhas e sugere a categoria de cada uma. */
function PasteForm({ data, commit, onClose }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState(todaySP());
  const [error, setError] = useState('');

  const read = (value) => {
    setText(value);
    const seen = new Set((data.expenses || []).filter((x) => x.date.slice(0, 7) === date.slice(0, 7)).map((x) => `${x.note}|${x.amount}`));
    setRows(parseStatement(value).map((r) => {
      const dup = seen.has(`${r.name}|${r.amount}`);
      return { ...r, on: !dup, dup };
    }));
  };
  const upd = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.on);
  const total = chosen.reduce((t, r) => t + r.amount, 0);

  async function save() {
    if (!chosen.length) return setError('Nenhuma linha marcada.');
    if (!date) return setError('Escolha a data.');
    const ok = await commit((d) => {
      d.expenses = [...chosen.map((r) => ({ id: uid(), amount: r.amount, category: r.category, date, note: r.name })), ...(d.expenses || [])];
    }, `${chosen.length} saída${chosen.length === 1 ? '' : 's'} lançada${chosen.length === 1 ? '' : 's'}: ${money(total)}.`);
    if (ok) onClose();
  }

  return (
    <Modal wide title="Colar extrato" sub="Cole a lista de gastos do mês: uma linha por gasto, com o nome e o valor" onClose={onClose}>
      <div className="stack">
        <textarea rows={rows.length ? 3 : 8} value={text} onChange={(e) => read(e.target.value)} placeholder={'Facebook — R$ 339,22' + String.fromCharCode(10) + 'Claude AI — R$ 113,85' + String.fromCharCode(10) + 'Supermercado — R$ 20,00'} />
        {rows.length > 0 && (
          <>
            <div className="spread">
              <b>{rows.length} linha{rows.length === 1 ? '' : 's'} encontrada{rows.length === 1 ? '' : 's'}</b>
              <span className="faint">confira a categoria de cada uma</span>
            </div>
            <ul className="paste-list">
              {rows.map((r, i) => (
                <li key={i} className={r.on ? '' : 'off'}>
                  <input type="checkbox" checked={r.on} onChange={(e) => upd(i, { on: e.target.checked })} aria-label={`Lançar ${r.name}`} />
                  <div className="grow">
                    <b>{r.name}</b>
                    {r.dup && <span className="faint">já lançado neste mês</span>}
                    <select value={r.category} onChange={(e) => upd(i, { category: e.target.value })}>
                      {CATEGORIES.map((k) => <option key={k} value={k}>{CAT_ICON[k]} {k}</option>)}
                    </select>
                  </div>
                  <span className="v out">−{money(r.amount)}</span>
                </li>
              ))}
            </ul>
            <Field label="Data dos lançamentos" hint="O extrato não traz o dia de cada gasto: use uma data do mês (ex.: o último dia).">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </>
        )}
        {error && <p className="alert">{error}</p>}
        <button className="btn primary" onClick={save} disabled={!chosen.length}>
          {chosen.length ? `Lançar ${chosen.length} saída${chosen.length === 1 ? '' : 's'} · ${money(total)}` : 'Cole o extrato acima'}
        </button>
      </div>
    </Modal>
  );
}
