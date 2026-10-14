import type { MetadataRoute } from 'next';
import data from './content.json';
import { directions } from './directions';
import { siteUrl } from '@/lib/seo';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '/',
    ...Object.keys(data.pages)
      .filter((p) => p !== 'discount')
      .map((p) => '/' + p),
    '/catalog-pdf',
    ...Object.keys(directions).map((slug) => '/' + slug),
  ].map((path) => ({
    url: siteUrl + path,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
