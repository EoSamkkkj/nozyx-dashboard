'use client';

import { useEffect } from 'react';

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
    return () => {
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('touchmove', pinch);
      document.removeEventListener('contextmenu', ctx);
      document.removeEventListener('dragstart', stop);
      document.removeEventListener('wheel', ctrlZoom);
    };
  }, []);
  return null;
}
