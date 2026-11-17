'use client';

import { useMemo, useState } from 'react';
import { PERIODS, brDate, goalProgress, monthRace, money, periodRange, series, summary, todaySP } from '@/lib/model';
import { EvolutionChart, MonthRaceChart, PlanBars } from './Charts';
import { Icon } from './ui';

export default function Overview({ data, newSale, go, openSale }) {
  const [period, setPeriod] = useState('30');
  const today = todaySP();
  const [custom, setCustom] = useState({ from: today.slice(0, 8) + '01', to: today });
  const [a, b] = periodRange(period, data, today, custom);
  const s = useMemo(() => summary(data, a, b), [data, a, b]);
  const chart = useMemo(() => series(data, a, b), [data, a, b]);
  const goal = goalProgress(data, today);
  const race = useMemo(() => monthRace(data, today), [data, today]);

  if (!data.sales.length) {
    return (
      <div className="card empty">
        <div className="big"><Icon name="vendas" size={26} /></div>
        <h2>Nenhuma venda ainda</h2>
        <p>Cadastre a primeira venda, mesmo que seja de outro dia: é só escolher a data certa. Os números aparecem aqui automaticamente.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn primary" onClick={() => newSale()}><Icon name="plus" size={16} /> Cadastrar primeira venda</button>
          <button className="btn" onClick={() => go('planos')}>Definir preços dos planos</button>
        </div>
      </div>
    );
  }

  const rangeText = a === b ? brDate(a) : `${brDate(a)} a ${brDate(b)}`;
  const month = summary(data, `${today.slice(0, 7)}-01`, today);

  return (
    <>
      <Hero data={data} race={race} goal={goal} month={month} openTotal={s.openTotal} go={go} />

      <div className="section-head">
        <h2>Desempenho</h2>
      </div>
      <div className="filters">
        <div className="seg">
          {PERIODS.map(([k, label]) => (
            <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{label}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="row">
            <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} style={{ width: 'auto' }} aria-label="De" />
            <span className="faint">até</span>
            <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} style={{ width: 'auto' }} aria-label="Até" />
          </div>
        )}
        <span className="faint">{rangeText}</span>
      </div>

      {s.review.length > 0 && (
        <div className="alert warn" style={{ marginBottom: 14 }}>
          {s.review.length} venda{s.review.length > 1 ? 's' : ''} cancelada{s.review.length > 1 ? 's' : ''} com dinheiro recebido precisa{s.review.length > 1 ? 'm' : ''} de revisão.{' '}
          <button className="link-btn" onClick={() => openSale(s.review[0].id)}>Ver</button>
        </div>
      )}

      <div className="kpis">
        <Kpi icon="trend" tone="accent" label="Total vendido" value={money(s.sold)} note="pela data da venda" />
        <Kpi icon="check" tone="ok" label="Total recebido" value={money(s.received)} note="pela data de cada recebimento" />
        <Kpi icon="relogio" tone="warn" label="Pendente do período" value={money(s.pending)} note="quanto falta receber delas" />
        <Kpi icon="vendas" tone="accent" label="Vendas" value={s.count} />
        <Kpi icon="play" tone="violet" label="Vídeos vendidos" value={s.videos} />
        <Kpi icon="ticket" tone="ok" label="Ticket médio" value={money(s.ticket)} note="por venda" />
      </div>


      <MonthCard race={race} />

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-title">
          <h2>Vendido × recebido {chart.unit !== 'dia' && <span className="faint">(por {chart.unit})</span>}</h2>
          <div className="legend">
            <span><i style={{ background: 'var(--accent)' }} />Vendido</span>
            <span><i style={{ background: 'var(--ok)' }} />Recebido</span>
          </div>
        </div>
        <EvolutionChart buckets={chart.buckets} unit={chart.unit} />
      </div>

      <div className="split">
        <div className="card">
          <div className="card-title"><h2>Valor vendido por plano</h2></div>
          {s.byPlan.length ? <PlanBars rows={s.byPlan} field="value" format={money} /> : <p className="faint">Sem vendas no período.</p>}
        </div>
        <div className="card">
          <div className="card-title"><h2>Vendas por plano</h2></div>
          {s.byPlan.length ? <PlanBars rows={s.byPlan} field="count" format={(v) => v} alt /> : <p className="faint">Sem vendas no período.</p>}
        </div>
      </div>
      <p className="faint foot-note">Valores vendidos e recebidos. Custos não entram nesta versão, então nada aqui é lucro.</p>
    </>
  );
}

