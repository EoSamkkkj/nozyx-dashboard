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

  return (
    <>
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
        <Kpi hero label="Total vendido" value={money(s.sold)} note="pela data da venda" />
        <Kpi label="Total recebido" value={money(s.received)} note="pela data de cada recebimento" />
        <Kpi label="Pendente das vendas do período" value={money(s.pending)} note="quanto falta receber delas" />
        <Kpi label="Vendas" value={s.count} />
        <Kpi label="Vídeos vendidos" value={s.videos} />
        <Kpi label="Ticket médio" value={money(s.ticket)} note="por venda" />
      </div>

      <div className="split">
        <div className="card open-card">
          <div className="spread">
            <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Total a receber</span>
            <span className="chip info">Todas as vendas · ignora o filtro</span>
          </div>
          <div className="value">{money(s.openTotal)}</div>
          <p className="faint">Soma dos saldos em aberto de todas as vendas não canceladas.</p>
          <button className="link-btn" style={{ marginTop: 10 }} onClick={() => go('vendas')}>Ver vendas com saldo →</button>
        </div>
        <Goal goal={goal} go={go} />
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

function Kpi({ label, value, note, hero }) {
  return (
    <div className={`card kpi${hero ? ' hero' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {note && <div className="note">{note}</div>}
    </div>
  );
}

function Goal({ goal, go }) {
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date());
  if (!goal.goal) {
    return (
      <div className="card">
        <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Meta de {month}</span>
        <p className="faint" style={{ margin: '10px 0 12px' }}>Defina uma meta mensal de vendas para acompanhar o progresso aqui.</p>
        <button className="btn sm" onClick={() => go('config')}><Icon name="alvo" size={15} /> Definir meta</button>
      </div>
    );
  }
  const over = goal.sold >= goal.goal;
  return (
    <div className="card">
      <div className="spread">
        <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Meta de {month}</span>
        <b style={{ color: over ? 'var(--ok)' : 'var(--accent-2)' }}>{goal.pct}%</b>
      </div>
      <div className="bar-track"><div className={`bar-fill${over ? ' over' : ''}`} style={{ width: `${Math.min(100, goal.pct)}%` }} /></div>
      <div className="spread" style={{ fontSize: 14 }}>
        <span>{money(goal.sold)} <span className="faint">de {money(goal.goal)}</span></span>
        {over ? <span style={{ color: 'var(--ok)' }}>Meta batida! +{money(goal.extra)}</span> : <span className="muted">Faltam {money(goal.missing)}</span>}
      </div>
    </div>
  );
}
