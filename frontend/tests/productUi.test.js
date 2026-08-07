import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductPayloadFromForm,
  buildProductPath,
  formatCurrency,
  getProductIdFromRouteParam,
  getProductBadges,
  getOptimizedImageUrl,
  getResponsiveImageSrcSet,
  getProductFormGalleryImages,
  getVariantImageAssets,
  getStockPresentation,
  setProductFormGalleryImages,
  setVariantImageAssets,
} from '../src/utils/productUi.js';

test('formatCurrency returns a currency formatted string', () => {
  const result = formatCurrency(2500, 'LKR');
  assert.equal(typeof result, 'string');
  assert.match(result, /2,500|2500|LKR/);
});

test('getStockPresentation distinguishes out of stock', () => {
  const result = getStockPresentation(0);
  assert.equal(result.label, 'Out of Stock');
  assert.match(result.className, /red/);
});

test('getProductBadges applies priority and caps badges at two', () => {
  const badges = getProductBadges({ isBestSeller: true, isFeatured: true, countInStock: 5 });

  assert.deepEqual(badges.map((badge) => badge.key), ['best-seller', 'featured']);
  assert.equal(badges[0].label, 'Best Seller');
});

test('getProductBadges includes the current low-stock quantity', () => {
  const badges = getProductBadges({ countInStock: 5 });

  assert.equal(badges[0].label, 'Low Stock (5)');
  assert.match(badges[0].className, /d99a32/);
});

test('getProductBadges renders out-of-stock as the fallback stock badge', () => {
  const badges = getProductBadges({ countInStock: 0 });

  assert.deepEqual(badges.map((badge) => badge.key), ['out-of-stock']);
  assert.equal(badges[0].label, 'Out of Stock');
});

test('getOptimizedImageUrl adds lightweight Cloudinary transforms', () => {
  const result = getOptimizedImageUrl(
    'https://res.cloudinary.com/demo/image/upload/v123/products/shoe.jpg',
    { width: 600, height: 600, crop: 'fill' }
  );

  assert.equal(
    result,
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:eco,w_600,h_600,c_fill,dpr_auto/v123/products/shoe.jpg'
  );
});

test('getOptimizedImageUrl merges resize directives with existing automatic format and quality', () => {
  const cases = [
    {
      input: 'https://res.cloudinary.com/demo/image/upload/f_auto/v123/products/shoe.jpg',
      expected: 'f_auto,q_auto:eco,w_520,h_520,c_fill,dpr_auto',
    },
    {
      input: 'https://res.cloudinary.com/demo/image/upload/q_auto/v123/products/shoe.jpg',
      expected: 'f_auto,q_auto,w_520,h_520,c_fill,dpr_auto',
    },
    {
      input: 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v123/products/shoe.jpg',
      expected: 'f_auto,q_auto,w_520,h_520,c_fill,dpr_auto',
    },
    {
      input: 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1200,h_1200,c_fill/v123/products/shoe.jpg',
      expected: 'f_auto,q_auto,w_520,h_520,c_fill,dpr_auto',
    },
  ];

  cases.forEach(({ input, expected }) => {
    const result = getOptimizedImageUrl(input, { width: 520, height: 520, crop: 'fill' });
    assert.equal(result, `https://res.cloudinary.com/demo/image/upload/${expected}/v123/products/shoe.jpg`);
    assert.equal((result.match(/f_auto/g) || []).length, 1);
    assert.equal((result.match(/q_auto/g) || []).length, 1);
  });
});

test('getOptimizedImageUrl preserves useful transformations, folders, versions, and query strings', () => {
  const result = getOptimizedImageUrl(
    'https://res.cloudinary.com/demo/image/upload/e_sharpen/f_auto,q_70/v1234567890/catalog/shoes/red-runner.jpg?_a=tracking',
    { width: 520, height: 520, crop: 'fill' }
  );

  assert.equal(
    result,
    'https://res.cloudinary.com/demo/image/upload/e_sharpen/f_auto,q_70,w_520,h_520,c_fill,dpr_auto/v1234567890/catalog/shoes/red-runner.jpg?_a=tracking'
  );
});

test('getOptimizedImageUrl preserves existing quality and crop when they are not overridden', () => {
  const result = getOptimizedImageUrl(
    'https://res.cloudinary.com/demo/image/upload/q_75,w_1200,c_fit/v123/catalog/shoe.jpg',
    { width: 520 }
  );

  assert.equal(
    result,
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_75,w_520,c_fit,dpr_auto/v123/catalog/shoe.jpg'
  );
});

test('getOptimizedImageUrl preserves unversioned folders, extensions, queries, and hashes', () => {
  const result = getOptimizedImageUrl(
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/catalog/shoes/red-runner.png?download=1#detail',
    { width: 360, height: 270, crop: 'fill', dpr: false }
  );

  assert.equal(
    result,
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_360,h_270,c_fill/catalog/shoes/red-runner.png?download=1#detail'
  );
});

