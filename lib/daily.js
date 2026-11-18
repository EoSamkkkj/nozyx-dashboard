import { computeSale, diffDays, money, summary } from './model';

export const CHARGE_DAYS = 7;

/** Mensagens do fim do dia: resumo das vendas e, se houver, cobranças atrasadas. */
export function dailyMessages(data, today) {
  const s = summary(data, today, today);
  const msgs = [];
  const head = s.count
    ? `${money(s.sold)} em ${s.count} venda${s.count === 1 ? '' : 's'}`
    : 'Nenhuma venda hoje';
  msgs.push({
    title: 'Resumo de hoje 📊',
    body: `${head}\nRecebido hoje: ${money(s.received)} · A receber: ${money(s.openTotal)}`,
    url: '/#geral',
    tag: 'resumo',
  });
  const late = data.sales.filter((x) => {
    const c = computeSale(x);
    return !c.cancelled && c.balance > 0 && diffDays(x.date, today) >= CHARGE_DAYS;
  });
  if (late.length) {
    const total = late.reduce((t, x) => t + computeSale(x).balance, 0);
    const names = late
      .slice(0, 3)
      .map((x) => data.clients.find((c) => c.id === x.clientId)?.name)
      .filter(Boolean)
      .join(', ');
    msgs.push({
      title: 'Cobrança pendente ⏰',
      body: `${late.length} venda${late.length === 1 ? '' : 's'} há mais de ${CHARGE_DAYS} dias sem pagar tudo: ${money(total)}\n${names}${late.length > 3 ? ' e outros' : ''}`,
      url: '/#vendas',
      tag: 'cobranca',
    });
  }
  return msgs;
}
