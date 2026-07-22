import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCategorySeo,
  buildProductFeedItems,
  buildProductSeo,
} from '../../controllers/seoController.js';

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
  assert.equal(seo.canonicalUrl, 'https://apexfashion.lk/product/product-id');
  assert.equal(seo.breadcrumbs['@type'], 'BreadcrumbList');
  assert.equal(seo.structuredData.offers.seller['@id'], 'https://apexfashion.lk/#organization');
});

test('buildProductSeo uses the selected database variant offer', () => {
  const product = {
    _id: { toString: () => 'product-id' },
    name: 'Walking Shoes',
    image: '/shoes.jpg',
    description: 'Walking shoes with selectable size and color options.',
    brand: 'Apex Fashion',
    category: 'Shoes',
    price: 1500,
    countInStock: 20,
    variants: [
      {
        _id: { toString: () => 'variant-id' },
        size: 'M',
        color: 'Black',
        price: 1750,
        countInStock: 0,
        isActive: true,
      },
    ],
    seo: {},
  };
  const seo = buildProductSeo(product, { variant: 'variant-id' });

  assert.equal(seo.structuredData.offers.price, '1750.00');
  assert.equal(seo.structuredData.offers.availability, 'https://schema.org/OutOfStock');
  assert.match(seo.structuredData.offers.url, /variant=variant-id/);
  assert.equal(seo.structuredData.size, 'M');
  assert.equal(seo.structuredData.color, 'Black');
});

test('Merchant feed emits distinct variant items with required fields', () => {
  const xml = buildProductFeedItems([
    {
      _id: '123456789012345678901234',
      name: 'Walking Shoes',
      image: 'https://images.example/shoes.jpg',
      description: 'Walking shoes with selectable options.',
      brand: 'Apex Fashion',
      category: 'Shoes',
      price: 1500,
      countInStock: 20,
      variants: [
        {
          _id: 'abcdefabcdefabcdefabcdef',
          size: 'M',
          color: 'Black',
          price: 1750,
          countInStock: 4,
          isActive: true,
        },
      ],
      sizes: [],
    },
  ]);

  assert.match(xml, /<g:id>123456789012345678901234-abcdefabcdefabcdefabcdef<\/g:id>/);
  assert.match(xml, /<g:price>1750\.00 LKR<\/g:price>/);
  assert.match(xml, /<g:availability>in_stock<\/g:availability>/);
  assert.match(xml, /<g:item_group_id>123456789012345678901234<\/g:item_group_id>/);
  assert.match(xml, /<g:item_group_title>Walking Shoes<\/g:item_group_title>/);
  assert.match(xml, /<g:size>M<\/g:size>/);
  assert.match(xml, /<g:color>Black<\/g:color>/);
  assert.match(xml, /<g:name>size<\/g:name>\s*<g:value>M<\/g:value>/);
  assert.match(xml, /<g:name>color<\/g:name>\s*<g:value>Black<\/g:value>/);
  assert.match(xml, /variant=abcdefabcdefabcdefabcdef/);
  assert.doesNotMatch(xml, /localhost|vercel\.app|www\.apexfashion\.lk/);
});

test('buildCategorySeo creates canonical collection metadata', () => {
  const seo = buildCategorySeo({
    name: "Women's Shoes",
    slug: 'women-shoes',
    description: 'Heels, flats, sandals, and sneakers.',
    image: '/women-shoes.jpg',
    seo: {},
  });

  assert.equal(seo.canonicalUrl, 'https://apexfashion.lk/category/women-shoes');
  assert.equal(seo.structuredData['@type'], 'CollectionPage');
  assert.equal(seo.breadcrumbs.itemListElement.length, 3);
});
