'use client';

import { useEffect, useState } from 'react';

const TOTAL = 2300; // entrada + pausa + saída (ms)

/** Abertura do app: o N da Nozyx monta peça por peça, brilha e sai num zoom revelando o painel. */
export default function Splash({ onDone }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const reveal = setTimeout(() => onDone?.(), 1750); // o painel começa a entrar enquanto o logo sai
    const t = setTimeout(() => setGone(true), TOTAL);
    return () => { clearTimeout(reveal); clearTimeout(t); };
  }, [onDone]);
  if (gone) return null;
  return (
    <div className="splash" aria-hidden="true">
      <div className="splash-stage">
        <div className="splash-glow" />
        <svg className="splash-logo" viewBox="0 0 100 100" width="112" height="112">
          <defs>
            <linearGradient id="sp-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100">
              <stop offset="0" stopColor="#7DC0FF" />
              <stop offset="1" stopColor="#2F7BF5" />
            </linearGradient>
            <linearGradient id="sp-shine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".5" stopColor="#fff" stopOpacity=".75" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id="sp-clip">
              <path d="M0 8 L28 48 L28 100 L0 100 Z M72 0 L100 0 L100 92 L72 52 Z M0 0 L30 0 L100 100 L70 100 Z" />
            </clipPath>
          </defs>
          <path className="sp-left" d="M0 8 L28 48 L28 100 L0 100 Z" fill="#4A98FF" />
          <path className="sp-right" d="M72 0 L100 0 L100 92 L72 52 Z" fill="#4A98FF" />
          <path className="sp-diag" d="M0 0 L30 0 L100 100 L70 100 Z" fill="url(#sp-g)" />
          <g clipPath="url(#sp-clip)">
            <rect className="sp-shine" x="-60" y="-10" width="40" height="120" fill="url(#sp-shine)" transform="skewX(-20)" />
          </g>
        </svg>
        <p className="splash-word">
          {'NOZYX'.split('').map((l, i) => <span key={i} style={{ animationDelay: `${0.55 + i * 0.06}s` }}>{l}</span>)}
        </p>
      </div>
    </div>
  );
}
