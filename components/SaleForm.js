'use client';

import { useMemo, useState } from 'react';
import { CUSTOM, METHODS, STATUS, computeSale, money, moneyInput, parseMoney, todaySP, uid, validatePayment, validateSale } from '@/lib/model';
import { Field, Modal, MoneyInput } from './ui';

const NEW = '__novo';

export default function SaleForm({ data, commit, preset, onClose, openSale }) {
  const editing = preset.sale;
  const s0 = editing || {};
  const [f, setF] = useState(() => ({
    clientId: s0.clientId || preset.clientId || (data.clients.length ? '' : NEW),
    newClient: '',
    description: s0.description || '',
    date: s0.date || todaySP(),
    planId: editing ? s0.planId || '' : data.plans[0]?.id || '',
    qty: String(s0.qty || 1),
    mode: s0.mode || 'unit',
    unitPrice: editing ? moneyInput(s0.unitPrice) : moneyInput(data.plans[0]?.price ?? null),
    packageTotal: editing && s0.mode === 'package' ? moneyInput(s0.packageTotal) : '',
    addition: s0.addition ? moneyInput(s0.addition) : '',
    additionReason: s0.additionReason || '',
    discount: s0.discount ? moneyInput(s0.discount) : '',
    discountReason: s0.discountReason || '',
    status: s0.status || 'iniciar',
    notes: s0.notes || '',
    payAmount: '',
    payDate: todaySP(),
    payMethod: 'Pix',
  }));
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const pickPlan = (e) => {
    const planId = e.target.value;
    const plan = data.plans.find((p) => p.id === planId);
    setF((x) => ({ ...x, planId, unitPrice: plan && plan.price != null ? moneyInput(plan.price) : x.unitPrice }));
  };

  const plan = data.plans.find((p) => p.id === f.planId);
  // nome do plano congelado na venda: editar o plano depois não muda a venda
  const planName = f.planId ? plan?.name || s0.planName || CUSTOM : CUSTOM;

  const draft = useMemo(() => ({
    ...(editing || { payments: [] }),
    clientId: f.clientId === NEW ? (f.newClient.trim() ? NEW : '') : f.clientId,
    description: f.description.trim(),
    date: f.date,
    planId: f.planId || null,
    planName,
    qty: Number(f.qty),
    mode: f.mode,
    unitPrice: parseMoney(f.unitPrice),
    packageTotal: f.mode === 'package' ? parseMoney(f.packageTotal) : 0,
    addition: parseMoney(f.addition),
    additionReason: f.additionReason.trim(),
    discount: parseMoney(f.discount),
    discountReason: f.discountReason.trim(),
    status: f.status,
    notes: f.notes.trim(),
  }), [f, editing, planName]);

  const valid = !Number.isNaN(draft.unitPrice) && !Number.isNaN(draft.packageTotal) && !Number.isNaN(draft.addition) && !Number.isNaN(draft.discount);
  const calc = valid ? computeSale(draft) : null;

  async function save(e) {
    e.preventDefault();
    if (!Number.isInteger(draft.qty)) return setError('A quantidade de vídeos precisa ser um número inteiro.');
    const err = validateSale(draft);
    if (err) return setError(err);
    if (computeSale(draft).total === 0 && !confirm('Esta venda está com valor R$ 0,00. Cadastrar mesmo assim?')) return;
    const pay = !editing && f.payAmount.trim() ? parseMoney(f.payAmount) : 0;
    if (pay) {
      const perr = validatePayment(draft, pay, f.payDate);
      if (perr) return setError(perr);
    }
    setError('');
    const saleId = editing?.id || uid();
    const ok = await commit((d) => {
      let clientId = draft.clientId;
      if (clientId === NEW) {
        clientId = uid();
        d.clients.push({ id: clientId, name: f.newClient.trim(), contact: '', notes: '' });
      }
      const sale = { ...draft, id: saleId, clientId, createdAt: editing?.createdAt || new Date().toISOString() };
      if (pay) sale.payments = [{ id: uid(), amount: pay, date: f.payDate, method: f.payMethod, note: 'Entrada' }];
      const i = d.sales.findIndex((x) => x.id === saleId);
      if (i >= 0) d.sales[i] = sale;
      else d.sales.push(sale);
    }, editing ? 'Venda atualizada.' : 'Venda cadastrada.');
    if (ok) {
      onClose();
      if (!editing) openSale(saleId);
    }
  }

  const unitLabel = f.mode === 'package' ? 'Total do pacote' : Number(f.qty) > 1 ? 'Preço por vídeo' : 'Valor do serviço';

  return (
    <Modal title={editing ? 'Editar venda' : 'Nova venda'} sub="Campos com * são obrigatórios." onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <div className="grid2">
          <Field label="Cliente" required>
            <select value={f.clientId} onChange={set('clientId')} autoFocus={!editing}>
              <option value="" disabled>Escolha…</option>
              {[...data.clients].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value={NEW}>+ Cadastrar novo cliente</option>
            </select>
          </Field>
          {f.clientId === NEW ? (
            <Field label="Nome do novo cliente" required>
              <input value={f.newClient} onChange={set('newClient')} placeholder="Ex.: Loja Syprus" autoFocus />
            </Field>
          ) : (
            <Field label="Data da venda" required hint="Pode ser uma data antiga.">
              <input type="date" value={f.date} onChange={set('date')} max="2099-12-31" />
            </Field>
          )}
        </div>
        {f.clientId === NEW && (
          <Field label="Data da venda" required hint="Pode ser uma data antiga.">
            <input type="date" value={f.date} onChange={set('date')} />
          </Field>
        )}

        <div className="grid2">
          <Field label="Plano">
            <select value={f.planId} onChange={pickPlan}>
              {data.plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.price == null ? ' (sem preço)' : ` · ${money(p.price)}`}</option>
              ))}
              <option value="">{CUSTOM}</option>
            </select>
          </Field>
          <Field label="Quantidade de vídeos" required>
            <input type="number" min="1" step="1" value={f.qty} onChange={set('qty')} />
          </Field>
        </div>

        <Field label="Descrição do serviço" hint="Opcional. Ex.: Anúncio 9:16 de lançamento.">
          <input value={f.description} onChange={set('description')} placeholder={planName} />
        </Field>

        <div className="seg" role="tablist" style={{ alignSelf: 'flex-start' }}>
          <button type="button" className={f.mode === 'unit' ? 'on' : ''} onClick={() => setF((x) => ({ ...x, mode: 'unit' }))}>
            Preço por vídeo
          </button>
          <button type="button" className={f.mode === 'package' ? 'on' : ''} onClick={() => setF((x) => ({ ...x, mode: 'package', packageTotal: x.packageTotal || '' }))}>
            Pacote com valor fechado
          </button>
        </div>

        {f.mode === 'unit' ? (
          <Field label={unitLabel} required hint={plan?.price == null && f.planId ? 'Este plano ainda não tem preço padrão. Informe o valor ou defina em Planos e preços.' : 'Vem do plano, mas você pode mudar só para esta venda.'}>
            <MoneyInput value={f.unitPrice} onChange={set('unitPrice')} />
          </Field>
        ) : (
          <Field label="Total do pacote" required hint={`Valor negociado para os ${f.qty || 0} vídeos juntos. Não é multiplicado pela quantidade.`}>
            <MoneyInput value={f.packageTotal} onChange={set('packageTotal')} />
          </Field>
        )}

        <details className="more" open={Boolean(s0.addition || s0.discount || s0.notes || (editing && s0.status !== 'iniciar'))}>
          <summary>Acréscimo, desconto, status e observações</summary>
          <div className="stack">
            <p className="hint">Acréscimos e descontos valem sobre o total da venda, não por vídeo.</p>
            <div className="grid2">
              <Field label="Acréscimo (R$)"><MoneyInput value={f.addition} onChange={set('addition')} /></Field>
              <Field label="Motivo do acréscimo"><input value={f.additionReason} onChange={set('additionReason')} placeholder="Ex.: urgência" /></Field>
              <Field label="Desconto (R$)"><MoneyInput value={f.discount} onChange={set('discount')} /></Field>
              <Field label="Motivo do desconto"><input value={f.discountReason} onChange={set('discountReason')} placeholder="Ex.: cliente antigo" /></Field>
            </div>
            <Field label="Status do trabalho" hint="A data da venda não depende da entrega.">
              <select value={f.status} onChange={set('status')}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Observações"><textarea value={f.notes} onChange={set('notes')} rows={2} /></Field>
          </div>
        </details>

        {!editing && (
          <details className="more">
            <summary>Já recebeu algum valor? (entrada)</summary>
            <div className="grid3">
              <Field label="Valor recebido"><MoneyInput value={f.payAmount} onChange={set('payAmount')} /></Field>
              <Field label="Data do recebimento"><input type="date" value={f.payDate} onChange={set('payDate')} /></Field>
              <Field label="Forma">
                <select value={f.payMethod} onChange={set('payMethod')}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
              </Field>
            </div>
          </details>
        )}

        <div className="total-box">
          <div>
            <div className="faint">Valor final</div>
            <div className="hint">
              {f.mode === 'package' ? 'pacote' : `${f.qty || 0} × ${calc ? money(draft.unitPrice) : '—'}`}
              {calc && draft.addition ? ` + ${money(draft.addition)}` : ''}
              {calc && draft.discount ? ` − ${money(draft.discount)}` : ''}
            </div>
          </div>
          <div className="v">{calc ? money(calc.total) : '—'}</div>
        </div>

        {error && <p className="alert">{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary">{editing ? 'Salvar alterações' : 'Cadastrar venda'}</button>
        </div>
      </form>
    </Modal>
  );
}
