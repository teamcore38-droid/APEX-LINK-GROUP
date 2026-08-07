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
    slug: 'leather-walking-shoes',
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
  assert.equal(seo.canonicalUrl, 'https://www.apexfashion.lk/product/leather-walking-shoes-product-id');
  assert.equal(seo.breadcrumbs['@type'], 'BreadcrumbList');
  assert.equal(seo.structuredData.offers.seller['@id'], 'https://www.apexfashion.lk/#organization');
});

test('buildProductSeo uses the selected database variant offer', () => {
  const product = {
    _id: { toString: () => 'product-id' },
    name: 'Walking Shoes',
    slug: 'walking-shoes',
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
      slug: 'walking-shoes',
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
  assert.match(xml, /https:\/\/www\.apexfashion\.lk\/product\/walking-shoes-123456789012345678901234/);
  assert.doesNotMatch(xml, /localhost|vercel\.app|https:\/\/apexfashion\.lk/);
});

test('buildCategorySeo creates canonical collection metadata', () => {
  const seo = buildCategorySeo(
    {
      name: "Women's Shoes",
      slug: 'women-shoes',
      description: 'Heels, flats, sandals, and sneakers.',
      image: '/women-shoes.jpg',
      seo: {},
    },
    {
      ancestors: [{ name: 'Women', slug: 'women' }],
      products: [
        {
          _id: '123456789012345678901234',
          name: 'Block Heel Sandals',
          slug: 'block-heel-sandals',
          image: '/heels.jpg',
        },
      ],
    }
  );

  assert.equal(seo.canonicalUrl, 'https://www.apexfashion.lk/women-shoes');
  assert.match(seo.title, /Women's Shoes/);
  assert.match(seo.description, /Women's Shoes/);
  assert.equal(seo.structuredData['@type'], 'CollectionPage');
  assert.equal(seo.structuredData.mainEntity['@id'], 'https://www.apexfashion.lk/women-shoes#itemlist');
  assert.equal(seo.breadcrumbs.itemListElement.length, 4);
  assert.equal(seo.breadcrumbs.itemListElement[2].item, 'https://www.apexfashion.lk/women');
  assert.equal(seo.itemList['@type'], 'ItemList');
  assert.equal(seo.itemList.numberOfItems, 1);
  assert.equal(seo.itemList.itemListElement[0].position, 1);
  assert.equal(
    seo.itemList.itemListElement[0].url,
    'https://www.apexfashion.lk/product/block-heel-sandals-123456789012345678901234'
  );
});

test('buildProductSeo uses the branded fallback image when a product has no image', () => {
  const seo = buildProductSeo({
    _id: { toString: () => 'image-free-product' },
    name: 'Image-Free Product',
    slug: 'image-free-product',
    image: '',
    images: [],
    description: 'A product without an uploaded image.',
    brand: 'Apex Fashion',
    category: 'Accessories',
    price: 1200,
    countInStock: 3,
    seo: {},
  });

  assert.equal(seo.ogImage, 'https://www.apexfashion.lk/Apex%20Logo.jpg');
});

test('buildProductSeo never emits an external Myntra image', () => {
  const seo = buildProductSeo({
    _id: { toString: () => 'myntra-image-product' },
    name: 'Imported Product',
    slug: 'imported-product',
    image: 'https://assets.myntassets.com/assets/images/product.jpg',
    images: [{ url: 'https://assets.myntassets.com/assets/images/product.jpg', publicId: '' }],
    description: 'An imported product with a legacy external image.',
    brand: 'Apex Fashion',
    category: 'Accessories',
    price: 1200,
    countInStock: 3,
    seo: {},
  });

  assert.doesNotMatch(seo.ogImage, /myntassets\.com/i);
  assert.doesNotMatch(JSON.stringify(seo.structuredData.image), /myntassets\.com/i);
});
