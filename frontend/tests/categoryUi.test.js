import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicCategoryPath } from '../src/utils/categoryUi.js';

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
