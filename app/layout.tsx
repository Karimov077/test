import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TestGennis',
  description: 'Telegram-based student testing platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
