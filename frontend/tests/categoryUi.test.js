import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getActiveTopLevelCategoryId,
  getPublicCategoryPath,
} from '../src/utils/categoryUi.js';

const categories = [
  { _id: 'women', name: 'Women', slug: 'women', parentCategory: null },
  { _id: 'men', name: 'Men', slug: 'men', parentCategory: null },
  {
    _id: 'dresses',
    name: 'Dresses',
    slug: 'womens-dresses',
    parentCategory: { _id: 'women', name: 'Women', slug: 'women' },
  },
  {
    _id: 'evening-dresses',
    name: 'Evening Dresses',
    slug: 'evening-dresses',
    parentCategory: { _id: 'dresses', name: 'Dresses', slug: 'womens-dresses' },
  },
];

test('product category links use the database category slug', () => {
  assert.equal(
    getPublicCategoryPath('Shoes & Footwear', 'footwear'),
    '/category/footwear'
  );
});

test('product category links fall back to a working filtered catalog URL', () => {
  assert.equal(
    getPublicCategoryPath('Shoes & Footwear'),
    '/products?category=Shoes%20%26%20Footwear'
  );
});

test('category routes resolve to their active top-level navigation category', () => {
  assert.equal(getActiveTopLevelCategoryId(categories, '/category/women'), 'women');
  assert.equal(getActiveTopLevelCategoryId(categories, '/category/womens-dresses'), 'women');
  assert.equal(getActiveTopLevelCategoryId(categories, '/category/evening-dresses/'), 'women');
  assert.equal(getActiveTopLevelCategoryId(categories, '/category/men'), 'men');
});

test('non-category and unknown routes do not leave a category active', () => {
  assert.equal(getActiveTopLevelCategoryId(categories, '/products'), null);
  assert.equal(getActiveTopLevelCategoryId(categories, '/product/123'), null);
  assert.equal(getActiveTopLevelCategoryId(categories, '/category/not-found'), null);
});

test('an intentional catalog category filter activates its top-level category', () => {
  assert.equal(
    getActiveTopLevelCategoryId(categories, '/products', '?category=Women'),
    'women'
  );
  assert.equal(
    getActiveTopLevelCategoryId(categories, '/products', '?category=Womens%20Dresses'),
    'women'
  );
  assert.equal(getActiveTopLevelCategoryId(categories, '/products', '?brand=Apex'), null);
});
