import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import { decorateCategoryPaths, resolveCategoryByPath } from './categoryController.js';
import {
  cleanProductText,
  getDatabaseProductDescription,
  getProductOptions,
} from '../utils/productSeoContent.js';
import { buildProductUrl } from '../utils/productUrls.js';

const DEFAULT_SITE_URL = 'https://www.apexfashion.lk';
const DEFAULT_IMAGE_PATH = '/Apex Logo.jpg';
const STORE_ID = `${DEFAULT_SITE_URL}/#organization`;
const CATEGORY_ITEMLIST_LIMIT = 24;
const RELATED_CATEGORY_LIMIT = 8;
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
const PRODUCT_PAGE_SEO_FILTER = {
  $and: [
    ...PUBLIC_PRODUCT_FILTER.$and,
    { name: { $type: 'string', $regex: /\S/ } },
    { price: { $gt: 0 } },
  ],
};

const getSiteUrl = () => DEFAULT_SITE_URL;

const isMyntraImageUrl = (value = '') => {
  try {
    return new URL(value, DEFAULT_SITE_URL).hostname.toLowerCase() === 'assets.myntassets.com';
  } catch {
    return false;
  }
};

const getCloudinaryImageUrl = (publicId = '') => {
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const normalizedPublicId = String(publicId || '').trim();

  if (!cloudName || !normalizedPublicId) {
    return '';
  }

  const encodedPublicId = normalizedPublicId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/f_jpg,w_1200,h_630,c_fill,q_auto/${encodedPublicId}`;
};

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getImageUrl = (image = '') => {
  if (image && typeof image === 'object') {
    const cloudinaryUrl = getCloudinaryImageUrl(image.publicId || image.public_id);
    if (cloudinaryUrl) {
      return cloudinaryUrl;
    }
  }

  const url = (typeof image === 'string' ? image : String(image?.url || image?.secureUrl || image?.secure_url || '')).trim();
  return isMyntraImageUrl(url) ? '' : url;
};

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
    let href = url.href.replace(/^https:\/\/apexfashion\.lk(?=\/|$)/i, DEFAULT_SITE_URL);
    if (href.includes('/image/upload/')) {
      if (!/\/image\/upload\/[^/]*f_jpg/.test(href)) {
        href = href.replace('/image/upload/', '/image/upload/f_jpg,w_1200,h_630,c_fill,q_auto/');
      }
    } else if (href.endsWith('.webp')) {
      href = href.replace(/\.webp$/i, '.jpg');
    }
    return href;
  } catch {
    return `${siteUrl}${DEFAULT_IMAGE_PATH}`;
  }
};

const getProductImageUrls = (product = {}) =>
  [{ url: product.image, publicId: product.imagePublicId }, ...(product.images || [])]
    .map((image) => getImageUrl(image))
    .filter(Boolean)
    .map((image) => toAbsoluteUrl(image))
    .filter((image, index, images) => images.indexOf(image) === index);

const getCategoryDescription = (category) =>
  cleanProductText(category.seo?.description, 160) ||
  cleanProductText(category.description, 160) ||
  `Shop ${category.name} online from Apex Fashion Sri Lanka.`;

const getCategoryMetaTitle = (category) => {
  const customTitle = cleanProductText(category.seo?.title, 110);
  const categoryName = cleanProductText(category.name, 80);
  const withSiteName = (title) =>
    title.toLowerCase().includes('apex fashion') ? title : cleanProductText(`${title} | Apex Fashion`, 150);

  if (customTitle && customTitle.toLowerCase().includes(categoryName.toLowerCase())) {
    return withSiteName(customTitle);
  }

  if (customTitle) {
    return withSiteName(cleanProductText(`${categoryName} | ${customTitle}`, 130));
  }

  return `${categoryName} Online in Sri Lanka | Apex Fashion`;
};

const getCategoryMetaDescription = (category, productCount = 0) => {
  const categoryName = cleanProductText(category.name, 80);
  const baseDescription = getCategoryDescription(category);
  const productText = productCount > 0 ? ` Browse ${productCount} selected products.` : '';

  if (baseDescription.toLowerCase().includes(categoryName.toLowerCase())) {
    return cleanProductText(`${baseDescription}${productText}`, 160);
  }

  return cleanProductText(`Shop ${categoryName} online in Sri Lanka. ${baseDescription}${productText}`, 160);
};

const getCategoryImageUrl = (category = {}) => toAbsoluteUrl(category.seo?.ogImage || category.image);

const getCategoryUrl = (category, siteUrl = getSiteUrl()) => `${siteUrl}/${category.path || category.slug}`;

const getCategoryProductFilter = (categoryNames = []) => {
  const categoryPatterns = categoryNames
    .map((name) => cleanProductText(name, 100))
    .filter(Boolean)
    .map((name) => new RegExp(`^${escapeRegex(name)}$`, 'i'));

  return {
    ...SEO_PRODUCT_FILTER,
    ...(categoryPatterns.length > 0
      ? {
          $or: [
            { category: { $in: categoryPatterns } },
            { categories: { $in: categoryPatterns } },
          ],
        }
      : {}),
  };
};

const getCategoryProductFilterByIds = (categoryIds = []) => ({
  ...SEO_PRODUCT_FILTER,
  ...(categoryIds.length > 0
    ? {
        $or: [
          { categoryRef: { $in: categoryIds } },
          { categoryRefs: { $in: categoryIds } },
        ],
      }
    : { _id: null }),
});

const getDescendantCategoryNames = async (category) => {
  const names = [category.name];
  const queue = [category._id];
  const visited = new Set();

  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentKey = String(currentId);

    if (visited.has(currentKey)) {
      continue;
    }

    visited.add(currentKey);

    const children = await Category.find({ parentCategory: currentId, isActive: true }).select('_id name').lean();
    children.forEach((child) => {
      names.push(child.name);
      queue.push(child._id);
    });
  }

  return names;
};

const getDescendantCategoryIds = async (category) => {
  const ids = [category._id];
  const queue = [category._id];
  const visited = new Set();

  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentKey = String(currentId);

    if (visited.has(currentKey)) {
      continue;
    }

    visited.add(currentKey);

    const children = await Category.find({ parentCategory: currentId, isActive: true }).select('_id').lean();
    children.forEach((child) => {
      ids.push(child._id);
      queue.push(child._id);
    });
  }

  return ids;
};

const getCategoryAncestors = async (category) => {
  const ancestors = [];
  const visited = new Set();
  let parentId = category.parentCategory?._id || category.parentCategory;

  while (parentId) {
    const parentKey = String(parentId);
    if (visited.has(parentKey)) break;
    visited.add(parentKey);

    const parent = await Category.findOne({ _id: parentId, isActive: true })
      .select('_id name slug parentCategory')
      .lean();

    if (!parent) break;
    ancestors.unshift(parent);
    parentId = parent.parentCategory?._id || parent.parentCategory;
  }

  return ancestors;
};

const getRelatedCategories = async (category) => {
  const parentId = category.parentCategory?._id || category.parentCategory || null;
  const relatedFilter = parentId
    ? { parentCategory: parentId, _id: { $ne: category._id }, isActive: true }
    : { parentCategory: category._id, isActive: true };

  let related = await Category.find(relatedFilter)
    .select('name slug description image updatedAt')
    .sort({ displayOrder: 1, name: 1 })
    .limit(RELATED_CATEGORY_LIMIT)
    .lean();

  if (related.length === 0 && parentId) {
    related = await Category.find({ parentCategory: category._id, isActive: true })
      .select('name slug description image updatedAt')
      .sort({ displayOrder: 1, name: 1 })
      .limit(RELATED_CATEGORY_LIMIT)
      .lean();
  }

  return related.map((relatedCategory) => ({
    name: relatedCategory.name,
    slug: relatedCategory.slug,
    url: getCategoryUrl(relatedCategory),
    description: getCategoryDescription(relatedCategory),
    image: toAbsoluteUrl(relatedCategory.image),
  }));
};

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
  const selectedImage = getImageUrl(
    selectedOption?.imagePublicId
      ? { url: selectedOption.image, publicId: selectedOption.imagePublicId }
      : selectedOption?.image || selectedOption?.images?.[0]
  );
  const primaryImage = getImageUrl({ url: product.image, publicId: product.imagePublicId });

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
    ogImage: toAbsoluteUrl(
      selectedImage || getImageUrl(product.seo?.ogImage) || primaryImage || DEFAULT_IMAGE_PATH
    ),
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

const buildCategoryItemList = (category, products = [], siteUrl = getSiteUrl()) => {
  const url = getCategoryUrl(category, siteUrl);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${url}#itemlist`,
    name: `${category.name} products`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => {
      const productUrl = buildProductUrl(product, siteUrl);

      return {
        '@type': 'ListItem',
        position: index + 1,
        name: cleanProductText(product.name, 150),
        url: productUrl,
      };
    }),
  };
};

