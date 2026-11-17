import './globals.css';
import NativeFeel from '@/components/NativeFeel';

export const metadata = {
  title: 'Painel financeiro · Nozyx',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Nozyx', statusBarStyle: 'black-translucent' },
};

export const viewport = { themeColor: '#11151D', width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover', colorScheme: 'dark' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <NativeFeel />
        {children}
      </body>
    </html>
  );
}
