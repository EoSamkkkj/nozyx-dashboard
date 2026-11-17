'use client';

import { useEffect, useState } from 'react';
import { Icon } from './ui';

/** Registra o service worker e guarda o convite de instalação do Android/Chrome. */
export function useAppShell() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const onPrompt = (e) => {
      e.preventDefault();
      window.__nzInstall = e;
      window.dispatchEvent(new Event('nz-install'));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
}

const keyBytes = (b64) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

function deviceName() {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/android/i.test(ua)) return 'Android';
  return 'Computador';
}

export default function AppSetup({ notify }) {
  const [env, setEnv] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [devices, setDevices] = useState(0);
  const [busy, setBusy] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const push = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setEnv({ ios, installed, push, android: /android/i.test(navigator.userAgent) });
    setCanInstall(Boolean(window.__nzInstall));
    const onInstall = () => setCanInstall(true);
    window.addEventListener('nz-install', onInstall);
    fetch('/api/push').then((r) => r.json()).then((j) => setDevices(j.devices || 0)).catch(() => {});
    if (push) {
      navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((s) => setSubscribed(Boolean(s))).catch(() => {});
    }
    return () => window.removeEventListener('nz-install', onInstall);
  }, []);

  if (!env) return null;

  async function install() {
    const p = window.__nzInstall;
    if (!p) return;
    p.prompt();
    const { outcome } = await p.userChoice;
    window.__nzInstall = null;
    setCanInstall(false);
    if (outcome === 'accepted') notify('App instalado! Procure o ícone da Nozyx na tela inicial.');
  }

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        notify('As notificações foram bloqueadas. Libere nas configurações do celular para este app.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await fetch('/api/push').then((r) => r.json());
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const r = await fetch('/api/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', subscription: sub.toJSON(), device: deviceName() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setSubscribed(true);
      setDevices(j.devices);
      notify('Notificações ativadas neste aparelho.');
    } catch (e) {
      notify(`Não deu para ativar: ${e.message || 'tente de novo'}.`);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const r = await fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'unsubscribe', endpoint: sub.endpoint }) });
        setDevices((await r.json()).devices || 0);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      notify('Notificações desativadas neste aparelho.');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    const r = await fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'test' }) });
    const j = await r.json();
    notify(j.sent ? `Notificação de teste enviada para ${j.sent} aparelho(s).` : 'Nenhum aparelho recebeu. Ative as notificações primeiro.');
  }

  const needsInstallFirst = env.ios && !env.installed;

  return (
    <div className="card stack">
      <div className="spread">
        <h2>App no celular e notificações</h2>
        {devices > 0 && <span className="chip ok">{devices} aparelho{devices > 1 ? 's' : ''} recebendo</span>}
      </div>
      <p className="muted" style={{ fontSize: 14 }}>
        Instale o painel como app e receba um aviso a cada venda ou pagamento lançado, em qualquer aparelho com as notificações ativadas.
      </p>

      {!env.installed && (
        <div className="card flat stack" style={{ padding: 16 }}>
          <h3>1. Instalar o app</h3>
          {canInstall ? (
            <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={install}><Icon name="baixar" size={16} /> Instalar app</button>
          ) : env.ios ? (
            <ol className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              <li>Abra este site no <b>Safari</b>.</li>
              <li>Toque no botão <b>Compartilhar</b> (quadrado com seta para cima).</li>
              <li>Toque em <b>Adicionar à Tela de Início</b> e depois em <b>Adicionar</b>.</li>
              <li>Abra o app pelo ícone da Nozyx e volte aqui em Ajustes para ativar as notificações.</li>
            </ol>
          ) : env.android ? (
            <ol className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              <li>Abra este site no <b>Chrome</b>.</li>
              <li>Toque nos <b>três pontinhos (⋮)</b> no canto de cima.</li>
              <li>Toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>).</li>
            </ol>
          ) : (
            <p className="muted" style={{ fontSize: 14 }}>No celular, abra <b>nozyx-dashboard.vercel.app</b>, entre com a senha e volte aqui em Ajustes: vai aparecer o passo a passo para instalar.</p>
          )}
        </div>
      )}

      <div className="card flat stack" style={{ padding: 16 }}>
        <h3>{env.installed ? 'Notificações' : '2. Ativar notificações'}</h3>
        {!env.push || needsInstallFirst ? (
          <p className="muted" style={{ fontSize: 14 }}>
            {needsInstallFirst ? 'No iPhone, as notificações só funcionam com o app instalado. Faça o passo 1 e abra pelo ícone.' : 'Este navegador não aceita notificações. Use o Chrome (Android/computador) ou o app instalado no iPhone.'}
          </p>
        ) : subscribed ? (
          <div className="row">
            <span className="chip ok">Ativadas neste aparelho</span>
            <button className="btn sm" onClick={test}>Enviar teste</button>
            <button className="btn sm ghost" onClick={disable} disabled={busy}>Desativar</button>
          </div>
        ) : (
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={enable} disabled={busy}>
            {busy ? 'Ativando…' : 'Ativar notificações neste aparelho'}
          </button>
        )}
      </div>
    </div>
  );
}
