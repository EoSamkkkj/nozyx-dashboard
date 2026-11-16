'use client';

import { useState } from 'react';
import { money, moneyInput, parseMoney, uid } from '@/lib/model';
import { Field, Icon, Modal, MoneyInput } from './ui';

export default function Plans({ data, commit }) {
  const [edit, setEdit] = useState(null);
  const used = (id) => data.sales.filter((s) => s.planId === id).length;

  return (
    <>
      <div className="spread" style={{ marginBottom: 14 }}>
        <p className="muted" style={{ maxWidth: 560 }}>
          O preço padrão preenche o formulário de venda. Mudar um preço aqui <b>não altera</b> as vendas já cadastradas: cada venda guarda o valor da época.
        </p>
        <button className="btn" onClick={() => setEdit({})}><Icon name="plus" size={16} /> Novo plano</button>
      </div>
      <div className="plans">
        {data.plans.map((p) => (
          <div key={p.id} className="card plan-card">
            <div className="spread"><h2>{p.name}</h2><span className="faint">{used(p.id)} venda{used(p.id) === 1 ? '' : 's'}</span></div>
            <div className="price">{p.price == null ? <span className="muted" style={{ fontSize: 15 }}>Preço não definido</span> : money(p.price)}</div>
            {p.description && <p className="muted" style={{ fontSize: 14 }}>{p.description}</p>}
            <button className={`btn sm${p.price == null ? ' primary' : ''}`} style={{ alignSelf: 'flex-start', marginTop: 'auto' }} onClick={() => setEdit(p)}>
              {p.price == null ? 'Definir preço' : 'Editar'}
            </button>
          </div>
        ))}
      </div>
      {edit && <PlanForm plan={edit} commit={commit} usedCount={edit.id ? used(edit.id) : 0} onClose={() => setEdit(null)} />}
    </>
  );
}

function PlanForm({ plan, commit, usedCount, onClose }) {
  const [f, setF] = useState({ name: plan.name || '', description: plan.description || '', price: moneyInput(plan.price ?? null) });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    const price = f.price.trim() ? parseMoney(f.price) : null;
    if (!f.name.trim()) return setError('Informe o nome do plano.');
    if (Number.isNaN(price)) return setError('Preço inválido. Use, por exemplo, 250 ou 250,50.');
    if (price != null && price < 0) return setError('O preço não pode ser negativo.');
    const ok = await commit((d) => {
      const next = { id: plan.id || uid(), name: f.name.trim(), description: f.description.trim(), price };
      const i = d.plans.findIndex((p) => p.id === next.id);
      if (i >= 0) d.plans[i] = next;
      else d.plans.push(next);
    }, 'Plano salvo.');
    if (ok) onClose();
  }

  const remove = async () => {
    const msg = usedCount
      ? `O plano ${plan.name} tem ${usedCount} venda(s). Elas continuam com o nome e o valor registrados. Excluir o plano?`
      : `Excluir o plano ${plan.name}?`;
    if (!confirm(msg)) return;
    if (await commit((d) => { d.plans = d.plans.filter((p) => p.id !== plan.id); }, 'Plano excluído.')) onClose();
  };

  return (
    <Modal title={plan.id ? `Editar ${plan.name}` : 'Novo plano'} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Nome" required><input value={f.name} onChange={set('name')} autoFocus={!plan.id} /></Field>
        <Field label="Preço padrão por vídeo" hint="Deixe em branco se ainda não definiu."><MoneyInput value={f.price} onChange={set('price')} autoFocus={Boolean(plan.id)} /></Field>
        <Field label="Descrição"><textarea value={f.description} onChange={set('description')} rows={2} placeholder="Ex.: até 20 segundos, 1 alteração" /></Field>
        {usedCount > 0 && <p className="alert info">As {usedCount} venda(s) deste plano mantêm o valor registrado na época.</p>}
        {error && <p className="alert">{error}</p>}
        <div className="spread">
          {plan.id ? <button type="button" className="btn danger" onClick={remove}>Excluir</button> : <span />}
          <div className="row">
            <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
            <button className="btn primary">Salvar</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
