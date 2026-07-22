import {
  fetchBackend,
  getRequestOrigin,
  injectSeoHead,
  normalizeCanonicalUrl,
} from '../server/seoResponse.js';

const getSingleQueryValue = (value) => (Array.isArray(value) ? value[0] : value);

export default async function handler(req, res) {
  const type = getSingleQueryValue(req.query.type);
  const value = getSingleQueryValue(type === 'product' ? req.query.id : req.query.slug);
  const isValidProductId = type === 'product' && /^[a-f\d]{24}$/i.test(value || '');
  const isValidCategorySlug = type === 'category' && /^[a-z0-9-]{1,120}$/i.test(value || '');

  if (!isValidProductId && !isValidCategorySlug) {
    res.status(404).setHeader('X-Robots-Tag', 'noindex, nofollow').send('Not found');
    return;
  }

  const origin = getRequestOrigin(req);
  let shellHtml = '';

  try {
    const shellResponse = await fetch(`${origin}/index.html`, {
      headers: { 'User-Agent': 'ApexFashion-SEO-Renderer/1.0' },
    });

    if (!shellResponse.ok) {
      throw new Error(`Unable to load application shell (${shellResponse.status})`);
    }

    shellHtml = await shellResponse.text();
    const seoResponse = await fetchBackend(`/api/seo/${type}/${encodeURIComponent(value)}`);

    if (seoResponse.status === 404) {
      const html = injectSeoHead(shellHtml, {
        title: `${type === 'product' ? 'Product' : 'Category'} Not Found | Apex Fashion`,
        description: 'This page is unavailable or could not be found.',
        canonicalUrl: normalizeCanonicalUrl(`/${type}/${value}`),
        robots: 'noindex, nofollow, noarchive',
      });
      res.status(404).setHeader('X-Robots-Tag', 'noindex, nofollow').send(html);
      return;
    }

    if (!seoResponse.ok) {
      throw new Error(`Unable to load SEO data (${seoResponse.status})`);
    }

    const seo = await seoResponse.json();
    const html = injectSeoHead(shellHtml, {
      ...seo,
      canonicalUrl: normalizeCanonicalUrl(`/${type}/${value}`),
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).send(html);
  } catch (error) {
    console.error('[seo-render]', error.message);
    if (shellHtml) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      res.status(200).send(shellHtml);
      return;
    }

    res.status(503).setHeader('Retry-After', '60').send('Storefront is temporarily unavailable.');
  }
}
