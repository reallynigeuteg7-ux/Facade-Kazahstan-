# SEO: Facade Kazakhstan

Основной адрес: https://facade-kazahstan.vercel.app/.
Название бренда в заголовках, контенте и структурированных данных: **Facade Kazakhstan**.
Написание Facade Kazahstan сохранено только как альтернативное название в разметке компании.

## В коде

- `lib/seo.ts`: название, основной адрес, описание, метаданные и разметка WebSite / Organization / BreadcrumbList.
- У публичных страниц собственные title, description, canonical, Open Graph и Twitter metadata.
- Страницы товаров, услуг и направлений заранее формируются в HTML, включая заголовки, текст и метаданные.
- `/sitemap.xml` включает главную, каталог, PDF-каталог, товары, услуги и три направления. CRM, акции и дополнительный лендинг исключены.
- `robots.txt` разрешает публичный сайт и указывает карту сайта. CRM и API закрыты от обхода; CRM, акции и дополнительный лендинг имеют noindex.
- `/favicon.svg`: квадратная версия действующего логотипа.

Проверка готовой сборки: запустить `pnpm start --port 3040`, затем `pnpm seo:check`. Проверка опубликованного сайта: `pnpm seo:check https://facade-kazahstan.vercel.app`. Проверяются все 26 публичных страниц, уникальные метаданные, canonical, JSON-LD, карта сайта, robots, noindex служебных страниц, изображения и ответ 404 для неизвестного адреса.

## Google Search Console

14 октября 2026 года основной сайт подтверждён в Google Search Console через Google-аккаунт владельца. Использован HTML-файл `public/google4254211ffff85407.html`. Не удалять его при обновлениях: Google повторно проверяет право собственности.

Карта `https://facade-kazahstan.vercel.app/sitemap.xml` отправлена и обработана Google: статус **«Успешно»**, найдено **26 страниц**. Это подтверждение обработки карты, а не гарантия индексации каждой страницы или первой позиции.

## Настройка для другого аккаунта или нового домена

1. В Google Search Console добавить ресурс с префиксом URL `https://facade-kazahstan.vercel.app/`.
2. Выбрать подтверждение через HTML-тег. Значение `content` из предоставленного Google тега добавить в переменную Vercel `GOOGLE_SITE_VERIFICATION` и повторно развернуть сайт. Код уже выводит этот тег. Подтвердить ресурс в Search Console.
3. Отправить `https://facade-kazahstan.vercel.app/sitemap.xml` в разделе «Файлы Sitemap».
4. В инструменте проверки URL проверить главную и запросить индексацию.
5. Указать название Facade Kazakhstan и ссылку на сайт в действующих официальных профилях компании. Не покупать искусственные ссылки.

Первый результат не гарантируется: позиции и сроки индексации определяет поисковик.

При подключении собственного домена сначала заменить `siteUrl` в `lib/seo.ts`, настроить перенаправление старого адреса и затем повторно добавить ресурс и карту сайта в Search Console.

Официальные инструкции: [начало работы с SEO](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [название сайта](https://developers.google.com/search/docs/appearance/site-names), [данные организации](https://developers.google.com/search/docs/appearance/structured-data/organization).
