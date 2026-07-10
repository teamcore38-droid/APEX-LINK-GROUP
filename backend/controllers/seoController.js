import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';

const getSiteUrl = () =>
  String(process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildProductSeo = (product) => {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/product/${product._id}`;

  return {
    title: product.seo?.title || `${product.name} | Apex Link Group`,
    description:
      product.seo?.description ||
      product.shortDescription ||
      product.description?.slice(0, 160) ||
      'Premium marketplace product from Apex Link Group.',
    keywords: product.seo?.keywords || [product.category, product.brand, product.sku].filter(Boolean),
    canonicalUrl: product.seo?.canonicalUrl || url,
    ogImage: product.seo?.ogImage || product.image || `${siteUrl}/Apex Logo.jpg`,
    url,
    type: 'product',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: [product.image, ...(product.images || [])].filter(Boolean),
      description: product.description || product.shortDescription || '',
      sku: product.sku || product._id.toString(),
      brand: {
        '@type': 'Brand',
        name: product.brand || 'Apex Link Group',
      },
      aggregateRating:
        Number(product.numReviews || 0) > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: Number(product.rating || 0),
              reviewCount: Number(product.numReviews || 0),
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
      },
    },
  };
};

const buildCategorySeo = (category) => {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/category/${category.slug}`;

  return {
    title: category.seo?.title || `${category.name} | Apex Link Group`,
    description:
      category.seo?.description ||
      category.description ||
      `Shop premium ${category.name} products from Apex Link Group.`,
    keywords: category.seo?.keywords || [category.name, 'Apex Link Group', 'marketplace'],
    canonicalUrl: category.seo?.canonicalUrl || url,
    ogImage: category.seo?.ogImage || category.image || `${siteUrl}/Apex Logo.jpg`,
    url,
    type: 'category',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: category.name,
      description: category.description || '',
      image: category.image || `${siteUrl}/Apex Logo.jpg`,
      url,
    },
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

  res.json(buildProductSeo(product));
};

const getCategorySeo = async (req, res) => {
  const category = await Category.findOne({
    slug: req.params.slug,
    isActive: true,
  });

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  res.json(buildCategorySeo(category));
};

const getSitemap = async (_req, res) => {
  const siteUrl = getSiteUrl();
  const [products, categories] = await Promise.all([
    Product.find({ isActive: true, approvalStatus: 'Approved' }).select('_id updatedAt').lean(),
    Category.find({ isActive: true }).select('slug updatedAt').lean(),
  ]);

  const staticUrls = ['', '/products', '/categories', '/rfq', '/about', '/contact', '/faq', '/shipping', '/returns', '/privacy', '/terms'];
  const urls = [
    ...staticUrls.map((path) => ({ loc: `${siteUrl}${path}`, priority: path === '' ? '1.0' : '0.7' })),
    ...categories.map((category) => ({
      loc: `${siteUrl}/category/${category.slug}`,
      lastmod: category.updatedAt?.toISOString?.(),
      priority: '0.8',
    })),
    ...products.map((product) => ({
      loc: `${siteUrl}/product/${product._id}`,
      lastmod: product.updatedAt?.toISOString?.(),
      priority: '0.9',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (url) =>
        `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}\n    <priority>${url.priority}</priority>\n  </url>`
    )
    .join('\n')}\n</urlset>`;

  res.type('application/xml').send(xml);
};

const getRobots = (_req, res) => {
  const siteUrl = getSiteUrl();
  res
    .type('text/plain')
    .send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\nDisallow: /profile\nDisallow: /account\nSitemap: ${siteUrl}/sitemap.xml\n`);
};

export {
  buildCategorySeo,
  buildProductSeo,
  getCategorySeo,
  getProductSeo,
  getRobots,
  getSitemap,
};
