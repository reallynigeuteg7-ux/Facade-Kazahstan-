'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import s from './landing.module.css';

export default function VideoBackground() {
  const video = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEnabled(!preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  return <>
    <div className={s.videoBackdrop} aria-hidden="true">
      <img src="/media/landing-metal-poster.jpg" alt="" fetchPriority="high" />
      {enabled && !failed && <video ref={video} autoPlay muted loop playsInline preload="metadata" poster="/media/landing-metal-poster.jpg" onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => {setFailed(true); setPlaying(false);}}><source src="/media/landing-metal.mp4" type="video/mp4" /></video>}
    </div>
    {!failed && <button className={s.videoControl} aria-label={playing ? 'Приостановить видеофон' : 'Включить видеофон'} onClick={() => {if(!enabled) setEnabled(true); else if (video.current?.paused) void video.current.play().catch(() => setPlaying(false)); else video.current?.pause();}}>{playing ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}<span>{playing ? 'Пауза' : 'Видео'}</span></button>}
  </>;
}
