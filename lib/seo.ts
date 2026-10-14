import type { Metadata } from 'next';

export const siteUrl = 'https://facade-kazahstan.vercel.app';
export const brandName = 'Facade Kazakhstan';
export const homeTitle = `${brandName} — металлоизделия и фасадные решения`;
export const homeDescription = 'Facade Kazakhstan — производство металлоизделий в Кызылорде: фасадные панели и кассеты, скамейки, урны, лазерная резка и гибка. Поставки по Казахстану.';
export const socialImage = '/media/new-facade-17869031-1200.webp';

export function pageMetadata(title: string, description: string, path: string, image = socialImage): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website', locale: 'ru_KZ', siteName: brandName,
      title, description, url: path,
      images: [{ url: image, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export const brandSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization', '@id': `${siteUrl}/#organization`,
      name: brandName, alternateName: ['Facade Kazahstan', 'Фасад Казахстан'],
      url: siteUrl, logo: `${siteUrl}/facade-logo-black.svg`,
      description: homeDescription, telephone: '+7 776 577 36 66',
      address: { '@type': 'PostalAddress', streetAddress: 'Қорқыт ата 117г', addressLocality: 'Кызылорда', addressCountry: 'KZ' },
      areaServed: { '@type': 'Country', name: 'Казахстан' },
    },
    {
      '@type': 'WebSite', '@id': `${siteUrl}/#website`,
      name: brandName, alternateName: ['Facade Kazahstan', 'Фасад Казахстан'],
      url: siteUrl, inLanguage: 'ru-KZ',
      publisher: { '@id': `${siteUrl}/#organization` },
    },
  ],
};

export function breadcrumbSchema(title: string, path: string) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: title, item: `${siteUrl}${path}` },
    ],
  };
}
