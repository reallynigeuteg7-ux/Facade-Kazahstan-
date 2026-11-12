import SiteImage from '@/app/site-image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import data from '../content.json';
import { Header, Footer, Catalog, Contact, InfoCards } from '../site';
import { notFound } from 'next/navigation';
import { DirectionPage, directions } from '../directions';
import ProjectVideos from '../project-videos';
import { brandName, breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
type Page = {
  title: string;
  description?: string;
  image?: string;
  highlights?: { title: string; text: string }[];
};
const pages: Record<string, Page | undefined> = data.pages;
export function generateStaticParams() {
  return [...new Set([...Object.keys(data.pages), ...Object.keys(directions)])].map((slug) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const direction = directions[slug];
  if (direction) return pageMetadata(
    `${direction.title} — ${brandName}`,
    direction.description,
    `/${slug}`,
    direction.photos[0]?.[0],
  );
  const p = pages[slug];
  if (!p) notFound();
  const description = slug === 'catalog'
    ? 'Каталог Facade Kazakhstan: скамейки, урны, светильники, беседки, фасадные панели и кассеты. Изготовление в Кызылорде по размерам заказчика.'
    : slug === 'o-kompanii'
      ? 'Facade Kazakhstan — производственная компания в Кызылорде. Металлоизделия, фасадные решения и малые архитектурные формы. Адрес: Қорқыт ата 117г.'
      : p.description;
  return {
    ...pageMetadata(p.title.includes(brandName) ? p.title : `${p.title} — ${brandName}`, description ?? '', `/${slug}`, p.image),
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
  const p = pages[slug];
  if (!p) notFound();
  const infoTitle = slug === 'o-kompanii' ? 'Что мы делаем'
    : slug === 'discount' ? 'Что указать для предложения'
    : 'Что важно для заказа';
  return (
    <>
      <Header />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(p.title, `/${slug}`)) }} />
        <section className={`detail-hero site-container${p.image ? ' detail-hero-with-media' : ''}`}>
          <div>
            <Link className="crumb" href="/">
              Главная
            </Link>
            <h1>{p.title}</h1>
            {p.description && <p className="detail-lead">{p.description}</p>}
            {slug !== 'catalog' && (
              <Link className="button" href="#contact">
                {slug === 'o-kompanii' ? 'Связаться с нами' : 'Запросить расчёт'} <ArrowRight size={17} aria-hidden />
              </Link>
            )}
          </div>
          {p.image && (
            <SiteImage
              className="detail-hero-image"
              src={p.image}
              alt={p.title}
              sizes="(max-width: 800px) 94vw, 50vw"
              fetchPriority="high"
            />
          )}
        </section>
        {slug === 'catalog' && (
          <section className="section site-container">
            <Catalog />
          </section>
        )}
        {p.highlights && <InfoCards title={infoTitle} items={p.highlights} />}
        <Contact />
      </main>
      <Footer />
    </>
  );
}
