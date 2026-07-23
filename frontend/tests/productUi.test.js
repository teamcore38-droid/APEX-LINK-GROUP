import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductPayloadFromForm,
  buildProductPath,
  formatCurrency,
  getProductIdFromRouteParam,
  getOptimizedImageUrl,
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
    categories: ['Shoes', 'Women', 'Occasion Wear', 'Women'],
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
