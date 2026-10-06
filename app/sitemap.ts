import type { MetadataRoute } from 'next';
import data from './content.json';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '/',
    ...Object.keys(data.pages)
      .filter((p) => p !== 'discount')
      .map((p) => '/' + p),
    '/catalog-pdf',
  ].map((path) => ({
    url: 'https://facade-kazahstan.vercel.app' + path,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
