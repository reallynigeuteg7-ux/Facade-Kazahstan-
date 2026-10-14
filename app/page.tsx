import SiteImage from '@/app/site-image';
import Link from 'next/link';
import data from './content.json';
import { Header, Footer, Catalog, Contact } from './site';
import OpenChat from './open-chat';
import { directions } from './directions';
import ProjectVideos from './project-videos';
import { brandSchema, jsonLd } from '@/lib/seo';
export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(brandSchema) }} />
      <Header />
      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="status-dot" /> FACADE KAZAKHSTAN
            </div>
            <h1>{data.title}</h1>
            <p>Facade Kazakhstan — производство металлоизделий в Кызылорде. Фасады и благоустройство по вашим размерам, поставки по Казахстану.</p>
            <div className="actions">
              <Link className="button" href="/catalog">
                Перейти в каталог <span>↗</span>
              </Link>
              <OpenChat className="hero-chat">
                Обсудить проект <span>↗</span>
              </OpenChat>
            </div>
            <div className="hero-caption">
              <span className="hero-caption-mark" aria-hidden="true">
                ↳
              </span>
              <span>
                Современное оборудование.
                <br />
                Точная обработка металла.
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <SiteImage
              src="/media/new-facade-17869031-1200.webp"
              alt="Современный металлический фасад"
              fetchPriority="high"
            />
            <div className="hero-shade" />
            <div className="visual-topline">
              <span>FACADE / PRODUCTION</span>
              <span>01 — 15</span>
            </div>
            <Link href="/fasadnye-resheniya" className="hero-feature">
              <span className="feature-icon" aria-hidden="true">
                ↗
              </span>
              <div>
                <small>ДЕТАЛИ, КОТОРЫЕ МЕНЯЮТ ОБЛИК</small>
                <strong>Фасадные решения</strong>
              </div>
            </Link>
            <span className="visual-coordinate">КЫЗЫЛОРДА · КАЗАХСТАН</span>
          </div>
        </section>
        <div className="direction-rail direction-previews">
          <Link href="/fasadnye-resheniya">
            <SiteImage src={directions['fasadnye-resheniya'].photos[0][0]} alt="Фасадные решения" loading="lazy" />
            <div className="direction-preview-caption"><span>01</span> Фасадные решения <b>↗</b></div>
          </Link>
          <Link href="/blagoustroystvo">
            <SiteImage src={directions.blagoustroystvo.photos[0][0]} alt="Благоустройство" loading="lazy" />
            <div className="direction-preview-caption"><span>02</span> Благоустройство <b>↗</b></div>
          </Link>
          <Link href="/obrabotka-metalla">
            <SiteImage src={directions['obrabotka-metalla'].photos[0][0]} alt="Обработка металла" loading="lazy" />
            <div className="direction-preview-caption"><span>03</span> Обработка металла <b>↗</b></div>
          </Link>
        </div>
        <section className="section" id="catalog">
          <div className="section-head">
            <div>
              <span className="eyebrow">01 / ПРОДУКЦИЯ</span>
              <h2>
                Каталог продукции <sup>15</sup>
              </h2>
            </div>
            <Link className="section-link" href="/catalog-pdf">
              Смотреть PDF-каталог <span>↗</span>
            </Link>
          </div>
          <Catalog />
        </section>
        <section className="about section">
          <div className="about-aside">
            <span className="eyebrow">02 / О КОМПАНИИ</span>
            <SiteImage className="about-brand-logo" src="/facade-logo-black.svg" alt="Facade Kazakhstan" width={412} height={320} loading="lazy" />
            <span className="about-location">
              FACADE KAZAKHSTAN
              <br />
              КЫЗЫЛОРДА
            </span>
          </div>
          <div>
            <h2>О нас</h2>
            <p>{data.about}</p>
            <Link className="text-link" href="/o-kompanii">
              Подробнее ↗
            </Link>
          </div>
        </section>
        <section className="section" id="uslugi">
          <div className="section-head">
            <div>
              <span className="eyebrow">03 / ПРОИЗВОДСТВО</span>
              <h2>Наши услуги</h2>
            </div>
            <OpenChat className="section-link">
              Обсудить задачу <span>↗</span>
            </OpenChat>
          </div>
          <div className="service-grid">
            {data.services.map((c, i) => (
              <a href={c.href} key={c.href}>
                <div className="service-photo">
                  <SiteImage src={c.images[0]} alt={c.title} loading="lazy" />
                  <span className="service-index">0{i + 1}</span>
                </div>
                <div className="service-title">
                  <h3>{c.title}</h3>
                  <span>↗</span>
                </div>
              </a>
            ))}
          </div>
        </section>
        <section className="section projects" id="raboty">
          <div className="section-head">
            <div>
              <span className="eyebrow">04 / РАБОТЫ</span>
              <h2>Галерея проектов</h2>
            </div>
            <span className="projects-arrow" aria-hidden="true">
              ↙
            </span>
          </div>
          <p>
            Посмотрите на нашу продукцию в различных проектах и узнайте, как она
            улучшает внешний вид и функциональность.
          </p>
          <ProjectVideos />
          <div className="gallery">
            {data.gallery.map((u, i) => (
              <a href={u} key={u} target="_blank" rel="noreferrer">
                <SiteImage src={u} alt={'Проект ' + (i + 1)} loading="lazy" />
                <span className="gallery-caption">
                  FACADE / {String(i + 1).padStart(2, '0')}
                  <b>↗</b>
                </span>
              </a>
            ))}
          </div>
        </section>
        <section className="section essay">
          <details>
            <summary>
              Компания Facade Kazakhstan <span>+</span>
            </summary>
            <p>{data.essay}</p>
          </details>
        </section>
        <Contact />
      </main>
      <Footer />
    </>
  );
}
