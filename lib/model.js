// Regras de negócio do painel: formato dos dados, cálculos e períodos.
// Usado no navegador e no servidor. Valores em centavos (inteiros).

export const TZ = 'America/Sao_Paulo';

export const STATUS = { iniciar: 'A iniciar', producao: 'Em produção', entregue: 'Entregue', cancelado: 'Cancelado' };
export const FIN = { nao: 'Não pago', parcial: 'Parcialmente pago', pago: 'Pago' };
export const METHODS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Boleto', 'Outro'];
export const CUSTOM = 'Personalizado';

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);

export function emptyData() {
  return {
    version: 1,
    rev: 0,
    settings: { name: 'Nozyx', accent: '#4A98FF', monthlyGoal: 0 },
    // os nomes vêm prontos, mas o preço fica em branco até o Sam definir
    plans: ['Express', 'Essencial', 'Intermediário', 'Exclusivo'].map((name, i) => ({
      id: `plano${i + 1}`, name, description: '', price: null,
    })),
    clients: [],
    sales: [],
  };
}

const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v, max = 500) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v, min = 0) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min ? n : min;
};
const id = (v) => (typeof v === 'string' && v ? v.slice(0, 40) : uid());
export const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** Garante o formato esperado (dados salvos, backup restaurado) e descarta o resto. */
export function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const d = emptyData();
  const s = r.settings || {};
  d.settings = {
    name: str(s.name, 60).trim() || 'Nozyx',
    accent: /^#[0-9a-fA-F]{6}$/.test(s.accent) ? s.accent : '#4A98FF',
    monthlyGoal: int(s.monthlyGoal),
  };
  if (Array.isArray(r.plans)) {
    d.plans = r.plans
      .filter((p) => p && str(p.name).trim())
      .map((p) => ({
        id: id(p.id),
        name: str(p.name, 80).trim(),
        description: str(p.description, 400),
        price: p.price == null || p.price === '' ? null : int(p.price),
      }));
  }
  d.clients = arr(r.clients)
    .filter((c) => c && str(c.name).trim())
    .map((c) => ({ id: id(c.id), name: str(c.name, 120).trim(), contact: str(c.contact, 120), notes: str(c.notes, 1000) }));
  const clientIds = new Set(d.clients.map((c) => c.id));
  d.sales = arr(r.sales)
    .filter((x) => x && isDate(x.date) && clientIds.has(x.clientId))
    .map((x) => ({
      id: id(x.id),
      clientId: x.clientId,
      description: str(x.description, 200),
      date: x.date,
      planId: typeof x.planId === 'string' && x.planId ? x.planId : null,
      planName: str(x.planName, 80) || CUSTOM,
      qty: int(x.qty, 1),
      mode: x.mode === 'package' ? 'package' : 'unit',
      unitPrice: int(x.unitPrice),
      packageTotal: int(x.packageTotal),
      addition: int(x.addition),
      additionReason: str(x.additionReason, 200),
      discount: int(x.discount),
      discountReason: str(x.discountReason, 200),
      status: STATUS[x.status] ? x.status : 'iniciar',
      notes: str(x.notes, 2000),
      payments: arr(x.payments)
        .filter((p) => p && isDate(p.date) && int(p.amount) > 0)
        .map((p) => ({ id: id(p.id), amount: int(p.amount), date: p.date, method: str(p.method, 40) || 'Pix', note: str(p.note, 300) })),
      createdAt: str(x.createdAt, 40),
    }));
  d.rev = int(r.rev);
  return d;
}

/* ---------- valores ---------- */

/** Pacote: o total negociado vale para todos os vídeos, sem multiplicar. */
export const saleBase = (s) => (s.mode === 'package' ? s.packageTotal : s.qty * s.unitPrice);

export function computeSale(s) {
  const base = saleBase(s);
  const total = Math.max(0, base + s.addition - s.discount);
  const received = s.payments.reduce((t, p) => t + p.amount, 0);
  const cancelled = s.status === 'cancelado';
  const balance = cancelled ? 0 : Math.max(0, total - received);
  const fin = received <= 0 ? 'nao' : received >= total ? 'pago' : 'parcial';
  return { base, total, received, balance, fin, cancelled, review: cancelled && received > 0 };
}

/** Retorna a mensagem de erro, ou '' se a venda está ok. */
export function validateSale(s) {
  if (!s.clientId) return 'Escolha ou cadastre o cliente.';
  if (!isDate(s.date)) return 'Informe a data da venda.';
  if (!(s.qty >= 1)) return 'A quantidade de vídeos precisa ser pelo menos 1.';
  for (const v of [s.unitPrice, s.packageTotal, s.addition, s.discount]) {
    if (Number.isNaN(v)) return 'Algum valor está em formato inválido. Use, por exemplo, 250 ou 250,50.';
    if (v < 0) return 'Os valores não podem ser negativos.';
  }
  const base = saleBase(s);
  if (s.discount > base + s.addition) return `O desconto (${money(s.discount)}) é maior que o valor da venda (${money(base + s.addition)}).`;
  const { total, received } = computeSale(s);
  if (s.status !== 'cancelado' && received > total) {
    return `Esta venda já tem ${money(received)} recebidos, mais que o novo total de ${money(total)}. Ajuste o valor ou apague um recebimento antes.`;
  }
  return '';
}

