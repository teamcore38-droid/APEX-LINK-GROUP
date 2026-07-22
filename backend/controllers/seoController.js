import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';

const DEFAULT_SITE_URL = 'https://www.apexfashion.lk';
const DEFAULT_IMAGE_PATH = '/hero/hero-bg-4.webp';
const STORE_ID = `${DEFAULT_SITE_URL}/#organization`;

const getSiteUrl = () => {
  const configuredUrl = String(
    process.env.FRONTEND_URL || process.env.CLIENT_URL || DEFAULT_SITE_URL
  ).replace(/\/+$/, '');

  try {
    const url = new URL(configuredUrl);
    if (url.hostname === 'apexfashion.lk') {
      url.hostname = 'www.apexfashion.lk';
    }
    return url.href.replace(/\/+$/, '');
  } catch {
    return DEFAULT_SITE_URL;
  }
};

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const cleanText = (value = '', maxLength = 5000) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const getImageUrl = (image = '') =>
  typeof image === 'string' ? image : String(image?.url || image?.secureUrl || '').trim();

const toAbsoluteUrl = (value = '', siteUrl = getSiteUrl()) => {
  try {
    return new URL(value || DEFAULT_IMAGE_PATH, siteUrl).href;
  } catch {
    return `${siteUrl}${DEFAULT_IMAGE_PATH}`;
  }
};

const getProductImageUrls = (product = {}) =>
  [product.image, ...(product.images || [])]
    .map((image) => getImageUrl(image))
    .filter(Boolean)
    .map((image) => toAbsoluteUrl(image));

const getProductColors = (product = {}) =>
  [
    ...(product.variants || []).map((variant) => variant.color),
    ...(product.sizes || []).flatMap((size) => size.colors || []),
  ].filter(Boolean);

const getProductSizes = (product = {}) =>
  [
    ...(product.variants || []).flatMap((variant) => [variant.size, ...(variant.availableSizes || [])]),
    ...(product.sizes || []).map((size) => size.size),
  ].filter(Boolean);

const buildBreadcrumbs = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: toAbsoluteUrl(item.url),
  })),
});

const buildProductSeo = (product) => {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/product/${product._id}`;
  const description =
    cleanText(product.seo?.description, 160) ||
    cleanText(product.shortDescription, 160) ||
    cleanText(product.description, 160) ||
    `Shop ${product.name} online from Apex Fashion Sri Lanka.`;
  const colors = [...new Set(getProductColors(product))];
  const sizes = [...new Set(getProductSizes(product))];

  return {
    title: product.seo?.title || `${product.name} | Apex Fashion`,
    description,
    keywords:
      product.seo?.keywords?.length > 0
        ? product.seo.keywords
        : [product.name, product.category, product.brand, product.sku, 'Sri Lanka'].filter(Boolean),
    canonicalUrl: url,
    ogImage: toAbsoluteUrl(product.seo?.ogImage || product.image),
    url,
    type: 'product',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${url}#product`,
      name: product.name,
      image: getProductImageUrls(product),
      description: cleanText(product.description || product.shortDescription),
      sku: product.sku || product._id.toString(),
      category: product.category,
      color: colors.join(', ') || undefined,
      size: sizes.join(', ') || undefined,
      brand: {
        '@type': 'Brand',
        name: product.brand || 'Apex Fashion',
      },
      aggregateRating:
        Number(product.numReviews || 0) > 0 && Number(product.rating || 0) > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: Number(product.rating),
              reviewCount: Number(product.numReviews),
            }
          : undefined,
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: process.env.DEFAULT_CURRENCY || 'LKR',
        price: Number(product.price || 0).toFixed(2),
        availability:
          Number(product.countInStock || 0) > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@id': STORE_ID.replace(DEFAULT_SITE_URL, siteUrl) },
      },
    },
    breadcrumbs: buildBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Products', url: '/products' },
      { name: product.name, url },
    ]),
  };
};

