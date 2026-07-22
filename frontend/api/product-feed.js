import { fetchBackend, normalizeXmlUrls } from '../server/seoResponse.js';

export default async function handler(_req, res) {
  try {
    const response = await fetchBackend('/api/seo/product-feed.xml', { accept: 'application/xml' });
    if (!response.ok) {
      throw new Error(`Backend product feed returned ${response.status}`);
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).send(normalizeXmlUrls(await response.text()));
  } catch (error) {
    console.error('[seo-product-feed]', error.message);
    res.status(503).setHeader('Retry-After', '300').send('Product feed is temporarily unavailable.');
  }
}