/** Retorna a mensagem de erro do recebimento, ou ''. */
export function validatePayment(sale, amount, date) {
  if (Number.isNaN(amount)) return 'Valor inválido. Use, por exemplo, 125 ou 125,50.';
  if (!(amount > 0)) return 'O valor recebido precisa ser maior que zero.';
  if (!isDate(date)) return 'Informe a data em que o dinheiro entrou.';
  const c = computeSale(sale);
  if (c.cancelled) return 'Esta venda está cancelada. Reative a venda antes de registrar um recebimento.';
  if (c.balance === 0) return 'Esta venda já está paga. Se o cliente pagou um extra, adicione um acréscimo na venda primeiro.';
  if (amount > c.balance) {
    return `O saldo desta venda é ${money(c.balance)}, e você informou ${money(amount)}. Se o valor combinado aumentou, edite a venda e adicione um acréscimo.`;
  }
  return '';
}

/* ---------- formatos ---------- */

export const money = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "1.234,56", "250", "250.5", "R$ 99" → centavos. Vazio vira 0; texto inválido vira NaN. */
export function parseMoney(v) {
  let s = String(v ?? '').trim().replace(/R\$|\s/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

/** Centavos → texto para o campo ("250" ou "250,50"). */
export const moneyInput = (c) => (c == null ? '' : c % 100 ? (c / 100).toFixed(2).replace('.', ',') : String(c / 100));

export const brDate = (s) => (s ? s.split('-').reverse().join('/') : '');

/* ---------- datas (sempre no fuso de São Paulo) ---------- */

export function todaySP(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const noon = (s) => Date.parse(`${s}T12:00:00Z`);
export function addDays(s, n) {
  const d = new Date(noon(s));
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const diffDays = (a, b) => Math.round((noon(b) - noon(a)) / 864e5);

export const PERIODS = [
  ['hoje', 'Hoje'],
  ['7', 'Últimos 7 dias'],
  ['30', 'Últimos 30 dias'],
  ['60', 'Últimos 60 dias'],
  ['tudo', 'Todo o período'],
  ['custom', 'Personalizado'],
];

/** Períodos móveis incluem hoje: "últimos 7 dias" = hoje e os 6 anteriores. */
export function periodRange(key, data, today = todaySP(), custom = {}) {
  if (key === 'hoje') return [today, today];
  if (['7', '30', '60'].includes(key)) return [addDays(today, -(Number(key) - 1)), today];
  if (key === 'custom') {
    const a = isDate(custom.from) ? custom.from : today;
    const b = isDate(custom.to) ? custom.to : today;
    return a <= b ? [a, b] : [b, a];
  }
  let first = today;
  let last = today;
  for (const s of data.sales) {
    if (s.date < first) first = s.date;
    if (s.date > last) last = s.date;
    for (const p of s.payments) {
      if (p.date < first) first = p.date;
      if (p.date > last) last = p.date;
    }
  }
  return [first, last];
}

const within = (d, a, b) => d >= a && d <= b;

/* ---------- indicadores ---------- */

export function summary(data, a, b) {
  let sold = 0, received = 0, pending = 0, count = 0, videos = 0, openTotal = 0;
  const byPlan = new Map();
  for (const s of data.sales) {
    const c = computeSale(s);
    openTotal += c.balance;
    for (const p of s.payments) if (within(p.date, a, b)) received += p.amount;
    if (c.cancelled || !within(s.date, a, b)) continue;
    sold += c.total;
    pending += c.balance;
    count += 1;
    videos += s.qty;
    const k = s.planName || CUSTOM;
    const row = byPlan.get(k) || { name: k, value: 0, count: 0 };
    row.value += c.total;
    row.count += 1;
    byPlan.set(k, row);
  }
  return {
    sold, received, pending, count, videos, openTotal,
    ticket: count ? Math.round(sold / count) : 0,
    byPlan: [...byPlan.values()].sort((x, y) => y.value - x.value),
    review: data.sales.filter((s) => computeSale(s).review),
  };
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Vendido × recebido ao longo do período; dias sem movimento ficam com zero. */
export function series(data, a, b) {
  const span = diffDays(a, b) + 1;
  const unit = span <= 62 ? 'dia' : span <= 210 ? 'semana' : 'mês';
  const [y0, m0] = a.split('-').map(Number);
  const buckets = [];
  if (unit === 'mês') {
    const [y1, m1] = b.split('-').map(Number);
    for (let i = 0; i <= (y1 - y0) * 12 + (m1 - m0); i++) {
      const m = (m0 - 1 + i) % 12;
      const y = y0 + Math.floor((m0 - 1 + i) / 12);
      buckets.push({ label: `${MONTHS[m]}/${String(y).slice(2)}`, sold: 0, received: 0 });
    }
  } else {
    const step = unit === 'dia' ? 1 : 7;
    for (let i = 0; i < span; i += step) {
      const d = addDays(a, i);
      buckets.push({ label: `${d.slice(8)}/${d.slice(5, 7)}`, from: d, sold: 0, received: 0 });
    }
  }
  const index = (d) => {
    if (unit === 'mês') {
      const [y, m] = d.split('-').map(Number);
      return (y - y0) * 12 + (m - m0);
    }
    return Math.floor(diffDays(a, d) / (unit === 'dia' ? 1 : 7));
  };
  for (const s of data.sales) {
    const c = computeSale(s);
    if (!c.cancelled && within(s.date, a, b)) buckets[index(s.date)].sold += c.total;
    for (const p of s.payments) if (within(p.date, a, b)) buckets[index(p.date)].received += p.amount;
  }
  return { unit, buckets };
}

/** Meta do mês atual, pela data da venda. */
export function goalProgress(data, today = todaySP()) {
  const goal = data.settings.monthlyGoal;
  const { sold } = summary(data, `${today.slice(0, 7)}-01`, today);
  return {
    goal, sold,
    missing: Math.max(0, goal - sold),
    extra: Math.max(0, sold - goal),
    pct: goal ? Math.round((sold / goal) * 100) : 0,
  };
}

/**
 * Vendido acumulado dia a dia no mês atual, ao lado do mês anterior,
 * para ver se o mês está à frente ou atrás.
 */
export function monthRace(data, today = todaySP()) {
  const [y, m] = today.split('-').map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const days = (yy, mm) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const pad = (n) => String(n).padStart(2, '0');
  const cumulative = (yy, mm, upTo) => {
    const prefix = `${yy}-${pad(mm)}-`;
    const perDay = new Array(days(yy, mm)).fill(0);
    for (const s of data.sales) {
      if (!s.date.startsWith(prefix) || s.status === 'cancelado') continue;
      perDay[Number(s.date.slice(8)) - 1] += computeSale(s).total;
    }
    let acc = 0;
    return perDay.slice(0, upTo).map((v) => (acc += v));
  };
  const day = Number(today.slice(8));
  return {
    days: days(y, m),
    today: day,
    current: cumulative(y, m, day),
    previous: cumulative(prevY, prevM, days(prevY, prevM)),
    prevLabel: MONTHS[prevM - 1],
    label: MONTHS[m - 1],
    goal: data.settings.monthlyGoal,
  };
}

export function clientTotals(data, clientId) {
  let sold = 0, received = 0, pending = 0, count = 0;
  for (const s of data.sales) {
    if (s.clientId !== clientId) continue;
    const c = computeSale(s);
    received += c.received;
    if (c.cancelled) continue;
    sold += c.total;
    pending += c.balance;
    count += 1;
  }
  return { sold, received, pending, count };
}

/* ---------- exportação ---------- */

const cell = (v) => {
  const t = String(v ?? '');
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const num = (c) => (c / 100).toFixed(2).replace('.', ',');
// ";" e vírgula decimal: abre direto no Excel em português
const csv = (rows) => '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');

export function salesCsv(data) {
  const client = new Map(data.clients.map((c) => [c.id, c.name]));
  const rows = [['Data', 'Cliente', 'Serviço', 'Plano', 'Vídeos', 'Tipo de preço', 'Preço unitário', 'Total do pacote', 'Acréscimo', 'Motivo do acréscimo', 'Desconto', 'Motivo do desconto', 'Valor final', 'Recebido', 'Saldo', 'Situação financeira', 'Status do trabalho', 'Observações']];
  for (const s of [...data.sales].sort((x, y) => x.date.localeCompare(y.date))) {
    const c = computeSale(s);
    rows.push([brDate(s.date), client.get(s.clientId), s.description, s.planName, s.qty, s.mode === 'package' ? 'Pacote' : 'Por vídeo', num(s.unitPrice), s.mode === 'package' ? num(s.packageTotal) : '', num(s.addition), s.additionReason, num(s.discount), s.discountReason, num(c.total), num(c.received), num(c.balance), FIN[c.fin], STATUS[s.status], s.notes]);
  }
  return csv(rows);
}

export function paymentsCsv(data) {
  const client = new Map(data.clients.map((c) => [c.id, c.name]));
  const rows = [['Data do recebimento', 'Valor', 'Forma de pagamento', 'Cliente', 'Serviço', 'Data da venda', 'Observação']];
  const all = data.sales.flatMap((s) => s.payments.map((p) => ({ p, s })));
  for (const { p, s } of all.sort((x, y) => x.p.date.localeCompare(y.p.date))) {
    rows.push([brDate(p.date), num(p.amount), p.method, client.get(s.clientId), s.description || s.planName, brDate(s.date), p.note]);
  }
  return csv(rows);
}
