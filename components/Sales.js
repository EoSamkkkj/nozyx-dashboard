'use client';

import { useMemo, useState } from 'react';
import { FIN, STATUS, brDate, computeSale, money } from '@/lib/model';
import { FinChip, Icon, StatusChip } from './ui';

const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Sales({ data, newSale, openSale }) {
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [plan, setPlan] = useState('');
  const [fin, setFin] = useState('');
  const [status, setStatus] = useState('');

  const clients = useMemo(() => new Map(data.clients.map((c) => [c.id, c.name])), [data.clients]);
  const planNames = useMemo(() => [...new Set([...data.plans.map((p) => p.name), ...data.sales.map((s) => s.planName)])], [data]);

  const rows = useMemo(() => {
    const term = norm(q.trim());
    return data.sales
      .map((s) => ({ s, c: computeSale(s), client: clients.get(s.clientId) || '' }))
      .filter(({ s, c, client }) => {
        if (term && !norm(`${client} ${s.description} ${s.planName}`).includes(term)) return false;
        if (from && s.date < from) return false;
        if (to && s.date > to) return false;
        if (plan && s.planName !== plan) return false;
        if (fin === 'aberto' ? c.balance === 0 : fin && (c.cancelled || c.fin !== fin)) return false;
        if (status && s.status !== status) return false;
        return true;
      })
      .sort((x, y) => y.s.date.localeCompare(x.s.date) || (y.s.createdAt || '').localeCompare(x.s.createdAt || ''));
  }, [data.sales, clients, q, from, to, plan, fin, status]);

  if (!data.sales.length) {
    return (
      <div className="card empty">
        <div className="big"><Icon name="vendas" size={26} /></div>
        <h2>Nenhuma venda cadastrada</h2>
        <p>Comece lançando uma venda. Pode ser uma venda antiga, com a data em que ela aconteceu.</p>
        <button className="btn primary" onClick={() => newSale()}><Icon name="plus" size={16} /> Nova venda</button>
      </div>
    );
  }

  const filtered = q || from || to || plan || fin || status;
  const totals = rows.reduce((t, { c }) => ({ total: t.total + (c.cancelled ? 0 : c.total), received: t.received + c.received, balance: t.balance + c.balance }), { total: 0, received: 0, balance: 0 });

  return (
    <>
      <div className="toolbar">
        <input type="search" placeholder="Buscar cliente ou descrição…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plano">
          <option value="">Todos os planos</option>
          {planNames.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={fin} onChange={(e) => setFin(e.target.value)} aria-label="Situação financeira">
          <option value="">Toda situação</option>
          <option value="aberto">Com saldo em aberto</option>
          {Object.entries(FIN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status do trabalho">
          <option value="">Todo status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="De" title="De" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Até" title="Até" />
        </div>
      </div>

      <div className="spread" style={{ marginBottom: 10 }}>
        <span className="faint">
          {rows.length} venda{rows.length === 1 ? '' : 's'} · vendido {money(totals.total)} · recebido {money(totals.received)} · saldo {money(totals.balance)}
        </span>
        {filtered && (
          <button className="link-btn" onClick={() => { setQ(''); setFrom(''); setTo(''); setPlan(''); setFin(''); setStatus(''); }}>Limpar filtros</button>
        )}
      </div>

      <div className="card" style={{ padding: '14px 8px 4px' }}>
        {!rows.length && <p className="faint" style={{ padding: '10px 12px 14px' }}>Nenhuma venda com esses filtros.</p>}
        {rows.length > 0 && (
          <table className="table responsive">
            <thead>
              <tr><th>Data</th><th>Cliente / serviço</th><th>Plano</th><th className="num">Valor</th><th className="num">Recebido</th><th className="num">Saldo</th><th>Situação</th><th>Trabalho</th></tr>
            </thead>
            <tbody>
              {rows.map(({ s, c, client }) => (
                <tr key={s.id} className="click" onClick={() => openSale(s.id)}>
                  <td style={{ whiteSpace: 'nowrap' }}>{brDate(s.date)}</td>
                  <td><div className="strong">{client}</div><div className="cell-sub">{s.description || `${s.qty} vídeo${s.qty > 1 ? 's' : ''}`}</div></td>
                  <td>{s.planName}</td>
                  <td className="num strong" style={c.cancelled ? { textDecoration: 'line-through', color: 'var(--faint)' } : undefined}>{money(c.total)}</td>
                  <td className="num">{money(c.received)}</td>
                  <td className="num" style={{ color: c.balance ? 'var(--warn)' : 'var(--faint)' }}>{money(c.balance)}</td>
                  <td>{c.review ? <span className="chip warn">Revisar</span> : <FinChip fin={c.fin} />}</td>
                  <td><StatusChip status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="list-cards" style={{ padding: '0 8px' }}>
          {rows.map(({ s, c, client }) => (
            <div key={s.id} className="item" onClick={() => openSale(s.id)} style={{ cursor: 'pointer' }}>
              <div className="spread">
                <b>{client}</b>
                <b style={c.cancelled ? { textDecoration: 'line-through', color: 'var(--faint)' } : undefined}>{money(c.total)}</b>
              </div>
              <div className="spread cell-sub" style={{ margin: '2px 0 8px' }}>
                <span>{brDate(s.date)} · {s.description || s.planName}</span>
                {c.balance > 0 && <span style={{ color: 'var(--warn)' }}>falta {money(c.balance)}</span>}
              </div>
              <div className="row">{c.review ? <span className="chip warn">Revisar</span> : <FinChip fin={c.fin} />}<StatusChip status={s.status} /></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
