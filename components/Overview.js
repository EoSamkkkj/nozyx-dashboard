'use client';

import { useMemo, useState } from 'react';
import { PERIODS, addDays, brDate, byOrigin, clientRanking, streak, diffDays, forecast, records, goalProgress, monthRace, money, periodRange, series, summary, todaySP } from '@/lib/model';
import { EvolutionChart, MonthRaceChart, PlanBars } from './Charts';
import { Icon } from './ui';
import { CountUp } from './Intro';
import { fraseDoDia } from '@/lib/frases';
import { whatsLink } from '@/lib/whats';

export default function Overview({ data, newSale, go, openSale, hidden, toggleHide, readOnly }) {
  const [period, setPeriod] = useState('hoje');
  const today = todaySP();
  const [custom, setCustom] = useState({ from: today.slice(0, 8) + '01', to: today });
  const [a, b] = periodRange(period, data, today, custom);
  const s = useMemo(() => summary(data, a, b), [data, a, b]);
  const chart = useMemo(() => series(data, a, b), [data, a, b]);
  const goal = goalProgress(data, today);
  const race = useMemo(() => monthRace(data, today), [data, today]);
  const rec = useMemo(() => records(data, today), [data, today]);
  const fc = useMemo(() => forecast(data, today), [data, today]);
  const rank = useMemo(() => clientRanking(data, today), [data, today]);
  const st = useMemo(() => streak(data, today), [data, today]);
  const origins = useMemo(() => byOrigin(data, a, b), [data, a, b]);

  if (!data.sales.length) {
    return (
      <div className="card empty">
        <div className="big"><Icon name="vendas" size={26} /></div>
        <h2>Nenhuma venda ainda</h2>
        <p>{readOnly ? 'Assim que a primeira venda for cadastrada, os números aparecem aqui.' : 'Cadastre a primeira venda, mesmo que seja de outro dia: é só escolher a data certa. Os números aparecem aqui automaticamente.'}</p>
        {!readOnly && <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn primary" onClick={() => newSale()}><Icon name="plus" size={16} /> Cadastrar primeira venda</button>
          <button className="btn" onClick={() => go('planos')}>Definir preços dos planos</button>
        </div>}
      </div>
    );
  }

  const rangeText = a === b ? brDate(a) : `${brDate(a)} a ${brDate(b)}`;

  return (
    <>
      <Hero readOnly={readOnly} st={st} rec={rec} fc={fc} hidden={hidden} toggleHide={toggleHide} data={data} period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} a={a} b={b} s={s} race={race} goal={goal} go={go} />

      <Frase today={today} />

      <div className="section-head">
        <h2>Desempenho</h2>
        <span className="faint">{rangeText}</span>
      </div>

      {s.review.length > 0 && (
        <div className="alert warn" style={{ marginBottom: 14 }}>
          {s.review.length} venda{s.review.length > 1 ? 's' : ''} cancelada{s.review.length > 1 ? 's' : ''} com dinheiro recebido precisa{s.review.length > 1 ? 'm' : ''} de revisão.{' '}
          <button className="link-btn" onClick={() => openSale(s.review[0].id)}>Ver</button>
        </div>
      )}

      <div className="kpis">
        <Kpi icon="trend" tone="accent" label="Total vendido" value={<CountUp value={s.sold} delay={250} />} note="pela data da venda" />
        <Kpi icon="check" tone="ok" label="Total recebido" value={<CountUp value={s.received} delay={300} />} note="pela data de cada recebimento" />
        <Kpi icon="relogio" tone="warn" label="Pendente do período" value={<CountUp value={s.pending} delay={350} />} note="quanto falta receber delas" />
        <Kpi icon="vendas" tone="accent" label="Vendas" value={<CountUp value={s.count} format={String} delay={400} />} />
        <Kpi icon="play" tone="violet" label="Vídeos vendidos" value={<CountUp value={s.videos} format={String} delay={450} />} />
        <Kpi icon="ticket" tone="ok" label="Ticket médio" value={<CountUp value={s.ticket} delay={500} />} note="por venda" />
      </div>


      <MonthCard race={race} fc={fc} />

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
      {origins.length > 0 && (origins.length > 1 || origins[0].name !== 'Não informado') && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-title"><h2>De onde vêm as vendas</h2><span className="faint">{rangeText}</span></div>
          <PlanBars rows={origins} field="value" format={money} />
        </div>
      )}

      <Ranking rank={rank} readOnly={readOnly} />
      <p className="faint foot-note">Valores vendidos e recebidos. Custos não entram nesta versão, então nada aqui é lucro.</p>
    </>
  );
}

