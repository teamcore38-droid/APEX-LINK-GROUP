import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductPayloadFromForm,
  formatCurrency,
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
