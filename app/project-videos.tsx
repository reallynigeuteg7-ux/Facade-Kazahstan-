import styles from './project-videos.module.css';

const projects = [
  {
    id: 'syr-samaly',
    title: 'ЖК «Сыр Самалы»',
    description: 'Перила, декоративные панели и корзины для кондиционеров.',
    duration: '58 сек',
    category: 'ФАСАДЫ',
    directions: ['fasadnye-resheniya', 'blagoustroystvo'],
    width: 720,
    height: 1280,
  },
  {
    id: 'benches-and-panels',
    title: 'Скамейки и декоративные панели',
    description: 'Готовые изделия на территории объекта.',
    duration: '48 сек',
    category: 'БЛАГОУСТРОЙСТВО',
    directions: ['blagoustroystvo', 'fasadnye-resheniya'],
    width: 360,
    height: 640,
  },
  {
    id: 'production-and-projects',
    title: 'Производство и готовые проекты',
    description: 'Проектирование, резка металла и фасад «Дома Дружбы».',
    duration: '52 сек',
    category: 'ПРОИЗВОДСТВО',
    directions: ['obrabotka-metalla', 'fasadnye-resheniya'],
    width: 360,
    height: 640,
  },
  {
    id: 'house-of-friendship',
    title: 'Фасад «Дома Дружбы»',
    description: 'Декоративные панели и вечерняя подсветка.',
    duration: '19 сек',
    category: 'ФАСАДЫ',
    directions: ['fasadnye-resheniya'],
    width: 720,
    height: 1280,
  },
  {
    id: 'ethno-facade',
    title: 'Фасад с национальным орнаментом',
    description: 'От чертежа до готовой облицовки.',
    duration: '23 сек',
    category: 'ФАСАДЫ',
    directions: ['fasadnye-resheniya'],
    width: 720,
    height: 1280,
  },
];

export default function ProjectVideos({ direction }: { direction?: string }) {
  const visibleProjects = direction ? projects.filter(project => project.directions.includes(direction)) : projects;
  return (
    <section className={styles.section} id="project-videos" aria-labelledby="project-videos-title">
      <div className={styles.heading}>
        <h3 id="project-videos-title">Наши проекты в видео</h3>
        <span>Готовые объекты, изделия и производство</span>
      </div>
      <div className={styles.grid}>
        {visibleProjects.map((project, i) => (
          <figure className={styles.card} key={project.id}>
            <video
              className={styles.video}
              controls
              playsInline
              preload="none"
              width={project.width}
              height={project.height}
              poster={`/media/project-${project.id}.webp`}
              aria-label={project.title}
            >
              <source src={`/media/project-${project.id}.mp4`} type="video/mp4" />
              <track src={`/media/project-${project.id}.vtt`} kind="captions" srcLang="ru" label="Описание кадров" />
              <a href={`/media/project-${project.id}.mp4`}>Смотреть видео: {project.title}</a>
            </video>
            <figcaption className={styles.caption}>
              <div className={styles.meta}><span>0{i + 1} / {project.category}</span><span>{project.duration}</span></div>
              <h4>{project.title}</h4>
              <p>{project.description}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
