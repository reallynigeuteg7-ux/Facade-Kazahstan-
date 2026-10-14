import Chat from './chat';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { brandName, homeTitle, homeDescription, pageMetadata, siteUrl } from '@/lib/seo';
const manrope = localFont({
  src: '../public/fonts/manrope-variable.ttf',
  variable: '--font-manrope',
  weight: '200 800',
  display: 'swap',
});
import './globals.css';
import './drawing.css';
import './redesign.css';
export const metadata: Metadata = {
  ...pageMetadata(homeTitle, homeDescription, '/'),
  metadataBase: new URL(siteUrl),
  applicationName: brandName,
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.YANDEX_SITE_VERIFICATION || undefined,
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        {children}
        <Chat />
      </body>
    </html>
  );
}
