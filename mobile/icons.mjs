// Gera os ícones do app Android (launcher, notificação e splash) a partir do logo N da Nozyx.
// Rodar da raiz do repositório: node mobile/icons.mjs
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const res = 'mobile/android/app/src/main/res';
const BG = '#11151D';
const logo = fs.readFileSync('public/favicon.svg');
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const out = (dir, name) => {
  fs.mkdirSync(path.join(res, dir), { recursive: true });
  return path.join(res, dir, name);
};

for (const [d, k] of Object.entries(dens)) {
  // ícone adaptativo: frente (logo dentro da zona segura) em fundo escuro
  const fg = Math.round(108 * k);
  const inner = Math.round(fg * 0.42);
  const pad = Math.round((fg - inner) / 2);
  const n = await sharp(logo).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: fg, height: fg, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: n, left: pad, top: pad }]).png().toFile(out(`mipmap-${d}`, 'ic_launcher_foreground.png'));
  // ícone antigo (Android < 8): quadrado arredondado
  const s = Math.round(48 * k);
  const r = Math.round(s * 0.22);
  const ni = Math.round(s * 0.56);
  const mask = Buffer.from(`<svg width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="${r}" fill="${BG}"/></svg>`);
  const n2 = await sharp(logo).resize(ni, ni).png().toBuffer();
  const off = Math.round((s - ni) / 2);
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    await sharp(mask).composite([{ input: n2, left: off, top: off }]).png().toFile(out(`mipmap-${d}`, name));
  }
  // ícone pequeno da notificação: N branco em fundo transparente
  const st = Math.round(24 * k);
  const white = Buffer.from(fs.readFileSync('public/favicon.svg', 'utf8').replace(/fill="[^"]*"/g, 'fill="#FFFFFF"'));
  await sharp(white).resize(st, st).png().toFile(out(`drawable-${d}`, 'ic_stat_nozyx.png'));
}

// splash: logo no centro do fundo escuro
const logoSplash = await sharp(logo).resize(220, 220).png().toBuffer();
await sharp({ create: { width: 1080, height: 1920, channels: 4, background: BG } })
  .composite([{ input: logoSplash, gravity: 'center' }]).png().toFile(out('drawable', 'splash.png'));
for (const dir of fs.readdirSync(res).filter((x) => /^drawable-(land|port)-/.test(x))) {
  fs.copyFileSync(path.join(res, 'drawable', 'splash.png'), path.join(res, dir, 'splash.png'));
}

fs.writeFileSync(path.join(res, 'values', 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
fs.writeFileSync(path.join(res, 'values', 'nozyx_colors.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="nozyx_azul">#4A98FF</color>\n    <color name="nozyx_fundo">${BG}</color>\n</resources>\n`);
console.log('ícones gerados');
