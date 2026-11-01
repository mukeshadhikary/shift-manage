import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ja } from '@/lib/i18n/ja';

export const metadata: Metadata = {
  title: ja.app.title,
  description: ja.app.subtitle,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[#F2F2F7] text-[#111111] antialiased">
        {children}
      </body>
    </html>
  );
}
