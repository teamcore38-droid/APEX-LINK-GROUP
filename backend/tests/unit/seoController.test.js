import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCategorySeo, buildProductSeo } from '../../controllers/seoController.js';

test('buildProductSeo creates product structured data', () => {
  const product = {
    _id: { toString: () => 'product-id' },
    name: 'Leather Walking Shoes',
    image: '/shoes.jpg',
    images: [],
    description: 'Comfortable walking shoes.',
    shortDescription: 'Leather walking shoes',
    sku: 'SHOE-1',
    brand: 'Apex Fashion',
    category: 'Shoes & Footwear',
    price: 10,
    countInStock: 5,
    numReviews: 2,
    rating: 4.5,
    seo: {},
  };

  const seo = buildProductSeo(product);

  assert.equal(seo.structuredData['@type'], 'Product');
  assert.equal(seo.structuredData.offers.availability, 'https://schema.org/InStock');
  assert.equal(seo.canonicalUrl, 'https://www.apexfashion.lk/product/product-id');
  assert.equal(seo.breadcrumbs['@type'], 'BreadcrumbList');
  assert.equal(seo.structuredData.offers.seller['@id'], 'https://www.apexfashion.lk/#organization');
});

test('buildCategorySeo creates canonical collection metadata', () => {
  const seo = buildCategorySeo({
    name: "Women's Shoes",
    slug: 'women-shoes',
    description: 'Heels, flats, sandals, and sneakers.',
    image: '/women-shoes.jpg',
    seo: {},
  });

  assert.equal(seo.canonicalUrl, 'https://www.apexfashion.lk/category/women-shoes');
  assert.equal(seo.structuredData['@type'], 'CollectionPage');
  assert.equal(seo.breadcrumbs.itemListElement.length, 3);
});