const buildCategorySeo = (category, { products = [], ancestors = [], relatedCategories = [] } = {}) => {
  const siteUrl = getSiteUrl();
  const url = getCategoryUrl(category, siteUrl);
  const description = getCategoryMetaDescription(category, products.length);
  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
    ...ancestors.map((ancestor) => ({ name: ancestor.name, url: getCategoryUrl(ancestor, siteUrl) })),
    { name: category.name, url },
  ];

  return {
    title: getCategoryMetaTitle(category),
    description,
    keywords:
      category.seo?.keywords?.length > 0
        ? category.seo.keywords
        : [category.name, `${category.name} Sri Lanka`, 'Apex Fashion'],
    canonicalUrl: url,
    ogImage: getCategoryImageUrl(category),
    url,
    type: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#collection`,
      name: category.name,
      description,
      image: getCategoryImageUrl(category),
      url,
      inLanguage: 'en-LK',
      isPartOf: { '@id': `${siteUrl}/#website` },
      mainEntity: { '@id': `${url}#itemlist` },
    },
    breadcrumbs: buildBreadcrumbs(breadcrumbItems),
    itemList: buildCategoryItemList(category, products, siteUrl),
    relatedCategories,
  };
};

const getProductSeo = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, ...PRODUCT_PAGE_SEO_FILTER });

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  return res.json(buildProductSeo(product, req.query));
};

const getCategorySeo = async (req, res) => {
  const category = await resolveCategoryByPath(req.query.path || req.params.slug);

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  const [categoryIds, ancestors, relatedCategories] = await Promise.all([
    getDescendantCategoryIds(category),
    getCategoryAncestors(category),
    getRelatedCategories(category),
  ]);
  const products = await Product.find(getCategoryProductFilterByIds(categoryIds))
    .select('_id name slug image images updatedAt')
    .sort({ isFeatured: -1, isBestSeller: -1, createdAt: -1 })
    .limit(CATEGORY_ITEMLIST_LIMIT)
    .lean();

  res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
  return res.json(buildCategorySeo(category, { products, ancestors, relatedCategories }));
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
    Category.find({ isActive: true }).select('name slug parentCategory image updatedAt').lean(),
  ]);

  const urls = [
    ...INDEXABLE_STATIC_PATHS.map((path) => ({ loc: `${siteUrl}${path || '/'}` })),
    ...decorateCategoryPaths(categories).map((category) => ({
      loc: getCategoryUrl(category, siteUrl),
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