function MonthCard({ race }) {
  const now = race.current[race.current.length - 1] || 0;
  const before = race.previous[Math.min(race.today, race.previous.length) - 1] || 0;
  const diff = now - before;
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-title">
        <div>
          <h2>Vendas do mês</h2>
          <p className="faint" style={{ marginTop: 2 }}>
            Acumulado de {race.label}: <b style={{ color: 'var(--text)' }}>{money(now)}</b>
            {before > 0 && (
              <> · <span style={{ color: diff >= 0 ? 'var(--ok)' : 'var(--warn)' }}>{diff >= 0 ? '+' : '−'}{money(Math.abs(diff))}</span> em relação ao mesmo dia de {race.prevLabel}</>
            )}
          </p>
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--accent)' }} />{race.label}</span>
          <span><i style={{ background: 'var(--faint)' }} />{race.prevLabel}</span>
          {race.goal > 0 && <span><i style={{ background: 'var(--warn)' }} />Meta</span>}
        </div>
      </div>
      <MonthRaceChart race={race} />
    </div>
  );
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date()));
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function Hero({ data, race, goal, month, openTotal, go }) {
  const now = race.current[race.current.length - 1] || 0;
  const before = race.previous[Math.min(race.today, race.previous.length) - 1] || 0;
  const diff = now - before;
  const pct = before ? Math.round((diff / before) * 100) : null;
  const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date());
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date());

  return (
    <section className="hero-panel">
      <div className="hero-top">
        <div>
          <p className="hero-hello">{greeting()}</p>
          <p className="hero-date">{date.charAt(0).toUpperCase() + date.slice(1)}</p>
        </div>
        <span className="live"><i /> Ao vivo</span>
      </div>

      <div className="hero-main">
        <div className="grow">
          <p className="hero-label">Vendido em {monthName}</p>
          <p className="hero-value">{money(now)}</p>
          {before > 0 ? (
            <span className={`trend ${diff >= 0 ? 'up' : 'down'}`}>
              {diff >= 0 ? '▲' : '▼'} {pct !== null ? `${Math.abs(pct)}%` : money(Math.abs(diff))}
              <span> vs. mesmo dia de {race.prevLabel}</span>
            </span>
          ) : (
            <span className="trend up">{month.count} venda{month.count === 1 ? '' : 's'} este mês</span>
          )}
          <Spark values={race.current} days={race.days} />
        </div>
        <GoalRing goal={goal} go={go} />
      </div>

      <div className="hero-stats">
        <div><span>Recebido</span><b>{money(month.received)}</b></div>
        <div><span>A receber</span><b>{money(openTotal)}</b></div>
        <div><span>Vendas</span><b>{month.count}</b></div>
      </div>
    </section>
  );
}

function Spark({ values, days }) {
  if (values.length < 2) return null;
  const W = 300, H = 54, max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (days - 1)) * W, H - 4 - (v / max) * (H - 10)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="spark-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6CB8FF" stopOpacity=".45" />
          <stop offset="1" stopColor="#6CB8FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${lx} ${H} L0 ${H} Z`} fill="url(#spark-g)" />
      <path d={line} fill="none" stroke="#9BD0FF" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="3.5" fill="#fff" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function GoalRing({ goal, go }) {
  if (!goal.goal) {
    return (
      <button className="ring empty-ring" onClick={() => go('config')}>
        <Icon name="alvo" size={22} />
        <span>Definir meta</span>
      </button>
    );
  }
  const r = 46, c = 2 * Math.PI * r, p = Math.min(100, goal.pct) / 100;
  const over = goal.sold >= goal.goal;
  return (
    <div className="ring">
      <svg viewBox="0 0 110 110" width="128" height="128">
        <defs>
          <linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={over ? '#7fe3b8' : '#9BD0FF'} />
            <stop offset="1" stopColor={over ? '#3ccf91' : '#4A98FF'} />
          </linearGradient>
        </defs>
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(221,238,255,.12)" strokeWidth="9" />
        <circle cx="55" cy="55" r={r} fill="none" stroke="url(#ring-g)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 55 55)" className="ring-arc" />
      </svg>
      <div className="ring-in">
        <b>{goal.pct}%</b>
        <span>da meta</span>
      </div>
      <p className="ring-sub">{over ? `Meta batida! +${money(goal.extra)}` : `Faltam ${money(goal.missing)}`}</p>
    </div>
  );
}

function Kpi({ label, value, note, icon, tone = 'accent' }) {
  return (
    <div className={`card kpi tone-${tone}`}>
      {icon && <span className="kpi-ic"><Icon name={icon} size={17} /></span>}
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {note && <div className="note">{note}</div>}
    </div>
  );
}

