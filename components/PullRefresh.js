'use client';

import { useEffect, useRef, useState } from 'react';

const LIMIT = 70; // quanto puxar (px) para atualizar

/** Puxar a tela para baixo no topo recarrega os dados, como em app de banco. */
export default function PullRefresh({ onRefresh }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const st = useRef({ y: 0, on: false, pull: 0, busy: false });

  useEffect(() => {
    const s = st.current;
    const blocked = () => document.querySelector('.overlay, .lock');
    const start = (e) => {
      if (s.busy || window.scrollY > 0 || e.touches.length !== 1 || blocked()) return;
      s.y = e.touches[0].clientY;
      s.on = true;
    };
    const move = (e) => {
      if (!s.on) return;
      const d = e.touches[0].clientY - s.y;
      if (d <= 0 || window.scrollY > 0) { s.pull = 0; setPull(0); return; }
      s.pull = Math.min(110, d * 0.5);
      setPull(s.pull);
    };
    const end = async () => {
      if (!s.on) return;
      s.on = false;
      if (s.pull >= LIMIT) {
        s.busy = true;
        setBusy(true);
        setPull(LIMIT);
        navigator.vibrate?.(15);
        await Promise.all([onRefresh(), new Promise((r) => setTimeout(r, 600))]);
        s.busy = false;
        setBusy(false);
      }
      s.pull = 0;
      setPull(0);
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
    };
  }, [onRefresh]);

  if (!pull && !busy) return null;
  const ready = pull >= LIMIT;
  return (
    <div className="ptr" style={{ transform: `translate(-50%, ${pull - 44}px)`, opacity: Math.min(1, pull / 40) }} aria-hidden="true">
      <svg className={busy ? 'spin' : ''} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
        style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }}>
        <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
      </svg>
      {!busy && ready && <span className="ptr-dot" />}
    </div>
  );
}
