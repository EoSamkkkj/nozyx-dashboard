'use client';

import { useRef, useState } from 'react';
import { money } from '@/lib/model';

const short = (c) => {
  const v = c / 100;
  if (v >= 1e6) return `R$${(v / 1e6).toFixed(1).replace('.', ',')}mi`;
  if (v >= 1e3) return `R$${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace('.', ',')}mil`;
  return `R$${Math.round(v)}`;
};

/** Vendido (barras) e recebido (linha) por dia, semana ou mês. */
export function EvolutionChart({ buckets, unit }) {
  const [hover, setHover] = useState(null);
  const box = useRef(null);
  const W = 720, H = 240, L = 54, R = 10, T = 12, B = 28;
  const max = Math.max(1, ...buckets.flatMap((b) => [b.sold, b.received]));
  // escala "redonda" para as linhas de grade
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const n = buckets.length;
  const cw = (W - L - R) / n;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const x = (i) => L + cw * i + cw / 2;
  const bw = Math.max(2, Math.min(26, cw * 0.56));
  const every = Math.ceil(n / (W > 500 ? 10 : 6));
  const line = buckets.map((b, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(b.received).toFixed(1)}`).join(' ');

  const onMove = (e) => {
    const r = box.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.min(n - 1, Math.max(0, Math.floor((px - L) / cw)));
    setHover({ i, left: (x(i) / W) * r.width, top: (y(Math.max(buckets[i].sold, buckets[i].received)) / H) * r.height });
  };

  return (
    <div style={{ position: 'relative' }} ref={box} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Vendido e recebido por ${unit}`}>
        {[0, 1, 2, 3, 4].map((k) => {
          const v = (top / 4) * k;
          if (v > top) return null;
          return (
            <g key={k}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="rgba(221,238,255,.07)" />
              <text x={L - 8} y={y(v) + 4} textAnchor="end">{short(v)}</text>
            </g>
          );
        })}
        {buckets.map((b, i) => (
          <g key={i}>
            {hover?.i === i && <rect x={L + cw * i} y={T} width={cw} height={H - T - B} fill="rgba(221,238,255,.04)" />}
            {b.sold > 0 && <rect x={x(i) - bw / 2} y={y(b.sold)} width={bw} height={y(0) - y(b.sold)} rx={Math.min(4, bw / 2)} fill="var(--accent)" opacity=".9" />}
            {i % every === 0 && <text x={x(i)} y={H - 8} textAnchor="middle">{b.label}</text>}
          </g>
        ))}
        <path d={line} fill="none" stroke="var(--ok)" strokeWidth="2" strokeLinejoin="round" />
        {n <= 62 && buckets.map((b, i) => b.received > 0 && <circle key={i} cx={x(i)} cy={y(b.received)} r="3" fill="var(--ok)" />)}
      </svg>
      {hover && (
        <div className="tip" style={{ left: hover.left, top: hover.top }}>
          <div className="faint">{unit === 'semana' ? `Semana de ${buckets[hover.i].label}` : buckets[hover.i].label}</div>
          <div>Vendido: <b>{money(buckets[hover.i].sold)}</b></div>
          <div>Recebido: <b>{money(buckets[hover.i].received)}</b></div>
        </div>
      )}
    </div>
  );
}

/** Vendido acumulado no mês atual × mês anterior, com a linha da meta. */
export function MonthRaceChart({ race }) {
  const [hover, setHover] = useState(null);
  const box = useRef(null);
  const W = 720, H = 220, L = 54, R = 10, T = 12, B = 26;
  const n = Math.max(race.days, race.previous.length);
  const max = Math.max(1, race.goal, ...race.current, ...race.previous);
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const x = (i) => L + ((W - L - R) * i) / (n - 1);
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = race.current.length ? `${path(race.current)} L${x(race.current.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : '';
  const last = race.current.length - 1;

  const onMove = (e) => {
    const r = box.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.min(n - 1, Math.max(0, Math.round(((px - L) / (W - L - R)) * (n - 1))));
    setHover({ i, left: (x(i) / W) * r.width, top: (y(Math.max(race.current[i] ?? 0, race.previous[i] ?? 0)) / H) * r.height });
  };

  return (
    <div style={{ position: 'relative' }} ref={box} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Vendas acumuladas no mês">
        <defs>
          <linearGradient id="race-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity=".35" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <line x1={L} x2={W - R} y1={y((top / 4) * k)} y2={y((top / 4) * k)} stroke="rgba(221,238,255,.07)" />
            <text x={L - 8} y={y((top / 4) * k) + 4} textAnchor="end">{short((top / 4) * k)}</text>
          </g>
        ))}
        {[1, 5, 10, 15, 20, 25, n].filter((d) => d <= n).map((d) => (
          <text key={d} x={x(d - 1)} y={H - 6} textAnchor="middle">{d}</text>
        ))}
        {race.goal > 0 && (
          <g>
            <line x1={L} x2={W - R} y1={y(race.goal)} y2={y(race.goal)} stroke="var(--warn)" strokeDasharray="5 5" opacity=".8" />
            <text x={W - R} y={y(race.goal) - 6} textAnchor="end" style={{ fill: 'var(--warn)' }}>meta</text>
          </g>
        )}
        <path d={path(race.previous)} fill="none" stroke="var(--faint)" strokeWidth="1.6" strokeDasharray="4 4" />
        {area && <path d={area} fill="url(#race-fill)" />}
        <path d={path(race.current)} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round" />
        {last >= 0 && <circle cx={x(last)} cy={y(race.current[last])} r="4.5" fill="var(--accent)" stroke="var(--card)" strokeWidth="2" />}
        {hover && <line x1={x(hover.i)} x2={x(hover.i)} y1={T} y2={H - B} stroke="rgba(221,238,255,.15)" />}
      </svg>
      {hover && (
        <div className="tip" style={{ left: hover.left, top: hover.top }}>
          <div className="faint">Até o dia {hover.i + 1}</div>
          {hover.i <= last && <div>{race.label}: <b>{money(race.current[hover.i])}</b></div>}
          {race.previous[hover.i] != null && <div>{race.prevLabel}: <b>{money(race.previous[hover.i])}</b></div>}
        </div>
      )}
    </div>
  );
}

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

/** Barras horizontais: uma linha por plano. */
export function PlanBars({ rows, field, format, alt }) {
  const max = Math.max(1, ...rows.map((r) => r[field]));
  return (
    <div>
      {rows.map((r) => (
        <div key={r.name} className="hbar">
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
          <div className="track"><div className={`fill${alt ? ' alt' : ''}`} style={{ width: `${(r[field] / max) * 100}%` }} /></div>
          <b style={{ minWidth: 40, textAlign: 'right' }}>{format(r[field])}</b>
        </div>
      ))}
    </div>
  );
}
