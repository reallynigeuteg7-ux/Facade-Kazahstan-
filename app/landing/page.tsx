import type { Metadata } from 'next';
import { ArrowUpRight, ArrowDown, Layers3, ScanLine, Trees, Plus, MapPin } from 'lucide-react';
import OpenChat from '@/app/open-chat';
import SiteImage from '@/app/site-image';
import VideoBackground from './video-background';
import s from './landing.module.css';

export const metadata: Metadata = {
  title: 'Facade Kazahstan — производство металлоизделий',
  description: 'Производим фасадные решения, малые архитектурные формы и металлоконструкции в Кызылорде. Лазерная резка, гибка и порошковая покраска. Работаем по всему Казахстану.',
  alternates: { canonical: '/landing' },
  robots: { index: false, follow: true },
};
function Logo() {return <span className={s.logo}><img src="/facade-original-logo.png" alt="Facade Kazahstan" width="527" height="147" /></span>;}
const services = [
  {icon:Layers3, name:'Фасадные решения', description:'Облик современных зданий', id:'01', href:'#facade-work'},
  {icon:Trees, name:'Благоустройство', description:'Комфорт городской среды', id:'02', href:'#landscape-work'},
  {icon:ScanLine, name:'Металлообработка', description:'Точность каждой детали', id:'03', href:'#metal-work'},
];
const work = [
  {id:'facade-work',number:'01',label:'АРХИТЕКТУРА',icon:Layers3,title:<>Фасады<br />с характером.</>,description:'Фасадные кассеты, панели и декоративный металл.',photos:[
    ['/media/55920a025d87b71c-1200.webp','Металлические фасадные кассеты'],['/media/61001c9aeb7e0203-1200.webp','Светлый фасад с кассетами'],['/media/84ba8bb91e1168d4-1200.webp','Фасад с ажурными панелями'],['/media/94e8cf3e71cfe458-1200.webp','Объёмные металлические ламели'],
  ]},
  {id:'landscape-work',number:'02',label:'ГОРОДСКАЯ СРЕДА',icon:Trees,title:<>Комфортные<br />общественные места.</>,description:'Скамейки, урны, перголы и ограждения.',photos:[
    ['/media/6fdef194e0a855f0-1200.webp','Декоративная скамейка'],['/media/51f889c2396734fd-1200.webp','Уличная урна'],['/media/5bcbb71264ca80f6-1200.webp','Металлическая беседка'],['/media/29e7cb5c205fbece-1200.webp','Декоративное ограждение'],
  ]},
  {id:'metal-work',number:'03',label:'ПРОИЗВОДСТВО',icon:ScanLine,title:<>Точность<br />в каждой детали.</>,description:'Лазерная резка, гибка, сварка и покраска.',photos:[
    ['/media/6af6b5df654b3ce5-1200.webp','Лазерная резка металла'],['/media/55472621ab1cefc9-1200.webp','Гибка металлической детали'],['/media/52180d954000967a-1200.webp','Сварка металлоконструкции'],['/media/2b525882d6e6ac8e-1200.webp','Порошковая покраска'],
  ]},
];
export default function LandingPage() {
  return <div className={s.page}>
    <a className={s.skip} href="#about">К информации о компании</a>
    <header className={s.header}>
      <a href="#top" aria-label="Facade Kazahstan — начало страницы"><Logo /></a>
      <nav className={s.nav} aria-label="Навигация"><a href="#about">О компании</a><a href="#work">Что мы делаем</a><a href="#contact">Контакты</a></nav>
      <a href="tel:+77765773666" aria-label="Позвонить: +7 776 577 36 66" className={s.headerPhone}><span>+7 776 577 36 66</span><ArrowUpRight size={17} aria-hidden="true" /></a>
    </header>
    <main>
      <section className={s.hero} id="top" aria-labelledby="hero-title">
        <VideoBackground />
        <div className={s.shade} />
        <div className={s.heroBody}>
          <div className={s.heroIntro}><span className={s.eyebrow}><i /> FACADE KAZAHSTAN</span><span className={s.location}>КЫЗЫЛОРДА · РАБОТАЕМ ПО ВСЕМУ КАЗАХСТАНУ</span></div>
          <div className={s.heroColumns}>
            <div className={s.heroCopy}>
              <h1 id="hero-title">Придаём форму<br /><em>вашим идеям.</em></h1>
              <p>Металл для архитектуры, города и жизни.<br />От индивидуальной детали до готового пространства.</p>
              <div className={s.heroActions}><OpenChat className={s.primary}>Обсудить проект <span><ArrowUpRight size={19} aria-hidden="true" /></span></OpenChat><a href="#about" className={s.discover}>О нашей компании <ArrowDown size={16} aria-hidden="true" /></a></div>
            </div>
            <aside className={s.glassNote}><span className={s.noteTop}>МАТЕРИАЛ → ФОРМА <Plus size={17} aria-hidden="true" /></span><div className={s.glassSculpture} aria-hidden="true"><span /><span /><span /><span /><span /></div><p>Продумано в деталях.<br /><span>Создано из металла.</span></p><div className={s.noteBottom}><span>СОБСТВЕННОЕ ПРОИЗВОДСТВО</span><ArrowUpRight size={16} aria-hidden="true" /></div></aside>
          </div>
          <div className={s.serviceStrip}>{services.map(({icon:Icon,name,description,id,href})=><a href={href} key={id} className={s.service}><Icon size={30} strokeWidth={1.1} aria-hidden="true" /><div><h2>{name}</h2><p>{description}</p></div><span>{id}</span></a>)}</div>
        </div>
      </section>
      <section id="about" className={s.about} aria-labelledby="about-title">
        <div className={s.sectionTop}><span className={s.eyebrow}><i /> ЗНАКОМЬТЕСЬ, FACADE</span><span>01 — О КОМПАНИИ</span></div>
        <div className={s.aboutGrid}><h2 id="about-title">У металла есть<br />возможности.<br /><span>Мы раскрываем их.</span></h2><div className={s.aboutText}><p>Facade Kazahstan — производственная компания из Кызылорды. Создаём фасадные элементы, малые архитектурные формы и металлоконструкции для частных и общественных пространств.</p><p>Соединяем точность обработки с вниманием к внешнему виду. Работаем по вашим размерам и задачам — с частными заказчиками, бизнесом и строительными компаниями.</p><div className={s.aboutTags}><span>Своё производство</span><span>Индивидуальные размеры</span><span>Поставки по Казахстану</span></div></div></div>
      </section>
      <section id="work" className={s.work} aria-labelledby="work-title">
        <div className={s.workHeading}><span className={s.eyebrow}><i /> НАШИ НАПРАВЛЕНИЯ</span><h2 id="work-title">От листа металла —<br /><em>к вашему проекту.</em></h2></div>
        <div className={s.workGrid}>{work.map(({id,number,label,icon:Icon,title,description,photos})=><article id={id} key={id} className={s.workCard}><div className={s.workCopy}><span className={s.workLabel}>{number} / {label}</span><Icon size={30} strokeWidth={1.15} aria-hidden="true" /><h3>{title}</h3><p>{description}</p></div><div className={s.workPhotos}>{photos.map(([src,alt],i)=><a key={src} href={src} target="_blank" rel="noreferrer" className={i===0?s.workPhotoLead:s.workPhoto}><SiteImage src={src} alt={alt} loading="lazy"/><span>{alt}<b aria-hidden="true">↗</b></span></a>)}</div></article>)}</div>
      </section>
      <section id="contact" className={s.contact} aria-labelledby="contact-title">
        <div className={s.contactOrb} aria-hidden="true" />
        <div className={s.contactPanel}><div><span className={s.eyebrow}><i /> ВАШ ПРОЕКТ НАЧИНАЕТСЯ ЗДЕСЬ</span><h2 id="contact-title">Давайте создадим<br /><em>что-то настоящее.</em></h2><OpenChat className={s.primary}>Расскажите о своей идее <span><ArrowUpRight size={19} aria-hidden="true" /></span></OpenChat></div><div className={s.contacts}><a className={s.phone} href="tel:+77765773666">+7 776 577 36 66 <ArrowUpRight size={22} aria-hidden="true" /></a><p><MapPin size={16} aria-hidden="true" /> Кызылорда, Қорқыт ата 117г</p><p>Пн–Сб: 09:00–18:00 · время Кызылорды</p><a className={s.whatsapp} href="https://wa.me/77765773666" target="_blank" rel="noopener noreferrer">Написать в WhatsApp <ArrowUpRight size={16} aria-hidden="true" /></a></div></div>
      </section>
    </main>
    <footer className={s.footer}><a href="#top" aria-label="В начало страницы"><Logo /></a><span>МЕТАЛЛ. АРХИТЕКТУРА. ПРОСТРАНСТВО.</span><a href="#top">Наверх <ArrowUpRight size={15} aria-hidden="true" /></a></footer>
  </div>;
}

