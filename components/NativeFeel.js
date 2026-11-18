'use client';

import { useEffect } from 'react';

const TAP = 'button, .btn, a.btn, [role="tab"], .click, .item[style*="pointer"], .item.click, .chip-btn, .rank a';

/** Toque com bounce: reinicia a animação no elemento tocado (e uma vibração bem leve no celular). */
function tap(e) {
  const el = e.target.closest?.(TAP);
  if (!el || el.disabled) return;
  el.classList.remove('nz-tap');
  void el.offsetWidth; // reinicia a animação mesmo em toques seguidos
  el.classList.add('nz-tap');
  const done = () => { el.classList.remove('nz-tap'); el.removeEventListener('animationend', done); };
  el.addEventListener('animationend', done);
  setTimeout(done, 900);
  if (el.matches('.fab, .tabbar button')) navigator.vibrate?.(10);
}

const editable = (el) => el?.closest?.('input, textarea, select, [contenteditable="true"]');

/** Tira o jeito de site: sem zoom de pinça, sem menu de segurar e sem arrastar. */
export default function NativeFeel() {
  useEffect(() => {
    const stop = (e) => e.preventDefault();
    const pinch = (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); };
    const ctx = (e) => { if (!editable(e.target)) e.preventDefault(); };
    const ctrlZoom = (e) => { if (e.ctrlKey) e.preventDefault(); };
    document.addEventListener('gesturestart', stop);
    document.addEventListener('touchmove', pinch, { passive: false });
    document.addEventListener('contextmenu', ctx);
    document.addEventListener('dragstart', stop);
    document.addEventListener('wheel', ctrlZoom, { passive: false });
    document.addEventListener('click', tap, true);
    return () => {
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('touchmove', pinch);
      document.removeEventListener('contextmenu', ctx);
      document.removeEventListener('dragstart', stop);
      document.removeEventListener('wheel', ctrlZoom);
      document.removeEventListener('click', tap, true);
    };
  }, []);
  return null;
}
