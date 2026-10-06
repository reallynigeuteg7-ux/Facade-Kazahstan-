import SiteImage from '@/app/site-image';
import Link from 'next/link';
import data from '../content.json';
import { Header, Footer, Catalog, Contact } from '../site';
import { notFound } from 'next/navigation';
import { DirectionPage, directions } from '../directions';
import ProjectVideos from '../project-videos';
type Section = {
  text: string[];
  images: string[];
  cards: {
    title: string;
    description: string;
    href: string;
    images: string[];
  }[];
};
type Page = { title: string; sections: Section[]; unavailable?: boolean };
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = (data.pages as Record<string, Page>)[slug];
  const direction = directions[slug];
  return { title: (direction?.title || p?.title || 'Каталог продукции') + ' — Facade Kazahstan', ...(direction && { description: direction.description }) };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const direction = directions[slug];
  if (direction) return <><Header /><main><DirectionPage direction={direction} videos={slug === 'fasadnye-resheniya' ? <ProjectVideos /> : undefined} /><Contact /></main><Footer /></>;
  const p = (data.pages as Record<string, Page>)[slug];
  if (!p) notFound();
  return (
    <>
      <Header />
      <main>
        <section className="detail-hero">
          <a className="crumb" href={slug === 'catalog' ? '/' : '/catalog'}>
            Главная / Каталог продукции
          </a>
          <h1>{p.title}</h1>
          {slug !== 'catalog' && (
            <Link className="button" href="/#contact">
              Связаться с нами ↗
            </Link>
          )}
        </section>
        {slug === 'catalog' ? (
          <section className="section">
            <Catalog />
          </section>
        ) : (
          <div className="detail-main">
            {p.unavailable && (
              <p className="empty-note">
                Информация уточняется. Свяжитесь с нами, чтобы узнать
                подробности.
              </p>
            )}
            {p.sections.map((s, i) => (
              <section className="detail-section" key={i}>
                <div className="detail-copy">
                  {s.text.map((t, j) => (
                    <p key={j}>{t}</p>
                  ))}
                </div>
                <div>
                  {s.images.map((u) => (
                    <SiteImage key={u} src={u} alt={p.title} loading="lazy" />
                  ))}
                </div>
                {s.cards.map((c, j) => (
                  <article key={j}>
                    <h3>{c.title}</h3>
                    <p>{c.description}</p>
                    {c.images.map((u) => (
                      <SiteImage key={u} src={u} alt={c.title} loading="lazy" />
                    ))}
                    <a href={c.href || '/#contact'}>Подробнее ↗</a>
                  </article>
                ))}
              </section>
            ))}
          </div>
        )}
        <Contact />
      </main>
      <Footer />
    </>
  );
}
