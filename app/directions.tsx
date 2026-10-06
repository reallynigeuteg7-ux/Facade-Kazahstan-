import Link from 'next/link';
import SiteImage from './site-image';
import OpenChat from './open-chat';
import styles from './directions.module.css';

type Direction = {
  title: string;
  description: string;
  photos: [string, string][];
  links: [string, string][];
};

export const directions: Record<string, Direction> = {
  'fasadnye-resheniya': {
    title: 'Фасадные решения',
    description: 'Кассеты, панели и декоративный металл для зданий. Изготавливаем по размерам проекта, подбираем цвет и способ крепления.',
    photos: [
      ['/media/new-facade-8368985-1200.webp', 'Металлические панели с объёмным рельефом'],
      ['/media/new-facade-17869031-1200.webp', 'Плавные линии металлического фасада'],
      ['/media/new-facade-19185835-1200.webp', 'Геометрия фасадных панелей'],
      ['/media/new-facade-33990960-1200.webp', 'Светлый фасад с горизонтальными ламелями'],
      ['/media/new-facade-19431925-1200.webp', 'Вертикальный ритм металлических ламелей'],
      ['/media/new-facade-18914860-1200.webp', 'Декоративная перфорация фасада'],
      ['/media/new-facade-11229686-1200.webp', 'Металл и стекло в современной архитектуре'],
    ],
    links: [['/fasadnye-kassetty', 'Кассеты'], ['/fasadnye-paneli', 'Панели'], ['/3d-zhalyuzi', '3D-жалюзи'], ['/korziny-dlya-kondicionerov', 'Корзины для кондиционеров']],
  },
  blagoustroystvo: {
    title: 'Благоустройство',
    description: 'Скамейки, урны, беседки и ограждения для дворов, парков и общественных пространств. Подбираем изделия под стиль и размеры объекта.',
    photos: [
      ['/media/new-landscape-18290744-1200.webp', 'Скамейка в парковом пространстве'],
      ['/media/new-landscape-33312383-1200.webp', 'Металлическая скамейка среди зелени'],
      ['/media/new-landscape-29725403-1200.webp', 'Навес и ограждение прогулочной галереи'],
      ['/media/new-landscape-29632091-1200.webp', 'Благоустройство городской набережной'],
      ['/media/new-landscape-36238885-1200.webp', 'Навесы для общественного пространства'],
      ['/media/new-landscape-37122372-1200.webp', 'Пергола на городской прогулочной улице'],
    ],
    links: [['/metallicheskie-skameyki', 'Скамейки'], ['/metallicheskie-urny', 'Урны'], ['/metallicheskie-besedki', 'Беседки'], ['/dekorativnye-ograzhdeniya', 'Ограждения']],
  },
  'obrabotka-metalla': {
    title: 'Обработка металла',
    description: 'Лазерная резка, гибка, сварка и порошковая покраска. Выполняем отдельные операции и изготовление готовых изделий по вашим чертежам.',
    photos: [
      ['/media/new-metal-7254419-1200.webp', 'Лазерная обработка металлической поверхности'],
      ['/media/new-metal-37442604-1200.webp', 'Сварочные работы в мастерской'],
      ['/media/new-metal-12114679-1200.webp', 'Шлифовка и подготовка металла'],
      ['/media/new-metal-36522041-1200.webp', 'Резка металлических заготовок'],
      ['/media/new-metal-36184235-1200.webp', 'Порошковая покраска металлоконструкций'],
      ['/media/new-metal-28752150-1200.webp', 'Токарная обработка металлических деталей'],
      ['/media/new-metal-8327974-1200.webp', 'Точная обработка небольших деталей'],
    ],
    links: [['/lazernaya-rezka-metalla', 'Лазерная резка'], ['/gibka-metalla', 'Гибка'], ['/svarochnye-raboty', 'Сварка'], ['/poroshkovaya-pokraska', 'Покраска']],
  },
};

export function DirectionPage({ direction, videos }: { direction: Direction; videos?: React.ReactNode }) {
  return (
    <div className={styles.container}>
      <Link href="/" className={styles.back}>← Главная</Link>
      <section className={styles.intro}>
        <div><span className="eyebrow">FACADE / НАПРАВЛЕНИЯ</span><h1>{direction.title}</h1></div>
        <div className={styles.copy}>
          <p>{direction.description}</p>
          <OpenChat className="button">Обсудить проект <span>↗</span></OpenChat>
        </div>
      </section>
      <nav className={styles.links} aria-label="Продукция и услуги направления">
        {direction.links.map(([href, title]) => <Link href={href} key={href}>{title}<span>↗</span></Link>)}
      </nav>
      {videos}
      <section className={styles.gallery} aria-label={`Фотогалерея: ${direction.title}`}>
        {direction.photos.map(([src, title], i) => (
          <figure key={src}>
            <a href={src} target="_blank" rel="noreferrer" aria-label={`Открыть фото: ${title}`}>
              <SiteImage src={src} alt={title} loading={i < 2 ? 'eager' : 'lazy'} />
              <span className={styles.zoom} aria-hidden="true">↗</span>
            </a>
            <figcaption><span>{String(i + 1).padStart(2, '0')}</span>{title}</figcaption>
          </figure>
        ))}
      </section>
    </div>
  );
}
