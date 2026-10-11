import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'TestGennis - Matematika va Kasrlar Mashq Portali',
  description: 'Oddiy kasrlar ustida amallar, sonning kasri va matnli masalalar bo‘yicha interaktiv test platformasi'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#3b82f6'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
