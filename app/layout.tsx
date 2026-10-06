import Chat from './chat';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
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
  metadataBase: new URL('https://facade-kazahstan.vercel.app'),
  title: 'Facade Kazahstan — металлоизделия и фасадные решения',
  description:
    'Изготовление скамеек, урн, корзин для кондиционеров, фасадных кассет и металлических конструкций. Поставки по всему Казахстану.',
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
