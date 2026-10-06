import type { ImgHTMLAttributes } from 'react';
export default function SiteImage({
  src,
  alt = '',
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const responsive =
    typeof src === 'string' &&
    src.startsWith('/media/') &&
    src.endsWith('-1200.webp');
  return (
    <img
      {...props}
      src={src}
      alt={alt}
      decoding="async"
      srcSet={
        responsive
          ? [360, 720, 1200]
              .map(
                (w) =>
                  src.replace('-1200.webp', '-' + w + '.webp') + ' ' + w + 'w',
              )
              .join(', ')
          : undefined
      }
      sizes={
        responsive
          ? '(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 50vw'
          : undefined
      }
    />
  );
}
