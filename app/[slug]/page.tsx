import SiteImage from '@/app/site-image';
import Link from 'next/link';
import data from '../content.json';
import { Header, Footer, Catalog, Contact } from '../site';
import { notFound } from 'next/navigation';
import { DirectionPage, directions } from '../directions';
import ProjectVideos from '../project-videos';
import { brandName, breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
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
export function generateStaticParams() {
  return [...new Set([...Object.keys(data.pages), ...Object.keys(directions)])].map((slug) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = (data.pages as Record<string, Page>)[slug];
  const direction = directions[slug];
  if (!p && !direction) notFound();
  const title = direction?.title || p.title;
  const catalogItem = data.catalog.find((item) => item.href === `/${slug}`);
  const service = data.services.find((item) => item.href === `/${slug}`);
  const text = direction?.description || catalogItem?.description || service?.description || p.sections.flatMap((section) => section.text).join(' ').replace(/\s+/g, ' ').trim();
  const description = slug === 'catalog'
    ? 'Каталог Facade Kazakhstan: скамейки, урны, светильники, беседки, фасадные панели и кассеты. Изготовление в Кызылорде по размерам заказчика.'
    : slug === 'o-kompanii'
      ? 'Facade Kazakhstan — производственная компания в Кызылорде. Металлоизделия, фасадные решения и малые архитектурные формы. Адрес: Қорқыт ата 117г.'
      : text.length > 165 ? text.slice(0, 162).replace(/\s+\S*$/, '') + '…' : text;
  const image = direction?.photos[0]?.[0] || catalogItem?.images[0] || service?.images[0] || p.sections.flatMap((section) => section.images)[0];
  return {
    ...pageMetadata(title.includes(brandName) ? title : `${title} — ${brandName}`, description, `/${slug}`, image),
    ...(slug === 'discount' && { robots: { index: false, follow: true } }),
  };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const direction = directions[slug];
  if (direction) return <><Header /><main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(direction.title, `/${slug}`)) }} /><DirectionPage direction={direction} videos={<ProjectVideos direction={slug} />} /><Contact /></main><Footer /></>;
  const p = (data.pages as Record<string, Page>)[slug];
  if (!p) notFound();
  return (
    <>
      <Header />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(p.title, `/${slug}`)) }} />
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
