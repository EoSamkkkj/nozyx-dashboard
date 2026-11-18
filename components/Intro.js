'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { money } from '@/lib/model';

/** true quando o painel está visível (depois do PIN): é a deixa para a animação de entrada. */
export const IntroContext = createContext(true);

const ease = (t) => 1 - Math.pow(1 - t, 4);
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Número que sobe até o valor: de 0 na entrada, do valor anterior quando muda. */
export function CountUp({ value, format = money, delay = 0 }) {
  const play = useContext(IntroContext);
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    if (!play) return;
    if (reduced()) { from.current = value; setShown(value); return; }
    const start = from.current;
    const dur = first.current ? 1100 : 550;
    const wait = first.current ? delay : 0;
    first.current = false;
    let raf, t0;
    const tick = (now) => {
      t0 ??= now + wait;
      const p = Math.max(0, Math.min(1, (now - t0) / dur));
      const v = start + (value - start) * ease(p);
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, play, delay]);

  return format(Math.round(shown));
}
