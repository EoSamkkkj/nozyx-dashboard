'use client';

import { useEffect, useRef, useState } from 'react';
import { brDate, computeSale, money, todaySP } from '@/lib/model';
import { Modal } from './ui';
import { isNative } from './native';

const W = 1080, H = 1350;

function loadLogo() {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = '/favicon.svg';
  });
}

function round(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Desenha o recibo da venda num canvas 1080×1350 (formato bom para WhatsApp e Instagram). */
async function draw(canvas, { sale, client, name }) {
  const c = computeSale(sale);
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
  const font = (w, s) => `${w} ${s}px Inter, "Segoe UI", Roboto, Arial, sans-serif`;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#162033');
  bg.addColorStop(1, '#0d1118');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W - 120, 120, 10, W - 120, 120, 520);
  glow.addColorStop(0, 'rgba(74,152,255,.35)');
  glow.addColorStop(1, 'rgba(74,152,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const logo = await loadLogo();
  if (logo) ctx.drawImage(logo, 90, 90, 84, 84);
  ctx.fillStyle = '#fff';
  ctx.font = font(700, 46);
  ctx.fillText(name, logo ? 196 : 90, 148);
  ctx.fillStyle = '#6CB8FF';
  ctx.font = font(700, 26);
  ctx.fillText('RECIBO', W - 90 - ctx.measureText('RECIBO').width, 146);

  let y = 290;
  ctx.fillStyle = 'rgba(221,238,255,.65)';
  ctx.font = font(500, 28);
  ctx.fillText('Cliente', 90, y);
  ctx.fillStyle = '#fff';
  ctx.font = font(700, 44);
  ctx.fillText(client?.name || 'Cliente', 90, y + 56);

  y += 140;
  ctx.fillStyle = 'rgba(221,238,255,.65)';
  ctx.font = font(500, 28);
  ctx.fillText('Serviço', 90, y);
  ctx.fillStyle = '#fff';
  ctx.font = font(600, 34);
  const desc = sale.description || sale.planName;
  ctx.fillText(desc.length > 44 ? `${desc.slice(0, 43)}…` : desc, 90, y + 48);
  ctx.fillStyle = 'rgba(221,238,255,.7)';
  ctx.font = font(500, 28);
  ctx.fillText(`${sale.qty} vídeo${sale.qty > 1 ? 's' : ''} · venda em ${brDate(sale.date)}`, 90, y + 92);

  y += 150;
  round(ctx, 90, y, W - 180, 230, 32);
  const card = ctx.createLinearGradient(90, y, W - 90, y + 230);
  card.addColorStop(0, '#2d6fd6');
  card.addColorStop(1, '#4A98FF');
  ctx.fillStyle = card;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.font = font(500, 28);
  ctx.fillText('Valor total', 130, y + 62);
  ctx.fillStyle = '#fff';
  ctx.font = font(800, 84);
  ctx.fillText(money(c.total), 130, y + 160);
  const paid = c.balance === 0;
  const tag = paid ? 'PAGO' : `FALTA ${money(c.balance)}`;
  ctx.font = font(800, 26);
  const tw = ctx.measureText(tag).width + 44;
  round(ctx, W - 130 - tw, y + 34, tw, 52, 26);
  ctx.fillStyle = paid ? '#3ccf91' : '#FFC24A';
  ctx.fill();
  ctx.fillStyle = '#10151f';
  ctx.fillText(tag, W - 130 - tw + 22, y + 70);

  y += 300;
  ctx.fillStyle = 'rgba(221,238,255,.65)';
  ctx.font = font(500, 28);
  ctx.fillText('Pagamentos', 90, y);
  y += 20;
  const pays = sale.payments.slice(-5);
  if (!pays.length) {
    ctx.fillStyle = 'rgba(221,238,255,.5)';
    ctx.fillText('Nenhum pagamento registrado ainda.', 90, y + 50);
    y += 70;
  }
  for (const p of pays) {
    y += 64;
    ctx.fillStyle = '#fff';
    ctx.font = font(600, 32);
    ctx.fillText(`${brDate(p.date)} · ${p.method}`, 90, y);
    const v = money(p.amount);
    ctx.fillText(v, W - 90 - ctx.measureText(v).width, y);
    ctx.strokeStyle = 'rgba(221,238,255,.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, y + 24);
    ctx.lineTo(W - 90, y + 24);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(221,238,255,.5)';
  ctx.font = font(500, 24);
  ctx.fillText(`Recebido: ${money(c.received)}   ·   Emitido em ${brDate(todaySP())}`, 90, H - 90);
  ctx.fillStyle = '#6CB8FF';
  ctx.font = font(700, 24);
  const thanks = 'Obrigado pela parceria!';
  ctx.fillText(thanks, W - 90 - ctx.measureText(thanks).width, H - 90);
}

async function share(canvas, fileName, notify) {
  const dataUrl = canvas.toDataURL('image/png');
  const P = window.Capacitor?.Plugins;
  if (isNative() && P?.Filesystem && P?.Share) {
    const { uri } = await P.Filesystem.writeFile({ path: fileName, data: dataUrl.split(',')[1], directory: 'CACHE' });
    await P.Share.share({ title: 'Recibo', files: [uri], dialogTitle: 'Enviar recibo' });
    return;
  }
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Recibo' });
    return;
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  a.click();
  notify?.('Recibo baixado.');
}

export default function Receipt({ sale, client, name, onClose, notify }) {
  const ref = useRef(null);
  const [src, setSrc] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    draw(ref.current, { sale, client, name }).then(() => setSrc(ref.current.toDataURL('image/png')));
  }, [sale, client, name]);
  const fileName = `recibo-${(client?.name || 'cliente').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}-${sale.date}.png`;

  async function send() {
    setBusy(true);
    try {
      await share(ref.current, fileName, notify);
    } catch (e) {
      if (e?.name !== 'AbortError' && !/cancel/i.test(e?.message || '')) notify?.('Não deu para compartilhar o recibo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Recibo" sub="Imagem pronta para mandar ao cliente" onClose={onClose}>
      <canvas ref={ref} style={{ display: 'none' }} />
      <div className="stack" style={{ gap: 14 }}>
        {src ? <img className="receipt-img" src={src} alt="Recibo da venda" /> : <p className="faint">Gerando…</p>}
        <button className="btn primary" onClick={send} disabled={!src || busy}>{busy ? 'Abrindo…' : 'Enviar recibo'}</button>
      </div>
    </Modal>
  );
}