test('getOptimizedImageUrl applies explicit overrides once across chained transformations', () => {
  const result = getOptimizedImageUrl(
    'https://res.cloudinary.com/demo/image/upload/f_jpg,q_90,w_1200,h_900,c_fit,dpr_2.0/e_sharpen/v123/catalog/shoe.jpg',
    {
      width: 360,
      height: 270,
      crop: 'fill',
      quality: 'auto:good',
      format: 'webp',
      dpr: false,
    }
  );

  assert.equal(
    result,
    'https://res.cloudinary.com/demo/image/upload/f_webp,q_auto:good,w_360,h_270,c_fill/e_sharpen/v123/catalog/shoe.jpg'
  );
  const managedDirectives = new URL(result).pathname
    .split('/image/upload/')[1]
    .split('/')[0]
    .split(',');
  ['f_', 'q_', 'w_', 'h_', 'c_'].forEach((directive) => {
    assert.equal(managedDirectives.filter((entry) => entry.startsWith(directive)).length, 1);
  });
  assert.doesNotMatch(result, /dpr_/);
});

test('getOptimizedImageUrl ignores invalid explicit transforms without constructing malformed URLs', () => {
  const input = 'https://res.cloudinary.com/demo/image/upload/v123/catalog/shoe.jpg';
  const result = getOptimizedImageUrl(input, {
    width: 0,
    height: Number.NaN,
    crop: 'fill/invalid',
    quality: false,
    format: false,
    dpr: false,
  });

  assert.equal(result, input);
});

test('getOptimizedImageUrl supports the existing product image object shape', () => {
  const result = getOptimizedImageUrl(
    { secureUrl: 'https://res.cloudinary.com/demo/image/upload/v123/catalog/shoe.jpg' },
    { width: 240, height: 240, crop: 'fill', dpr: false }
  );

  assert.equal(
    result,
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:eco,w_240,h_240,c_fill/v123/catalog/shoe.jpg'
  );
});

test('getOptimizedImageUrl safely preserves non-Cloudinary, signed, private, invalid, and missing images', () => {
  const unchangedUrls = [
    'https://images.example.com/image/upload/products/shoe.jpg',
    '/images/products/shoe.jpg',
    'data:image/png;base64,abc',
    'blob:https://www.apexfashion.lk/example',
    'https://res.cloudinary.com/demo/image/upload/s--signed-token--/w_200/products/shoe.jpg',
    'https://res.cloudinary.com/demo/image/authenticated/w_200/products/shoe.jpg',
    'not a valid URL',
    '',
  ];

  unchangedUrls.forEach((input) => {
    assert.equal(getOptimizedImageUrl(input, { width: 520, height: 520 }), input);
  });
});

test('getResponsiveImageSrcSet creates practical Cloudinary width candidates without DPR duplication', () => {
  const result = getResponsiveImageSrcSet(
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v123/products/shoe.jpg?keep=1',
    { widths: [720, 240, 520, 360, 520], aspectRatio: 4 / 3, crop: 'fill' }
  );

  assert.equal(
    result,
    [
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_240,h_180,c_fill/v123/products/shoe.jpg?keep=1 240w',
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_360,h_270,c_fill/v123/products/shoe.jpg?keep=1 360w',
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_520,h_390,c_fill/v123/products/shoe.jpg?keep=1 520w',
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_720,h_540,c_fill/v123/products/shoe.jpg?keep=1 720w',
    ].join(', ')
  );
  assert.doesNotMatch(result, /dpr_/);
});

test('getResponsiveImageSrcSet is omitted for images Cloudinary cannot safely transform', () => {
  assert.equal(
    getResponsiveImageSrcSet('https://images.example.com/products/shoe.jpg', {
      widths: [240, 520],
      aspectRatio: 1,
    }),
    ''
  );
  assert.equal(getResponsiveImageSrcSet('', { widths: [240, 520], aspectRatio: 1 }), '');
});

test('getResponsiveImageSrcSet normalizes, deduplicates, and rejects invalid candidate widths', () => {
  const result = getResponsiveImageSrcSet(
    'https://res.cloudinary.com/demo/image/upload/v123/products/shoe.jpg',
    {
      widths: [Number.NaN, -1, 0, 359.6, 360, '520', Number.POSITIVE_INFINITY],
      height: 270,
      crop: 'fill',
    }
  );

  assert.equal(
    result,
    [
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:eco,w_360,h_270,c_fill/v123/products/shoe.jpg 360w',
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:eco,w_520,h_270,c_fill/v123/products/shoe.jpg 520w',
    ].join(', ')
  );
});

