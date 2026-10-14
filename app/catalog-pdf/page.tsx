import Link from 'next/link';
import { Header, Footer } from '../site';
import Viewer from './viewer';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('PDF-каталог продукции — Facade Kazakhstan', 'Каталог Facade Kazakhstan: скамейки, урны, светильники и другие металлоизделия. Фотографии, размеры и комплекты для благоустройства.', '/catalog-pdf', '/catalog-document/page-1.jpg');
export default function Page() {
  return (
    <>
      <Header />
      <main className="document-main">
        <Link className="crumb" href="/catalog">
          ← Каталог продукции
        </Link>
        <h1>Каталог продукции</h1>
        <p>Каталог от 29.08.2026 · 22 страницы</p>
        <Viewer />
      </main>
      <Footer />
    </>
  );
}