function MonthCard({ race, fc }) {
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
          {fc.value > 0 && fc.daysLeft > 0 && (
            <p className="forecast"><Icon name="trend" size={14} /> No ritmo atual, você fecha {fc.label} com <b>{money(fc.value)}</b></p>
          )}
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

const LABEL = { hoje: 'Vendido hoje', ontem: 'Vendido ontem', mes: '', 7: 'Vendido nos últimos 7 dias', 30: 'Vendido nos últimos 30 dias', 60: 'Vendido nos últimos 60 dias', tudo: 'Vendido em todo o período' };

function Hero({ readOnly, st, rec, fc, hidden, toggleHide, data, period, setPeriod, custom, setCustom, a, b, s, race, goal, go }) {
  const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date());
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date());
  const label = period === 'mes' ? `Vendido em ${monthName}` : period === 'custom' ? (a === b ? `Vendido em ${brDate(a)}` : `Vendido de ${brDate(a)} a ${brDate(b)}`) : LABEL[period];

  // comparação com o período anterior do mesmo tamanho
  let before = 0, vs = '';
  if (period === 'mes') {
    before = race.previous[Math.min(race.today, race.previous.length) - 1] || 0;
    vs = `vs. mesmo dia de ${race.prevLabel}`;
  } else if (period !== 'tudo') {
    const span = diffDays(a, b) + 1;
    before = summary(data, addDays(a, -span), addDays(a, -1)).sold;
    vs = period === 'hoje' ? 'vs. ontem' : period === 'ontem' ? 'vs. anteontem' : span === 1 ? 'vs. dia anterior' : `vs. ${span} dias anteriores`;
  }
  const diff = s.sold - before;
  const pct = before ? Math.round((diff / before) * 100) : null;
  const spark = useMemo(() => {
    const [x, y] = period === 'hoje' || period === 'ontem' ? [addDays(b, -6), b] : [a, b];
    return series(data, x, y).buckets.map((k) => k.sold);
  }, [data, a, b, period]);

  return (
    <section className="hero-panel">
      <div className="hero-top">
        <div>
          <p className="hero-hello">{greeting()}</p>
          <p className="hero-date">{date.charAt(0).toUpperCase() + date.slice(1)}</p>
          {st.days >= 2 && (
            <span className={`streak${st.today ? '' : ' wait'}`}>🔥 {st.days} dias seguidos vendendo{st.today ? '' : ' · venda hoje para manter'}</span>
          )}
        </div>
        <div className="hero-tools">
          <button className="eye-btn" onClick={toggleHide} aria-label={hidden ? 'Mostrar valores' : 'Esconder valores'} aria-pressed={hidden}>
            <Icon name={hidden ? 'olhoOff' : 'olho'} size={17} />
          </button>
          <span className="live"><i /> Ao vivo</span>
        </div>
      </div>

      <div className="hero-periods" role="tablist" aria-label="Período">
        {PERIODS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={period === k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{l}</button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="hero-dates">
          <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label="De" />
          <span>até</span>
          <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label="Até" />
        </div>
      )}

      <div className="hero-main">
        <div className="grow">
          <p className="hero-label">
            {label}
            {period === 'hoje' && rec.bestDay > 0 && rec.todaySold > rec.bestDay && <span className="record">🏆 Recorde do dia</span>}
            {period === 'mes' && rec.bestMonth > 0 && rec.monthSold > rec.bestMonth && <span className="record">🏆 Melhor mês</span>}
          </p>
          <p className="hero-value"><CountUp value={s.sold} delay={150} /></p>
          {before > 0 ? (
            <span className={`trend ${diff >= 0 ? 'up' : 'down'}`}>
              {diff >= 0 ? '▲' : '▼'} {pct !== null ? `${Math.abs(pct)}%` : money(Math.abs(diff))}
              <span> {vs}</span>
            </span>
          ) : (
            <span className="trend up">
              {s.count ? `${s.count} venda${s.count === 1 ? '' : 's'}` : period === 'hoje' ? 'Nenhuma venda hoje ainda' : period === 'ontem' ? 'Nenhuma venda ontem' : 'Nenhuma venda no período'}
            </span>
          )}
          {period === 'hoje' && data.settings.dailyGoal > 0 && <DayGoal sold={s.sold} goal={data.settings.dailyGoal} />}
          {period === 'mes' && fc.value > 0 && fc.daysLeft > 0 && (
            <p className="hero-forecast">No ritmo atual, você fecha {fc.label} com <b>{money(fc.value)}</b></p>
          )}
          <Spark values={spark} days={spark.length} />
        </div>
        <GoalRing goal={goal} go={readOnly ? null : go} />
      </div>

      <div className="hero-stats">
        <div><span>Recebido</span><b><CountUp value={s.received} delay={350} /></b></div>
        <div><span>A receber</span><b><CountUp value={s.openTotal} delay={400} /></b></div>
        <div><span>Vendas</span><b><CountUp value={s.count} format={String} delay={450} /></b></div>
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
    if (!go) return null;
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


function Frase({ today }) {
  const f = fraseDoDia(today);
  return (
    <section className="card frase">
      <p className="frase-tag">Frase do dia</p>
      <blockquote>“{f.t}”</blockquote>
      <p className="frase-fonte">— {f.f}</p>
      <p className="frase-por"><b>Por que hoje:</b> {f.p}</p>
    </section>
  );
}

function whats(contact, name) {
  return whatsLink(contact, `Oi, ${name.split(' ')[0]}! Tudo bem? Faz um tempinho que a gente não faz um vídeo juntos. Bora criar o próximo?`);
}

function Ranking({ rank, readOnly }) {
  if (!rank.top.length) return null;
  return (
    <div className="split">
      <div className="card">
        <div className="card-title"><h2>Melhores clientes</h2><span className="faint">desde o início</span></div>
        <ol className="rank">
          {rank.top.map((r, i) => (
            <li key={r.id}>
              <span className={`rank-pos p${i + 1}`}>{i + 1}</span>
              <div className="grow"><b>{r.name}</b><span className="faint">{r.count} venda{r.count === 1 ? '' : 's'}</span></div>
              <span className="v">{money(r.total)}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="card">
        <div className="card-title"><h2>Sumidos</h2><span className="faint">sem comprar há +30 dias</span></div>
        {rank.gone.length ? (
          <ul className="rank">
            {rank.gone.map((r) => {
              const link = !readOnly && whats(r.contact, r.name);
              return (
                <li key={r.id}>
                  <div className="grow"><b>{r.name}</b><span className="faint">última compra há {r.days} dias · {money(r.total)}</span></div>
                  {link ? <a className="btn sm" href={link} target="_blank" rel="noreferrer">Chamar</a> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="faint">Ninguém sumido. Todos os clientes compraram nos últimos 30 dias. 👏</p>
        )}
      </div>
    </div>
  );
}

function DayGoal({ sold, goal }) {
  const pct = Math.min(100, Math.round((sold / goal) * 100));
  const done = sold >= goal;
  return (
    <div className="daygoal">
      <div className="daygoal-bar"><i style={{ width: `${pct}%` }} className={done ? 'done' : ''} /></div>
      <p>{done ? <>Meta do dia batida! 🎯 <b>+{money(sold - goal)}</b></> : <>Faltam <b>{money(goal - sold)}</b> para a meta de hoje ({money(goal)})</>}</p>
    </div>
  );
}
