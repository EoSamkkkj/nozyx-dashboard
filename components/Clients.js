'use client';

import { useMemo, useState } from 'react';
import { brDate, clientTotals, computeSale, money, uid } from '@/lib/model';
import { Field, FinChip, Icon, Modal, StatusChip } from './ui';

export default function Clients({ data, commit, newSale, openSale }) {
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null); // cliente em edição ({} = novo)
  const [viewId, setViewId] = useState(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.clients
      .filter((c) => !term || c.name.toLowerCase().includes(term) || c.contact.toLowerCase().includes(term))
      .map((c) => ({ c, t: clientTotals(data, c.id) }))
      .sort((a, b) => b.t.sold - a.t.sold || a.c.name.localeCompare(b.c.name));
  }, [data, q]);

  const view = viewId && data.clients.find((c) => c.id === viewId);

  return (
    <>
      <div className="spread" style={{ marginBottom: 14 }}>
        <input type="search" placeholder="Buscar cliente…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 360 }} />
        <button className="btn" onClick={() => setEdit({})}><Icon name="plus" size={16} /> Novo cliente</button>
      </div>

      {!data.clients.length ? (
        <div className="card empty">
          <div className="big"><Icon name="clientes" size={26} /></div>
          <h2>Nenhum cliente ainda</h2>
          <p>Os clientes também podem ser cadastrados direto no formulário de nova venda.</p>
          <button className="btn primary" onClick={() => setEdit({})}><Icon name="plus" size={16} /> Cadastrar cliente</button>
        </div>
      ) : (
        <div className="card" style={{ padding: '14px 8px 4px' }}>
          <table className="table responsive">
            <thead><tr><th>Cliente</th><th className="num">Serviços</th><th className="num">Vendido</th><th className="num">Recebido</th><th className="num">Saldo</th></tr></thead>
            <tbody>
              {rows.map(({ c, t }) => (
                <tr key={c.id} className="click" onClick={() => setViewId(c.id)}>
                  <td><div className="strong">{c.name}</div>{c.contact && <div className="cell-sub">{c.contact}</div>}</td>
                  <td className="num">{t.count}</td>
                  <td className="num strong">{money(t.sold)}</td>
                  <td className="num">{money(t.received)}</td>
                  <td className="num" style={{ color: t.pending ? 'var(--warn)' : 'var(--faint)' }}>{money(t.pending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="list-cards" style={{ padding: '0 8px' }}>
            {rows.map(({ c, t }) => (
              <div key={c.id} className="item" onClick={() => setViewId(c.id)} style={{ cursor: 'pointer' }}>
                <div className="spread"><b>{c.name}</b><b>{money(t.sold)}</b></div>
                <div className="spread cell-sub">
                  <span>{t.count} serviço{t.count === 1 ? '' : 's'} · recebido {money(t.received)}</span>
                  {t.pending > 0 && <span style={{ color: 'var(--warn)' }}>falta {money(t.pending)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {edit && <ClientForm client={edit} commit={commit} onClose={() => setEdit(null)} />}
      {view && !edit && (
        <ClientView data={data} client={view} commit={commit} onClose={() => setViewId(null)}
          onEdit={() => setEdit(view)} newSale={newSale} openSale={openSale} />
      )}
    </>
  );
}

function ClientForm({ client, commit, onClose }) {
  const [f, setF] = useState({ name: client.name || '', contact: client.contact || '', notes: client.notes || '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (!f.name.trim()) return setError('Informe o nome do cliente.');
    const ok = await commit((d) => {
      const next = { id: client.id || uid(), name: f.name.trim(), contact: f.contact.trim(), notes: f.notes.trim() };
      const i = d.clients.findIndex((c) => c.id === next.id);
      if (i >= 0) d.clients[i] = next;
      else d.clients.push(next);
    }, client.id ? 'Cliente atualizado.' : 'Cliente cadastrado.');
    if (ok) onClose();
  }

  return (
    <Modal title={client.id ? 'Editar cliente' : 'Novo cliente'} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Nome" required><input value={f.name} onChange={set('name')} autoFocus /></Field>
        <Field label="Contato" hint="WhatsApp, e-mail ou @ (opcional)."><input value={f.contact} onChange={set('contact')} /></Field>
        <Field label="Observações"><textarea value={f.notes} onChange={set('notes')} rows={2} /></Field>
        {error && <p className="alert">{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary">Salvar</button>
        </div>
      </form>
    </Modal>
  );
}

function ClientView({ data, client, commit, onClose, onEdit, newSale, openSale }) {
  const t = clientTotals(data, client.id);
  const sales = data.sales.filter((s) => s.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date));

  const remove = async () => {
    if (sales.length) return alert(`${client.name} tem ${sales.length} venda(s). Exclua as vendas antes de excluir o cliente.`);
    if (!confirm(`Excluir o cliente ${client.name}?`)) return;
    if (await commit((d) => { d.clients = d.clients.filter((c) => c.id !== client.id); }, 'Cliente excluído.')) onClose();
  };

  return (
    <Modal wide title={client.name} sub={client.contact || undefined} onClose={onClose}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="stats3">
          <div className="stat"><div className="l">Total vendido</div><div className="v">{money(t.sold)}</div></div>
          <div className="stat"><div className="l">Recebido</div><div className="v" style={{ color: 'var(--ok)' }}>{money(t.received)}</div></div>
          <div className="stat"><div className="l">Saldo pendente</div><div className="v" style={{ color: t.pending ? 'var(--warn)' : undefined }}>{money(t.pending)}</div></div>
        </div>
        {client.notes && <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{client.notes}</p>}
        <div>
          <h3 style={{ marginBottom: 6 }}>Serviços contratados</h3>
          {!sales.length && <p className="faint">Nenhuma venda para este cliente.</p>}
          {sales.map((s) => {
            const c = computeSale(s);
            return (
              <div key={s.id} className="item spread" style={{ cursor: 'pointer' }} onClick={() => { onClose(); openSale(s.id); }}>
                <div>
                  <b>{s.description || s.planName}</b>
                  <div className="cell-sub">{brDate(s.date)} · {s.planName} · {s.qty} vídeo{s.qty > 1 ? 's' : ''}</div>
                </div>
                <div className="row">
                  <FinChip fin={c.fin} /><StatusChip status={s.status} />
                  <b style={{ minWidth: 90, textAlign: 'right' }}>{money(c.total)}</b>
                </div>
              </div>
            );
          })}
        </div>
        <div className="spread" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <button className="btn danger" onClick={remove}>Excluir cliente</button>
          <div className="row">
            <button className="btn" onClick={onEdit}>Editar</button>
            <button className="btn primary" onClick={() => { onClose(); newSale({ clientId: client.id }); }}><Icon name="plus" size={16} /> Nova venda</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
