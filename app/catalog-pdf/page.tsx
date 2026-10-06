import Link from 'next/link';
import { Header, Footer } from '../site';
import Viewer from './viewer';
export const metadata = { title: 'Каталог 29.08.2026 — Facade Kazahstan' };
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
