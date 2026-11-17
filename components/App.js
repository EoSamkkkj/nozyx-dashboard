'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logout } from '@/app/actions';
import Logo from './Logo';
import { Icon } from './ui';
import Overview from './Overview';
import Sales from './Sales';
import Clients from './Clients';
import Plans from './Plans';
import Settings from './Settings';
import SaleForm from './SaleForm';
import SaleDetail from './SaleDetail';
import { useAppShell } from './AppSetup';
import LockScreen, { useLock } from './Lock';

const TABS = [
  ['geral', 'Visão geral', 'Visão geral'],
  ['vendas', 'Vendas', 'Vendas'],
  ['clientes', 'Clientes', 'Clientes'],
  ['planos', 'Planos e preços', 'Planos'],
  ['config', 'Configurações', 'Ajustes'],
];

export default function App({ initial, storage }) {
  const [data, setData] = useState(initial);
  const dataRef = useRef(initial);
  const [tab, setTab] = useState('geral');
  const [form, setForm] = useState(null); // { sale?, clientId? }
  const [detailId, setDetailId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  useAppShell();
  const [locked, unlock] = useLock();

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      if (TABS.some(([k]) => k === h)) setTab(h);
    };
    read();
    window.addEventListener('hashchange', read); // toque na notificação abre a aba certa
    return () => window.removeEventListener('hashchange', read);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  const go = (k) => {
    setTab(k);
    history.replaceState(null, '', `#${k}`);
    window.scrollTo(0, 0);
  };

  const apply = (next) => {
    dataRef.current = next;
    setData(next);
  };

  /** Aplica a mudança na tela na hora e salva no banco; desfaz se falhar. */
  const commit = useCallback(async (mutate, msg) => {
    const prev = dataRef.current;
    const next = structuredClone(prev);
    mutate(next);
    apply(next);
    setSaving(true);
    try {
      const r = await fetch('/api/data', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rev: prev.rev, data: next }),
      });
      if (r.status === 401) {
        window.location.href = '/login';
        return false;
      }
      const j = await r.json();
      if (!r.ok) {
        if (r.status === 409 && j.data) {
          apply(j.data);
          setToast('Os dados foram alterados em outro aparelho. Carreguei a versão mais nova: refaça a última ação.');
        } else {
          apply(prev);
          setToast(j.error || 'Não consegui salvar. Tente de novo.');
        }
        return false;
      }
      apply(j.data);
      if (msg) setToast(msg);
      return true;
    } catch {
      apply(prev);
      setToast('Sem conexão: nada foi salvo. Tente de novo.');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const ctx = {
    data,
    commit,
    notify: setToast,
    go,
    newSale: (preset = {}) => setForm(preset),
    editSale: (sale) => setForm({ sale }),
    openSale: (id) => setDetailId(id),
  };

  const detail = detailId && data.sales.find((s) => s.id === detailId);
  const name = data.settings.name;
  const title = TABS.find(([k]) => k === tab)[1];

  return (
    <div style={{ '--accent': data.settings.accent }}>
      <div className="mobile-bar">
        <div className="brand" style={{ padding: 0 }}>
          <Logo size={24} /> {name}
        </div>
        {saving && <span className="saving">Salvando…</span>}
      </div>

      <div className="shell">
        <aside className="side">
          <div className="brand">
            <Logo size={30} />
            <div>
              {name}
              <small>Painel financeiro</small>
            </div>
          </div>
          <button className="btn primary block" style={{ marginBottom: 12 }} onClick={() => ctx.newSale()}>
            <Icon name="plus" size={16} /> Nova venda
          </button>
          {TABS.map(([k, label]) => (
            <button key={k} className={`nav-btn${tab === k ? ' on' : ''}`} onClick={() => go(k)}>
              <Icon name={k} /> {label}
            </button>
          ))}
          <div className="side-foot">
            {storage === 'memoria' && <p className="alert warn" style={{ fontSize: 12 }}>Modo de teste: sem banco configurado, os dados somem ao reiniciar.</p>}
            <span className="saving" style={{ padding: '0 12px', minHeight: 18 }}>{saving ? 'Salvando…' : ''}</span>
            <form action={logout}>
              <button className="nav-btn"><Icon name="sair" /> Sair</button>
            </form>
          </div>
        </aside>

        <main className="main">
          <div className="top">
            <div>
              <h1>{title}</h1>
            </div>
            <button className="btn primary new-sale" onClick={() => ctx.newSale()}>
              <Icon name="plus" size={16} /> Nova venda
            </button>
          </div>
          {tab === 'geral' && <Overview {...ctx} />}
          {tab === 'vendas' && <Sales {...ctx} />}
          {tab === 'clientes' && <Clients {...ctx} />}
          {tab === 'planos' && <Plans {...ctx} />}
          {tab === 'config' && <Settings {...ctx} storage={storage} />}
        </main>
      </div>

      <nav className="tabbar">
        {TABS.map(([k, , short]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>
            <Icon name={k} size={20} />
            {short}
          </button>
        ))}
      </nav>
      <button className="fab" aria-label="Nova venda" onClick={() => ctx.newSale()}>
        <Icon name="plus" size={24} />
      </button>

      {form && <SaleForm {...ctx} preset={form} onClose={() => setForm(null)} />}
      {detail && <SaleDetail {...ctx} sale={detail} onClose={() => setDetailId(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
      {locked && <LockScreen name={name} onUnlock={unlock} />}
    </div>
  );
}
