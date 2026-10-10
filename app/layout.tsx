import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TestGennis',
  description: 'TestGennis demo admin panel'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
