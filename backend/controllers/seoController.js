import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import {
  cleanProductText,
  getDatabaseProductDescription,
  getProductOptions,
} from '../utils/productSeoContent.js';
import { buildProductUrl } from '../utils/productUrls.js';

const DEFAULT_SITE_URL = 'https://apexfashion.lk';
const DEFAULT_IMAGE_PATH = '/hero/hero-bg-4.webp';
const STORE_ID = `${DEFAULT_SITE_URL}/#organization`;
const PUBLIC_PRODUCT_FILTER = {
  $and: [
    { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
    { $or: [{ approvalStatus: 'Approved' }, { approvalStatus: { $exists: false } }] },
  ],
};
const SEO_PRODUCT_FILTER = {
  $and: [
    ...PUBLIC_PRODUCT_FILTER.$and,
    { name: { $type: 'string', $regex: /\S/ } },
    { image: { $type: 'string', $regex: /\S/ } },
    { brand: { $type: 'string', $regex: /\S/ } },
    { price: { $gt: 0 } },
  ],
};

const getSiteUrl = () => DEFAULT_SITE_URL;

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const getImageUrl = (image = '') =>
  typeof image === 'string' ? image : String(image?.url || image?.secureUrl || '').trim();

const toAbsoluteUrl = (value = '', siteUrl = getSiteUrl()) => {
  try {
    const url = new URL(value || DEFAULT_IMAGE_PATH, siteUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Unsupported public URL protocol');
    }
    if (
      ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname) ||
      url.hostname.endsWith('.vercel.app')
    ) {
      throw new Error('Development or preview URL is not public');
    }
    return url.href;
  } catch {
    return `${siteUrl}${DEFAULT_IMAGE_PATH}`;
  }
};

const getProductImageUrls = (product = {}) =>
  [product.image, ...(product.images || [])]
    .map((image) => getImageUrl(image))
    .filter(Boolean)
    .map((image) => toAbsoluteUrl(image))
    .filter((image, index, images) => images.indexOf(image) === index);

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

const getSelectedProductOption = (product = {}, selection = {}) => {
  const requestedVariant = cleanProductText(selection.variant, 80);
  const requestedSize = cleanProductText(selection.size, 100).toLowerCase();
  const requestedColor = cleanProductText(selection.color, 100).toLowerCase();
  const variants = (product.variants || []).filter((variant) => variant.isActive !== false);
  const variant = variants.find((option) => {
    if (requestedVariant && option._id?.toString() === requestedVariant) return true;
    const sizeMatches = !requestedSize || cleanProductText(option.size, 100).toLowerCase() === requestedSize;
    const colorMatches =
      !requestedColor || cleanProductText(option.color, 100).toLowerCase() === requestedColor;
    return Boolean(requestedSize || requestedColor) && sizeMatches && colorMatches;
  });
  const sizeOption = !variant && requestedSize
    ? (product.sizes || []).find(
        (option) => cleanProductText(option.size, 100).toLowerCase() === requestedSize
      )
    : null;

  return variant || sizeOption || null;
};

const buildProductSeo = (product, selection = {}) => {
  const siteUrl = getSiteUrl();
  const url = buildProductUrl(product, siteUrl);
  const selectedOption = getSelectedProductOption(product, selection);
  const offerUrl = new URL(url);
  const selectedSize = cleanProductText(selectedOption?.size, 100);
  const selectedColor = cleanProductText(selectedOption?.color, 100);
  const selectedImage = getImageUrl(selectedOption?.image || selectedOption?.images?.[0]);

  if (selectedOption?._id) offerUrl.searchParams.set('variant', selectedOption._id.toString());
  if (selectedSize) offerUrl.searchParams.set('size', selectedSize);
  if (selectedColor) offerUrl.searchParams.set('color', selectedColor);

  const fullDescription = getDatabaseProductDescription(product);
  const description = getDatabaseProductDescription(product, 160);
  const { colors, sizes } = getProductOptions(product);
  const productName = cleanProductText(product.name, 150);
  const brand = cleanProductText(product.brand, 100);
  const selectedPrice = getFeedPrice(product, selectedOption || {});
  const selectedStock = selectedOption
    ? Number(selectedOption.countInStock || 0)
    : Number(product.countInStock || 0);
  const schemaImages = [
    ...(selectedImage ? [toAbsoluteUrl(selectedImage)] : []),
    ...getProductImageUrls(product),
  ].filter((image, index, images) => images.indexOf(image) === index);

  return {
    title: cleanProductText(product.seo?.title, 150) || `${productName} | Apex Fashion`,
    description,
    keywords:
      product.seo?.keywords?.length > 0
        ? product.seo.keywords
        : [productName, product.category, brand, product.sku, 'Sri Lanka'].filter(Boolean),
    canonicalUrl: url,
    ogImage: toAbsoluteUrl(selectedImage || product.seo?.ogImage || product.image),
    url,
    type: 'product',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${url}#product`,
      name: productName,
      image: schemaImages,
      description: fullDescription,
      sku: selectedOption?.sku || product.sku || product._id.toString(),
      category: product.category,
      color: selectedColor || colors.join(', ') || undefined,
      size: selectedSize || sizes.join(', ') || undefined,
      brand: {
        '@type': 'Brand',
        name: brand,
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
        url: offerUrl.href,
        priceCurrency: 'LKR',
        price: selectedPrice.toFixed(2),
        availability:
          selectedStock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@id': STORE_ID.replace(DEFAULT_SITE_URL, siteUrl) },
      },
    },
    breadcrumbs: buildBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Products', url: '/products' },
      { name: productName, url },
    ]),
  };
};

