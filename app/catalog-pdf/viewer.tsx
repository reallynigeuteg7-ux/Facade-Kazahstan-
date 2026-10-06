'use client';
import { useState, useEffect } from 'react';
import info from '../catalog-document.json';
import { Button } from '@/components/ui/button';
export default function Viewer() {
  const [page, setPage] = useState(1),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get('page'));
    if (Number.isInteger(n) && n >= 1 && n <= info.pages) setPage(n);
  }, []);
  async function download() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const chunks: Uint8Array[] = [];
      for (const path of info.parts) {
        const r = await fetch(path);
        if (!r.ok) throw new Error();
        chunks.push(new Uint8Array(await r.arrayBuffer()));
      }
      const bytes = new Uint8Array(info.bytes);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      if (offset !== info.bytes) throw new Error();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      )
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      if (hash !== info.sha256) throw new Error();
      const url = URL.createObjectURL(
        new Blob([bytes], { type: 'application/pdf' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = info.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError('Не удалось загрузить PDF. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <div className="document-toolbar">
        <div>
          <Button
            className="document-nav"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            aria-label="Предыдущая страница"
          >
            ←
          </Button>
          <span aria-live="polite">
            Страница {page} из {info.pages}
          </span>
          <Button
            className="document-nav"
            disabled={page === info.pages}
            onClick={() => setPage(page + 1)}
            aria-label="Следующая страница"
          >
            →
          </Button>
        </div>
        <Button
          onClick={download}
          disabled={loading}
          className="document-download"
        >
          {loading ? 'Загружаем PDF…' : `Скачать PDF · ${Math.ceil(info.bytes / 1024 / 1024)} МБ ↓`}
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="document-page">
        <img
          src={'/catalog-document/page-' + page + '.jpg'}
          alt={'Страница ' + page + ' каталога от 29.08.2026'}
          width="952"
          height="1347"
        />
      </div>
      <p className="document-note">
        Цены указаны на дату каталога; актуальную стоимость и условия подтвердит менеджер.
      </p>
    </>
  );
}
