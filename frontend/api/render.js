import {
  fetchBackend,
  getRequestOrigin,
  injectSeoHead,
  normalizeCanonicalUrl,
} from '../server/seoResponse.js';

const getSingleQueryValue = (value) => (Array.isArray(value) ? value[0] : value);
const getProductIdFromRouteParam = (value = '') => String(value || '').trim().match(/[a-f\d]{24}$/i)?.[0] || '';
const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildForwardedProductSearch = (query = {}) => {
  const params = new URLSearchParams();

  ['variant', 'size', 'color'].forEach((key) => {
    const queryValue = getSingleQueryValue(query[key]);
    if (queryValue) params.set(key, String(queryValue).slice(0, 100));
  });

  return params;
};

const getCategoryProducts = (seo = {}) =>
  Array.isArray(seo.itemList?.itemListElement) ? seo.itemList.itemListElement : [];

const injectCategoryPrerender = (html, { category, seo, productPayload } = {}) => {
  const categoryName = String(category?.name || seo?.structuredData?.name || seo?.title || 'Category').trim();
  const categoryDescription = String(category?.description || seo?.description || '').trim();
  const products = getCategoryProducts(seo);
  const productLinks = products
    .map((product) => {
      const name = String(product?.name || 'View product').trim();
      const url = normalizeCanonicalUrl(product?.url || '/products');
      return `<li><a href="${escapeHtml(url)}">${escapeHtml(name)}</a></li>`;
    })
    .join('');
  const content = `<main data-seo-category-content="true"><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/categories">Categories</a> / ${escapeHtml(categoryName)}</nav><h1>${escapeHtml(categoryName)}</h1><p>${escapeHtml(categoryDescription)}</p><section aria-labelledby="category-products"><h2 id="category-products">${escapeHtml(categoryName)} products</h2><ul>${productLinks}</ul></section></main>`;
  const payload = {
    slug: category?.slug,
    category,
    seo,
    productPayload,
  };
  const serializedPayload = JSON.stringify(payload).replace(/</g, '\\u003c');

  return html.replace(
    /<div\s+id=["']root["']\s*><\/div>/i,
    `<div id="root" data-seo-prerendered="true">${content}</div><script>window.__APEX_CATEGORY_PRERENDER__=${serializedPayload};</script>`
  );
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

  try {
    const shellResponse = await fetch(`${origin}/index.html`, {
      headers: { 'User-Agent': 'ApexFashion-SEO-Renderer/1.0' },
    });

    if (!shellResponse.ok) {
      throw new Error(`Unable to load application shell (${shellResponse.status})`);
    }

    const shellHtml = await shellResponse.text();
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

    let html = injectSeoHead(shellHtml, {
      ...seo,
      canonicalUrl: seo.canonicalUrl || normalizeCanonicalUrl(`/${type}/${value}`),
    });

    if (type === 'category') {
      const categoryResponse = await fetchBackend(`/api/categories/${encodeURIComponent(value)}`);
      if (categoryResponse.status === 404) {
        const notFoundHtml = injectSeoHead(shellHtml, {
          title: 'Category Not Found | Apex Fashion',
          description: 'This page is unavailable or could not be found.',
          canonicalUrl: normalizeCanonicalUrl(`/category/${value}`),
          robots: 'noindex, nofollow, noarchive',
        });
        res.status(404).setHeader('X-Robots-Tag', 'noindex, nofollow').send(notFoundHtml);
        return;
      }
      if (!categoryResponse.ok) {
        throw new Error(`Unable to load category data (${categoryResponse.status})`);
      }

      const category = await categoryResponse.json();
      const searchParams = new URLSearchParams({
        category: String(category.name || ''),
        page: '1',
        limit: '24',
      });
      const productResponse = await fetchBackend(`/api/customer/search?${searchParams.toString()}`);
      if (!productResponse.ok) {
        throw new Error(`Unable to load category products (${productResponse.status})`);
      }

      html = injectCategoryPrerender(html, {
        category,
        seo,
        productPayload: await productResponse.json(),
      });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).send(html);
  } catch (error) {
    console.error('[seo-render]', error.message);
    res.status(503).setHeader('Retry-After', '60').send('Storefront is temporarily unavailable.');
  }
}

export { injectCategoryPrerender };
