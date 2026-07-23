import {
  fetchBackend,
  getRequestOrigin,
  injectSeoHead,
  normalizeCanonicalUrl,
} from '../server/seoResponse.js';

const getSingleQueryValue = (value) => (Array.isArray(value) ? value[0] : value);
const getProductIdFromRouteParam = (value = '') => String(value || '').trim().match(/[a-f\d]{24}$/i)?.[0] || '';

const buildForwardedProductSearch = (query = {}) => {
  const params = new URLSearchParams();

  ['variant', 'size', 'color'].forEach((key) => {
    const queryValue = getSingleQueryValue(query[key]);
    if (queryValue) params.set(key, String(queryValue).slice(0, 100));
  });

  return params;
};

export default async function handler(req, res) {
  const type = getSingleQueryValue(req.query.type);
  const value = getSingleQueryValue(type === 'product' ? req.query.id : req.query.slug);
  const productId = type === 'product' ? getProductIdFromRouteParam(value) : '';
  const isValidProductId = type === 'product' && Boolean(productId);
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
    const backendPath = new URLSearchParams();
    if (type === 'product') {
      buildForwardedProductSearch(req.query).forEach((queryValue, key) => backendPath.set(key, queryValue));
    }
    const seoQuery = backendPath.size > 0 ? `?${backendPath.toString()}` : '';
    const seoKey = type === 'product' ? productId : value;
    const seoResponse = await fetchBackend(`/api/seo/${type}/${encodeURIComponent(seoKey)}${seoQuery}`);

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
    if (type === 'product' && seo.canonicalUrl) {
      const canonicalPath = new URL(seo.canonicalUrl).pathname;
      const currentPath = `/product/${value}`;

      if (canonicalPath !== currentPath) {
        const redirectSearch = buildForwardedProductSearch(req.query);
        res.writeHead(308, {
          Location: `${canonicalPath}${redirectSearch.size ? `?${redirectSearch.toString()}` : ''}`,
        });
        res.end();
        return;
      }
    }

    const html = injectSeoHead(shellHtml, {
      ...seo,
      canonicalUrl: seo.canonicalUrl || normalizeCanonicalUrl(`/${type}/${value}`),
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
