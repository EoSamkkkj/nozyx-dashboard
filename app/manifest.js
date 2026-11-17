// Torna o painel instalável no celular ("Adicionar à tela inicial").
export default function manifest() {
  return {
    name: 'Nozyx · Painel financeiro',
    short_name: 'Nozyx',
    description: 'Vendas e recebimentos da Nozyx',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#11151D',
    theme_color: '#11151D',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