test('getResponsiveImageSrcSet returns an empty value for a missing or invalid width list', () => {
  const input = 'https://res.cloudinary.com/demo/image/upload/v123/products/shoe.jpg';

  assert.equal(getResponsiveImageSrcSet(input), '');
  assert.equal(getResponsiveImageSrcSet(input, { widths: 520, aspectRatio: 1 }), '');
});

test('product gallery helpers preserve primary image ordering', () => {
  const form = setProductFormGalleryImages(
    {
      name: 'Gallery Product',
      slug: 'gallery-product',
      category: 'Textiles & Apparel',
      price: '10',
      compareAtPrice: '',
      weight: '',
      countInStock: '5',
      lowStockThreshold: '2',
      image: '',
      imagePublicId: '',
      imageList: '',
      imageAssets: [],
      variantsJson: '[]',
      shortDescription: '',
      description: '',
      origin: '',
      ingredients: '',
      brand: 'Apex Link Group',
      sku: '',
      isFeatured: false,
      isActive: true,
      isBestSeller: false,
    },
    [
      { url: 'primary.jpg', publicId: 'products/primary' },
      { url: 'detail.jpg', publicId: 'products/detail' },
      { url: 'packaging.jpg', publicId: 'products/packaging' },
    ]
  );

  assert.deepEqual(getProductFormGalleryImages(form), [
    { url: 'primary.jpg', publicId: 'products/primary' },
    { url: 'detail.jpg', publicId: 'products/detail' },
    { url: 'packaging.jpg', publicId: 'products/packaging' },
  ]);

  const payload = buildProductPayloadFromForm(form);
  assert.equal(payload.image, 'primary.jpg');
  assert.equal(payload.imagePublicId, 'products/primary');
  assert.deepEqual(payload.images, [
    { url: 'primary.jpg', publicId: 'products/primary' },
    { url: 'detail.jpg', publicId: 'products/detail' },
    { url: 'packaging.jpg', publicId: 'products/packaging' },
  ]);
});

test('variant gallery helpers preserve color-specific image ordering', () => {
  const variant = setVariantImageAssets(
    { label: 'Black / M', color: 'Black', size: 'M' },
    [
      { url: 'black-primary.jpg', publicId: 'variants/black-primary' },
      { url: 'black-side.jpg', publicId: 'variants/black-side' },
    ]
  );

  assert.equal(variant.image, 'black-primary.jpg');
  assert.equal(variant.imagePublicId, 'variants/black-primary');
  assert.deepEqual(getVariantImageAssets(variant), [
    { url: 'black-primary.jpg', publicId: 'variants/black-primary' },
    { url: 'black-side.jpg', publicId: 'variants/black-side' },
  ]);

  assert.deepEqual(getVariantImageAssets({ galleryImages: ['legacy-black.jpg'] }), [
    { url: 'legacy-black.jpg', publicId: '' },
  ]);
});

test('product payload preserves primary and additional categories', () => {
  const payload = buildProductPayloadFromForm({
    name: 'Evening Heel',
    slug: 'evening-heel',
    category: 'Shoes',
    categoryId: '64f300000000000000000001',
    categories: ['Shoes', 'Women', 'Occasion Wear', 'Women'],
    categoryIds: [
      '64f300000000000000000001',
      '64f300000000000000000002',
      '64f300000000000000000001',
    ],
    price: '1200',
    compareAtPrice: '',
    weight: '',
    countInStock: '4',
    lowStockThreshold: '2',
    image: '',
    imagePublicId: '',
    imageList: '',
    imageAssets: [],
    variantsJson: '[]',
    hasSizes: false,
    sizes: [],
    shortDescription: '',
    description: 'Elegant evening heel with cushioned lining.',
    origin: '',
    ingredients: '',
    brand: 'Apex Fashion',
    sku: '',
    isFeatured: false,
    isActive: true,
    isBestSeller: false,
  });

  assert.equal(payload.category, 'Shoes');
  assert.deepEqual(payload.categories, ['Shoes', 'Women', 'Occasion Wear']);
  assert.equal(payload.categoryId, '64f300000000000000000001');
  assert.deepEqual(payload.categoryIds, [
    '64f300000000000000000001',
    '64f300000000000000000002',
  ]);
});

test('product URL helpers build slugged paths and recover database IDs', () => {
  const path = buildProductPath({
    _id: '6a50f936edb8f74ee8e0c471',
    slug: 'Unique Graceful Men Flip Flops',
    name: 'Ignored fallback',
  });

  assert.equal(path, '/product/unique-graceful-men-flip-flops-6a50f936edb8f74ee8e0c471');
  assert.equal(
    getProductIdFromRouteParam('unique-graceful-men-flip-flops-6a50f936edb8f74ee8e0c471'),
    '6a50f936edb8f74ee8e0c471'
  );
  assert.equal(getProductIdFromRouteParam('6a50f936edb8f74ee8e0c471'), '6a50f936edb8f74ee8e0c471');
});