const buildCategorySeo = (category) => {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/category/${category.slug}`;
  const description =
    cleanProductText(category.seo?.description, 160) ||
    cleanProductText(category.description, 160) ||
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
  const product = await Product.findOne({ _id: req.params.id, ...SEO_PRODUCT_FILTER });

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  return res.json(buildProductSeo(product, req.query));
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
    Product.find(SEO_PRODUCT_FILTER)
      .select('_id name slug image images updatedAt')
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
      loc: buildProductUrl(product, siteUrl),
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

const getFeedPrice = (product, option = {}) => {
  const explicitPrice = Number(option.price || 0);
  if (explicitPrice > 0) return explicitPrice;
  return Number(product.price || 0) + Number(option.priceAdjustment || 0);
};

const buildFeedOptions = (product = {}) => {
  const activeVariants = (product.variants || []).filter(
    (variant) => variant.isActive !== false && (variant.size || variant.color)
  );
  const representedSizes = new Set(activeVariants.map((variant) => variant.size).filter(Boolean));
  const sizeOnlyOptions = product.hasSizes
    ? (product.sizes || [])
        .filter((size) => size.size && !representedSizes.has(size.size))
        .map((size) => ({ ...size, isSizeOnly: true }))
    : [];
  const options = [...activeVariants, ...sizeOnlyOptions];

  return options.length > 0 ? options : [null];
};

const buildFeedItem = (product, option = null, variantDimensions = []) => {
  const siteUrl = getSiteUrl();
  const baseLink = buildProductUrl(product, siteUrl);
  const description = getDatabaseProductDescription(product);
  const brand = cleanProductText(product.brand, 100);
  const size = cleanProductText(option?.size, 100);
  const color = cleanProductText(option?.color, 100);
  const optionId = option?._id?.toString() || (size ? `size-${size.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '');
  const id = cleanProductText(option ? `${product._id}-${optionId}` : product.sku || product._id, 50);
  const titleSuffix = [size, color].filter(Boolean).join(' - ');
  const title = cleanProductText(`${product.name}${titleSuffix ? ` - ${titleSuffix}` : ''}`, 150);
  const price = getFeedPrice(product, option || {});
  const stock = option ? Number(option.countInStock || 0) : Number(product.countInStock || 0);
  const image = getImageUrl(option?.image || option?.images?.[0]) || product.image;
  const link = new URL(baseLink);

  if (option?._id) link.searchParams.set('variant', option._id.toString());
  if (size) link.searchParams.set('size', size);
  if (color) link.searchParams.set('color', color);

  return `    <item>
      <g:id>${escapeXml(id)}</g:id>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link.href)}</link>
      <g:image_link>${escapeXml(toAbsoluteUrl(image))}</g:image_link>
      <g:availability>${stock > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${price.toFixed(2)} LKR</g:price>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:product_type>${escapeXml(product.category || 'Fashion')}</g:product_type>${option ? `
      <g:item_group_id>${escapeXml(product._id)}</g:item_group_id>
      <g:item_group_title>${escapeXml(cleanProductText(product.name, 150))}</g:item_group_title>${color ? `
      <g:color>${escapeXml(color)}</g:color>` : ''}${size ? `
      <g:size>${escapeXml(size)}</g:size>` : ''}${variantDimensions
        .map(
          (dimension) => `
      <g:variant_option>
        <g:name>${escapeXml(dimension)}</g:name>
        <g:value>${escapeXml(dimension === 'size' ? size : color)}</g:value>
      </g:variant_option>`
        )
        .join('')}` : ''}
    </item>`;
};

const buildProductFeedItems = (products = []) =>
  products
    .flatMap((product) => {
      const options = buildFeedOptions(product);
      const variantDimensions = options[0]
        ? ['size', 'color'].filter((dimension) =>
            options.every((option) => cleanProductText(option?.[dimension], 100))
          )
        : [];
      return options.map((option) => buildFeedItem(product, option, variantDimensions));
    })
    .join('\n');

const getProductFeed = async (_req, res) => {
  const siteUrl = getSiteUrl();
  const products = await Product.find(SEO_PRODUCT_FILTER)
    .select(
      '_id name description shortDescription image images category brand price countInStock sku variants hasSizes sizes seo origin'
    )
    .lean();
  const items = buildProductFeedItems(products);

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
  buildProductFeedItems,
  buildProductSeo,
  getCategorySeo,
  getProductFeed,
  getProductSeo,
  getRobots,
  getSitemap,
};
