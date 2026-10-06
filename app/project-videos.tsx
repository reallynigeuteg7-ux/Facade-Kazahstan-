import styles from './project-videos.module.css';

const projects = [
  {
    id: 'house-of-friendship',
    title: 'Фасад «Дома Дружбы»',
    description: 'Декоративные панели и вечерняя подсветка.',
    duration: '19 сек',
  },
  {
    id: 'ethno-facade',
    title: 'Фасад с национальным орнаментом',
    description: 'От чертежа до готовой облицовки.',
    duration: '23 сек',
  },
];

export default function ProjectVideos() {
  return (
    <section className={styles.section} id="project-videos" aria-labelledby="project-videos-title">
      <div className={styles.heading}>
        <h3 id="project-videos-title">Наши проекты в видео</h3>
        <span>Детали и общий вид готовых фасадов</span>
      </div>
      <div className={styles.grid}>
        {projects.map((project, i) => (
          <figure className={styles.card} key={project.id}>
            <video
              className={styles.video}
              controls
              playsInline
              preload="none"
              width={720}
              height={1280}
              poster={`/media/project-${project.id}.webp`}
              aria-label={project.title}
            >
              <source src={`/media/project-${project.id}.mp4`} type="video/mp4" />
              <track src={`/media/project-${project.id}.vtt`} kind="captions" srcLang="ru" label="Описание кадров" />
              <a href={`/media/project-${project.id}.mp4`}>Смотреть видео: {project.title}</a>
            </video>
            <figcaption className={styles.caption}>
              <div className={styles.meta}><span>0{i + 1} / ФАСАДЫ</span><span>{project.duration}</span></div>
              <h4>{project.title}</h4>
              <p>{project.description}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
