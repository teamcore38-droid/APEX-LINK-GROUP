import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductSeo } from '../../controllers/seoController.js';

test('buildProductSeo creates product structured data', () => {
  const product = {
    _id: { toString: () => 'product-id' },
    name: 'Premium Tea',
    image: '/tea.jpg',
    images: [],
    description: 'A premium tea.',
    shortDescription: 'Premium tea',
    sku: 'TEA-1',
    brand: 'Apex',
    price: 10,
    countInStock: 5,
    numReviews: 2,
    rating: 4.5,
    seo: {},
  };

  const seo = buildProductSeo(product);

  assert.equal(seo.structuredData['@type'], 'Product');
  assert.equal(seo.structuredData.offers.availability, 'https://schema.org/InStock');
});