const buildCategorySeo = (category) => {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/category/${category.slug}`;
  const description =
    cleanText(category.seo?.description, 160) ||
    cleanText(category.description, 160) ||
    `Shop ${category.name} online from Apex Fashion Sri Lanka.`;

  return {
    title: category.seo?.title || `${category.name} in Sri Lanka | Apex Fashion`,
    description,
    keywords:
      category.seo?.keywords?.length > 0
        ? category.seo.keywords
        : [category.name, `${category.name} Sri Lanka`, 'Apex Fashion'],
    canonicalUrl: url,
    ogImage: toAbsoluteUrl(category.seo?.ogImage || category.image),
    url,
    type: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#collection`,
      name: category.name,
      description,
      image: toAbsoluteUrl(category.image),
      url,
      inLanguage: 'en-LK',
      isPartOf: { '@id': `${siteUrl}/#website` },
    },
    breadcrumbs: buildBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Categories', url: '/categories' },
      { name: category.name, url },
    ]),
  };
};

const getProductSeo = async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    isActive: true,
    approvalStatus: 'Approved',
  });

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  return res.json(buildProductSeo(product));
};

const getCategorySeo = async (req, res) => {
  const category = await Category.findOne({
    slug: req.params.slug,
    isActive: true,
  });

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
  return res.json(buildCategorySeo(category));
};

const INDEXABLE_STATIC_PATHS = [
  '',
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

const getSitemap = async (_req, res) => {
  const siteUrl = getSiteUrl();
  const [products, categories] = await Promise.all([
    Product.find({ isActive: true, approvalStatus: 'Approved' })
      .select('_id name image images updatedAt')
      .lean(),
    Category.find({ isActive: true }).select('slug image updatedAt').lean(),
  ]);

  const urls = [
    ...INDEXABLE_STATIC_PATHS.map((path) => ({ loc: `${siteUrl}${path || '/'}` })),
    ...categories.map((category) => ({
      loc: `${siteUrl}/category/${category.slug}`,
      lastmod: category.updatedAt?.toISOString?.(),
      images: category.image ? [{ loc: toAbsoluteUrl(category.image) }] : [],
    })),
    ...products.map((product) => ({
      loc: `${siteUrl}/product/${product._id}`,
      lastmod: product.updatedAt?.toISOString?.(),
      images: getProductImageUrls(product).map((loc) => ({ loc, title: product.name })),
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls
    .map(
      (url) =>
        `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}${(url.images || [])
          .map(
            (image) =>
              `\n    <image:image>\n      <image:loc>${escapeXml(image.loc)}</image:loc>${image.title ? `\n      <image:title>${escapeXml(image.title)}</image:title>` : ''}\n    </image:image>`
          )
          .join('')}\n  </url>`
    )
    .join('\n')}\n</urlset>`;

  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.type('application/xml').send(xml);
};

const getProductFeed = async (_req, res) => {
  const siteUrl = getSiteUrl();
  const products = await Product.find({ isActive: true, approvalStatus: 'Approved' })
    .select(
      '_id name description shortDescription image images category brand price countInStock sku variants sizes'
    )
    .lean();

  const items = products
    .filter((product) => product.name && product.image && Number(product.price) >= 0)
    .map((product) => {
      const link = `${siteUrl}/product/${product._id}`;
      const description =
        cleanText(product.description || product.shortDescription) ||
        `Shop ${product.name} online from Apex Fashion Sri Lanka.`;
      const colors = [...new Set(getProductColors(product))];
      const sizes = [...new Set(getProductSizes(product))];

      return `    <item>
      <g:id>${escapeXml(product.sku || product._id)}</g:id>
      <title>${escapeXml(product.name)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(toAbsoluteUrl(product.image))}</g:image_link>
      <g:availability>${Number(product.countInStock || 0) > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${Number(product.price || 0).toFixed(2)} ${escapeXml(process.env.DEFAULT_CURRENCY || 'LKR')}</g:price>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(product.brand || 'Apex Fashion')}</g:brand>
      <g:product_type>${escapeXml(product.category || 'Fashion')}</g:product_type>${colors.length ? `\n      <g:color>${escapeXml(colors.join('/'))}</g:color>` : ''}${sizes.length ? `\n      <g:size>${escapeXml(sizes.join('/'))}</g:size>` : ''}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Apex Fashion Product Feed</title>
    <link>${siteUrl}</link>
    <description>Approved products available from Apex Fashion Sri Lanka.</description>
${items}
  </channel>
</rss>`;

  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.type('application/xml').send(xml);
};

const getRobots = (_req, res) => {
  const siteUrl = getSiteUrl();
  res
    .set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    .type('text/plain')
    .send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
};

export {
  buildCategorySeo,
  buildProductSeo,
  getCategorySeo,
  getProductFeed,
  getProductSeo,
  getRobots,
  getSitemap,
};
