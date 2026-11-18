'use client';

import { useCallback, useEffect, useState } from 'react';
import { logout } from '@/app/actions';
import Logo from './Logo';
import { Icon } from './ui';
import { biometryAvailable, verifyBiometry } from './native';

// Bloqueio por PIN deste aparelho (tipo app de banco). O PIN fica só aqui,
// guardado como hash; a senha de administrador continua valendo para entrar.
const KEY = 'nz_pin';
const UNLOCKED = 'nz_unlocked';
const AWAY = 2 * 60 * 1000; // volta a pedir o PIN depois de 2 min fora do app
const MAX_ERROS = 5;

const store = {
  get: (k, s = localStorage) => { try { return s.getItem(k); } catch { return null; } },
  set: (k, v, s = localStorage) => { try { v == null ? s.removeItem(k) : s.setItem(k, v); } catch {} },
};

async function hash(pin, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const pinEnabled = () => Boolean(store.get(KEY));

export async function savePin(pin) {
  const salt = crypto.getRandomValues(new Uint32Array(2)).join('');
  store.set(KEY, JSON.stringify({ salt, hash: await hash(pin, salt), erros: 0 }));
  store.set(UNLOCKED, '1', sessionStorage);
}

export function removePin() {
  store.set(KEY, null);
  store.set(BIO, null);
}

const BIO = 'nz_bio';
export const bioEnabled = () => store.get(BIO) === '1';
export const setBio = (on) => store.set(BIO, on ? '1' : null);

export function lockNow() {
  store.set(UNLOCKED, null, sessionStorage);
  window.dispatchEvent(new Event('nz-lock'));
}

/** Diz se a tela de PIN deve aparecer agora. */
export function useLock() {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const check = () => setLocked(pinEnabled() && !store.get(UNLOCKED, sessionStorage));
    check();
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AWAY) lockNow();
    };
    window.addEventListener('nz-lock', check);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('nz-lock', check);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return [locked, () => setLocked(false)];
}

/** Teclado numérico de 4 dígitos (usado no bloqueio e para criar o PIN). */
export function PinPad({ onDone, error, shake }) {
  const [pin, setPin] = useState('');
  const press = useCallback((d) => setPin((p) => (p.length >= 4 ? p : p + d)), []);
  useEffect(() => {
    if (pin.length !== 4) return;
    const t = setTimeout(() => { onDone(pin); setPin(''); }, 120);
    return () => clearTimeout(t);
  }, [pin, onDone]);

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  return (
    <div className="pinpad">
      <div className={`pin-dots${shake ? ' shake' : ''}`} aria-label={`${pin.length} de 4 dígitos`}>
        {[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}
      </div>
      <p className="pin-msg">{error || ' '}</p>
      <div className="keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button type="button" key={d} onClick={() => press(d)}>{d}</button>
        ))}
        <span />
        <button type="button" onClick={() => press('0')}>0</button>
        <button type="button" className="del" aria-label="Apagar" onClick={() => setPin((p) => p.slice(0, -1))}>
          <Icon name="apagar" size={22} />
        </button>
      </div>
    </div>
  );
}

export default function LockScreen({ name, onUnlock }) {
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [bio, setBioOk] = useState(false);

  const tryBio = useCallback(async () => {
    if (await verifyBiometry()) {
      store.set(UNLOCKED, '1', sessionStorage);
      onUnlock();
    }
  }, [onUnlock]);

  useEffect(() => {
    if (!bioEnabled()) return;
    biometryAvailable().then((ok) => {
      setBioOk(ok);
      if (ok) tryBio();
    });
  }, [tryBio]);

  async function check(pin) {
    const saved = JSON.parse(store.get(KEY) || 'null');
    if (!saved) return onUnlock();
    if ((await hash(pin, saved.salt)) === saved.hash) {
      store.set(KEY, JSON.stringify({ ...saved, erros: 0 }));
      store.set(UNLOCKED, '1', sessionStorage);
      return onUnlock();
    }
    const erros = (saved.erros || 0) + 1;
    navigator.vibrate?.(180);
    setShake(true);
    setTimeout(() => setShake(false), 450);
    if (erros >= MAX_ERROS) {
      removePin();
      await logout(); // errou demais: precisa entrar de novo com a senha de administrador
      return;
    }
    store.set(KEY, JSON.stringify({ ...saved, erros }));
    setError(`PIN incorreto. ${MAX_ERROS - erros} tentativa${MAX_ERROS - erros > 1 ? 's' : ''} restante${MAX_ERROS - erros > 1 ? 's' : ''}.`);
  }

  return (
    <div className="lock">
      <div className="login-glow" aria-hidden="true" />
      <div className="lock-in">
        <div className="login-logo"><Logo size={36} /></div>
        <h2>{name}</h2>
        <p className="muted">Digite seu PIN para abrir o painel</p>
        <PinPad onDone={check} error={error} shake={shake} />
        {bio && <button className="btn" style={{ marginBottom: 10 }} onClick={tryBio}><Icon name="digital" size={18} /> Usar digital</button>}
        <form action={logout}>
          <button className="link-btn" onClick={() => removePin()}>Esqueci o PIN · entrar com a senha</button>
        </form>
      </div>
    </div>
  );
}
