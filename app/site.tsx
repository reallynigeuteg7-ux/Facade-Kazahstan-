import SiteImage from '@/app/site-image';
import Link from 'next/link';
import data from './content.json';
import OpenChat from './open-chat';
export function Header() {
  return (
    <>
      <div className="utility-bar">
        <span>Производство металлоизделий</span>
        <span>
          Кызылорда <i /> По всему Казахстану
        </span>
      </div>
      <header className="header">
        <Link className="logo" href="/" aria-label="Facade Kazahstan — главная">
          <span className="brand-logo">
            <SiteImage src="/facade-logo-black.svg" alt="Facade Kazakhstan KZO" width={412} height={320} />
          </span>
        </Link>
        <nav aria-label="Главное меню">
          <Link href="/catalog">Каталог продукции</Link>
          <Link href="/o-kompanii">О компании</Link>
          <Link href="/#raboty">Работы</Link>
          <Link href="/discount">Акции</Link>
          <Link href="/#contact">Контакты</Link>
        </nav>
        <a className="phone" href="tel:+77765773666">
          +7 776 577 36 66
        </a>
        <OpenChat className="header-cta">
          Обсудить заказ <span>↗</span>
        </OpenChat>
      </header>
    </>
  );
}
export function Catalog() {
  return (
    <div className="catalog-grid">
      {data.catalog.map((c, i) => (
        <article className="card" key={c.href}>
          <a href={c.href} className="product-image">
            <span className="product-number">
              FK / {String(i + 1).padStart(2, '0')}
            </span>
            <SiteImage src={c.images[0]} alt={c.title} loading="lazy" />
            <span className="round-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
          <div className="card-copy">
            <h3>
              <a href={c.href}>{c.title}</a>
            </h3>
            <p>{c.description}</p>
            <div className="card-actions">
              <a href={c.href}>Подробнее ↗</a>
              <a href="https://wa.me/77765773666">Написать на WhatsApp</a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
export function Contact() {
  return (
    <section className="contact section" id="contact">
      <div>
        <span className="eyebrow">05 / КОНТАКТЫ</span>
        <h2>
          Свяжитесь
          <br />с нами<span className="accent-dot">.</span>
        </h2>
        <p>
          Хотите узнать стоимость, задать вопросы о продукции или просто
          связаться с нами? Мы всегда рады помочь.
        </p>
        <a className="contact-phone" href="tel:+77765773666">
          +7 776 577 36 66 ↗
        </a>
      </div>
      <div className="contact-form">
        <span className="contact-icon" aria-hidden="true">
          ↗
        </span>
        <h3>Нужна консультация по подбору МАФов и металлоизделий?</h3>
        <p>
          Укажите телефон и заполните опрос — заявка автоматически поступит
          менеджеру для уточнения стоимости и деталей заказа.
        </p>
        <OpenChat>
          Обсудить заказ с помощником <span>↗</span>
        </OpenChat>
        <a className="contact-whatsapp" href="https://wa.me/77765773666">
          Написать на WhatsApp <span>↗</span>
        </a>
      </div>
    </section>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <Link href="/" className="logo" aria-label="Facade Kazahstan — главная">
          <span className="brand-logo">
            <SiteImage src="/facade-logo-black.svg" alt="Facade Kazakhstan KZO" width={412} height={320} />
          </span>
        </Link>
        <p>
          Компания Facade Kazahstan производит металлоизделия и поставляет их по
          всему Казахстану на выгодных условиях
        </p>
        <div>
          <span>Адрес</span>
          <p>г. Қызылорда, Қорқыт ата 117г</p>
          <span>Пн-Сб: 09:00 - 18:00</span>
          <p>Заказы через сайт принимаются 24/7</p>
        </div>
        <nav aria-label="Меню в подвале">
          <Link href="/catalog">Каталог</Link>
          <Link href="/#uslugi">Услуги</Link>
          <Link href="/o-kompanii">О нас</Link>
          <Link href="/#contact">Контакты</Link>
        </nav>
      </div>
      <div className="footer-wordmark" aria-hidden="true">
        FACADE<span>↗</span>
      </div>
      <div className="footer-bottom">
        <span>FACADE KAZAHSTAN</span>
        <Link href="/catalog-pdf">Каталог в PDF ↗</Link>
        <span>Металл. Форма. Пространство.</span>
      </div>
    </footer>
  );
}
