// Casos de validação pedidos no briefing. Rodar com: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSale, emptyData, normalize, parseMoney, periodRange, series, summary, goalProgress, validatePayment, validateSale } from './model.js';

const TODAY = '2026-11-16';

function base() {
  const d = emptyData();
  d.plans[1].price = 25000; // Essencial R$250
  d.clients.push({ id: 'c1', name: 'Cliente A', contact: '', notes: '' });
  return d;
}

const sale = (over = {}) => ({
  id: 's' + Math.random(), clientId: 'c1', description: '', date: TODAY, planId: 'plano2', planName: 'Essencial',
  qty: 1, mode: 'unit', unitPrice: 25000, packageTotal: 0, addition: 0, additionReason: '', discount: 0, discountReason: '',
  status: 'iniciar', notes: '', payments: [], createdAt: '', ...over,
});

test('venda antiga aparece no período correto', () => {
  const d = base();
  d.sales.push(sale({ date: '2026-10-01' }));
  const [a, b] = periodRange('7', d, TODAY);
  assert.equal(summary(d, a, b).sold, 0);
  const [a2, b2] = periodRange('60', d, TODAY);
  assert.equal(summary(d, a2, b2).sold, 25000);
  const [a3, b3] = periodRange('tudo', d, TODAY);
  assert.equal(a3, '2026-10-01');
  assert.equal(summary(d, a3, b3).sold, 25000);
});

test('pagamento de hoje por venda antiga entra no recebido de hoje, sem virar venda nova', () => {
  const d = base();
  d.sales.push(sale({ date: '2026-10-01', payments: [{ id: 'p1', amount: 25000, date: TODAY, method: 'Pix', note: '' }] }));
  const r = summary(d, TODAY, TODAY);
  assert.equal(r.received, 25000);
  assert.equal(r.sold, 0);
  assert.equal(r.count, 0);
});

test('entrada + parcela não duplicam o faturamento (exemplo R$250 com R$125 de entrada)', () => {
  const d = base();
  const s = sale({ payments: [{ id: 'p1', amount: 12500, date: TODAY, method: 'Pix', note: '' }] });
  d.sales.push(s);
  let r = summary(d, TODAY, TODAY);
  assert.deepEqual([r.sold, r.received, r.pending, r.count], [25000, 12500, 12500, 1]);
  assert.equal(computeSale(s).fin, 'parcial');
  assert.equal(validatePayment(s, 13000, TODAY) !== '', true); // acima do saldo
  s.payments.push({ id: 'p2', amount: 12500, date: TODAY, method: 'Pix', note: '' });
  r = summary(d, TODAY, TODAY);
  assert.deepEqual([r.sold, r.received, r.pending, r.count], [25000, 25000, 0, 1]);
  assert.equal(computeSale(s).fin, 'pago');
});

test('pacote não multiplica o valor negociado', () => {
  const s = sale({ qty: 4, mode: 'package', packageTotal: 80000, addition: 5000, discount: 10000 });
  assert.equal(computeSale(s).total, 75000);
  assert.equal(computeSale(sale({ qty: 4 })).total, 100000);
});

test('mudar o preço do plano não altera vendas antigas', () => {
  const d = base();
  d.sales.push(sale());
  d.plans[1].price = 99900;
  assert.equal(summary(normalize(d), TODAY, TODAY).sold, 25000);
});

test('venda cancelada sai do vendido e do saldo, e fica sinalizada se tinha recebimento', () => {
  const d = base();
  d.sales.push(sale({ status: 'cancelado', payments: [{ id: 'p', amount: 10000, date: TODAY, method: 'Pix', note: '' }] }));
  const r = summary(d, TODAY, TODAY);
  assert.deepEqual([r.sold, r.pending, r.openTotal, r.count], [0, 0, 0, 0]);
  assert.equal(r.review.length, 1);
});

test('valores negativos e desconto maior que a venda são recusados', () => {
  assert.notEqual(validateSale(sale({ discount: 30000 })), '');
  assert.notEqual(validateSale(sale({ addition: -1 })), '');
  assert.notEqual(validatePayment(sale(), -5, TODAY), '');
  assert.equal(validateSale(sale()), '');
});

test('dias sem movimento aparecem com zero; todo o período agrupa', () => {
  const d = base();
  d.sales.push(sale({ date: '2026-11-10' }));
  const { unit, buckets } = series(d, '2026-11-10', TODAY);
  assert.equal(unit, 'dia');
  assert.equal(buckets.length, 7);
  assert.deepEqual(buckets.map((b) => b.sold), [25000, 0, 0, 0, 0, 0, 0]);
  assert.equal(series(d, '2025-01-01', TODAY).unit, 'mês');
});

test('meta mensal mostra quanto falta e o excedente', () => {
  const d = base();
  d.settings.monthlyGoal = 20000;
  d.sales.push(sale());
  const g = goalProgress(d, TODAY);
  assert.deepEqual([g.missing, g.extra, g.pct], [0, 5000, 125]);
});

test('leitura de valores em reais', () => {
  assert.equal(parseMoney('1.234,56'), 123456);
  assert.equal(parseMoney('250'), 25000);
  assert.equal(parseMoney('1.500'), 150000);
  assert.equal(parseMoney('R$ 99,9'), 9990);
  assert.ok(Number.isNaN(parseMoney('abc')));
});

test('vendas do mês: acumulado até hoje e mês anterior completo', async () => {
  const { monthRace } = await import('./model.js');
  const d = base();
  d.sales.push(sale({ date: '2026-11-02' }), sale({ date: '2026-11-10', qty: 2 }), sale({ date: '2026-10-05' }), sale({ date: '2026-11-03', status: 'cancelado' }));
  const r = monthRace(d, TODAY);
  assert.equal(r.current.length, 16);
  assert.equal(r.current[0], 0);
  assert.equal(r.current[1], 25000);
  assert.equal(r.current[15], 75000);
  assert.equal(r.previous.length, 31);
  assert.equal(r.previous[30], 25000);
});
