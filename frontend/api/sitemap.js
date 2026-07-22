import { SITE_URL, fetchBackend, normalizeXmlUrls } from '../server/seoResponse.js';

const FALLBACK_PATHS = [
  '/',
  '/products',
  '/categories',
  '/about',
  '/contact',
  '/faq',
  '/shipping',
  '/returns',
  '/payment-policy',
  '/privacy',
  '/cookies',
  '/terms',
];

const buildFallbackSitemap = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${FALLBACK_PATHS.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n')}
</urlset>`;

export default async function handler(_req, res) {
  let xml;

  try {
    const response = await fetchBackend('/api/seo/sitemap.xml', { accept: 'application/xml' });
    if (!response.ok) {
      throw new Error(`Backend sitemap returned ${response.status}`);
    }
    xml = normalizeXmlUrls(await response.text());
  } catch (error) {
    console.error('[seo-sitemap]', error.message);
    xml = buildFallbackSitemap();
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(xml);
}
