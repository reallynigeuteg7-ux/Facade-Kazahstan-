import { messages, type ChatLanguage } from './chat-i18n';
export default function CatalogCard({
  language = 'ru',
}: {
  language?: ChatLanguage;
}) {
  const t = messages[language];
  return (
    <div className="chat-catalog">
      <a href="/catalog-pdf" target="_blank" rel="noreferrer">
        <img src="/catalog-document/page-1.jpg" alt={t.cover} />
        <div>
          <strong>{t.catalog}</strong>
          <span>{t.pages}</span>
          <b>{t.viewCatalog}</b>
        </div>
      </a>
      <p>{t.catalogHelp}</p>
    </div>
  );
}
