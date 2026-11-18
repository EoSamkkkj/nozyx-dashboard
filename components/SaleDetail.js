'use client';

import { useState } from 'react';
import { METHODS, STATUS, brDate, computeSale, money, parseMoney, todaySP, uid, validatePayment } from '@/lib/model';
import { Field, FinChip, Icon, Modal, MoneyInput, StatusChip } from './ui';
import Receipt from './Receipt';
import { whatsLink } from '@/lib/whats';

export default function SaleDetail({ data, sale, commit, onClose, editSale, notify }) {
  const [receipt, setReceipt] = useState(false);
  const c = computeSale(sale);
  const client = data.clients.find((x) => x.id === sale.clientId);
  const [p, setP] = useState({ amount: '', date: todaySP(), method: 'Pix', note: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setP((x) => ({ ...x, [k]: e.target.value }));

  const update = (mutate, msg) =>
    commit((d) => {
      const s = d.sales.find((x) => x.id === sale.id);
      if (s) mutate(s, d);
    }, msg);

  async function addPayment(e) {
    e.preventDefault();
    const amount = parseMoney(p.amount);
    const err = validatePayment(sale, amount, p.date);
    if (err) return setError(err);
    setError('');
    const ok = await update((s) => {
      s.payments.push({ id: uid(), amount, date: p.date, method: p.method, note: p.note.trim() });
      s.payments.sort((a, b) => a.date.localeCompare(b.date));
    }, `Recebimento de ${money(amount)} registrado.`);
    if (ok) setP({ amount: '', date: todaySP(), method: p.method, note: '' });
  }

  const removePayment = (pay) => {
    if (!confirm(`Apagar o recebimento de ${money(pay.amount)} do dia ${brDate(pay.date)}?`)) return;
    update((s) => { s.payments = s.payments.filter((x) => x.id !== pay.id); }, 'Recebimento apagado.');
  };

  const changeStatus = (e) => {
    const status = e.target.value;
    if (status === 'cancelado' && c.received > 0 && !confirm(`Esta venda tem ${money(c.received)} recebidos. Ela vai sair do total vendido, mas o dinheiro continua registrado e a venda fica marcada para revisão. Continuar?`)) return;
    update((s) => { s.status = status; }, 'Status atualizado.');
  };

  const removeSale = async () => {
    const extra = sale.payments.length ? ` Os ${sale.payments.length} recebimento(s) dela (${money(c.received)}) também serão apagados.` : '';
    if (!confirm(`Excluir esta venda de ${money(c.total)} para ${client?.name}?${extra} Isso não pode ser desfeito.`)) return;
    const ok = await commit((d) => { d.sales = d.sales.filter((x) => x.id !== sale.id); }, 'Venda excluída.');
    if (ok) onClose();
  };

  const first = (client?.name || '').split(' ')[0];
  const charge = !c.cancelled && c.balance > 0 && whatsLink(client?.contact,
    `Oi, ${first}! Tudo bem? Passando para lembrar do restante do ${sale.description || sale.planName} (${brDate(sale.date)}): falta ${money(c.balance)} de ${money(c.total)}. Pode ser no Pix. Obrigado! 🙏`);

  const fill = () => setP((x) => ({ ...x, amount: (c.balance / 100).toFixed(2).replace('.', ',') }));

  return (
    <Modal wide title={sale.description || sale.planName} sub={`${client?.name} · vendido em ${brDate(sale.date)}`} onClose={onClose}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="row">
          <FinChip fin={c.fin} />
          <StatusChip status={sale.status} />
          <span className="chip">{sale.planName}</span>
          <span className="chip">{sale.qty} vídeo{sale.qty > 1 ? 's' : ''}{sale.mode === 'package' ? ' · pacote' : ''}</span>
        </div>

        <div className="row">
          <button className="btn sm" onClick={() => setReceipt(true)}><Icon name="baixar" size={15} /> Recibo em imagem</button>
          {charge && <a className="btn sm whats" href={charge} target="_blank" rel="noreferrer">Cobrar no WhatsApp</a>}
          {!c.cancelled && c.balance > 0 && !charge && <span className="faint" style={{ fontSize: 12.5 }}>Cadastre o WhatsApp do cliente para cobrar com um toque.</span>}
        </div>

        {c.review && (
          <p className="alert warn">Venda cancelada com {money(c.received)} recebidos. Revise: devolva o valor (apague o recebimento) ou reative a venda.</p>
        )}

        <div className="stats3">
          <div className="stat"><div className="l">Valor da venda</div><div className="v">{money(c.cancelled ? 0 : c.total)}</div></div>
          <div className="stat"><div className="l">Recebido</div><div className="v" style={{ color: 'var(--ok)' }}>{money(c.received)}</div></div>
          <div className="stat"><div className="l">Saldo pendente</div><div className="v" style={{ color: c.balance ? 'var(--warn)' : undefined }}>{money(c.balance)}</div></div>
        </div>

        <div className="card flat" style={{ padding: 16 }}>
          <div className="faint" style={{ marginBottom: 6 }}>Como o valor foi calculado</div>
          <div style={{ fontSize: 14 }}>
            {sale.mode === 'package' ? `Pacote de ${sale.qty} vídeos: ${money(sale.packageTotal)}` : `${sale.qty} × ${money(sale.unitPrice)} = ${money(c.base)}`}
            {sale.addition > 0 && <> · + {money(sale.addition)}{sale.additionReason && ` (${sale.additionReason})`}</>}
            {sale.discount > 0 && <> · − {money(sale.discount)}{sale.discountReason && ` (${sale.discountReason})`}</>}
            {' '}= <b>{money(c.total)}</b>
          </div>
          {sale.notes && <p className="muted" style={{ marginTop: 8, fontSize: 14, whiteSpace: 'pre-wrap' }}>{sale.notes}</p>}
        </div>

        <div>
          <div className="spread" style={{ marginBottom: 8 }}>
            <h3>Recebimentos</h3>
            <span className="faint">{sale.payments.length || 'Nenhum'} registrado{sale.payments.length === 1 ? '' : 's'}</span>
          </div>
          {sale.payments.map((pay) => (
            <div key={pay.id} className="item spread">
              <div>
                <b>{money(pay.amount)}</b> <span className="muted">· {pay.method}</span>
                <div className="cell-sub">{brDate(pay.date)}{pay.note && ` · ${pay.note}`}</div>
              </div>
              <button className="btn sm ghost" onClick={() => removePayment(pay)}>Apagar</button>
            </div>
          ))}
        </div>

        {!c.cancelled && c.balance > 0 && (
          <form className="card flat stack" style={{ padding: 16 }} onSubmit={addPayment}>
            <div className="spread">
              <h3>Registrar recebimento</h3>
              <button type="button" className="link-btn" onClick={fill}>Preencher saldo ({money(c.balance)})</button>
            </div>
            <div className="grid3">
              <Field label="Valor" required><MoneyInput value={p.amount} onChange={set('amount')} /></Field>
              <Field label="Data em que entrou" required><input type="date" value={p.date} onChange={set('date')} /></Field>
              <Field label="Forma">
                <select value={p.method} onChange={set('method')}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
              </Field>
            </div>
            <Field label="Observação"><input value={p.note} onChange={set('note')} placeholder="Opcional" /></Field>
            {error && <p className="alert">{error}</p>}
            <button className="btn primary" style={{ alignSelf: 'flex-start' }}>Registrar recebimento</button>
          </form>
        )}

        <div className="spread" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <label className="field" style={{ minWidth: 200 }}>
            <span>Status do trabalho</span>
            <select value={sale.status} onChange={changeStatus}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="row">
            <button className="btn danger" onClick={removeSale}>Excluir venda</button>
            <button className="btn" onClick={() => { onClose(); editSale(sale); }}>Editar venda</button>
          </div>
        </div>
      </div>
      {receipt && <Receipt sale={sale} client={client} name={data.settings.name} notify={notify} onClose={() => setReceipt(false)} />}
    </Modal>
  );
}
