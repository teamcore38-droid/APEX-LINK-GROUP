import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchFilter } from '../../controllers/customerExperienceController.js';

const hasPriceFilter = (filter) =>
  (filter.$and || []).some((entry) => Object.prototype.hasOwnProperty.call(entry, 'price'));

test('buildSearchFilter does not add an empty price filter for blank prices', () => {
  const { filter, error } = buildSearchFilter({
    minPrice: '',
    maxPrice: '',
  });

  assert.equal(error, undefined);
  assert.equal(hasPriceFilter(filter), false);
});

test('buildSearchFilter adds price bounds only when provided', () => {
  const { filter, error } = buildSearchFilter({
    minPrice: '10',
    maxPrice: '50',
  });

  const priceFilter = filter.$and.find((entry) => entry.price)?.price;

  assert.equal(error, undefined);
  assert.deepEqual(priceFilter, { $gte: 10, $lte: 50 });
});

test('buildSearchFilter rejects invalid price values', () => {
  const { error } = buildSearchFilter({
    minPrice: '[object Object]',
  });

  assert.equal(error, 'Price filters must be valid numbers');
});

test('buildSearchFilter can match a parent category and active child categories', () => {
  const { filter, error } = buildSearchFilter(
    { category: 'Women' },
    { categoryNames: ['Women', 'Dresses', 'Heels'] }
  );

  const categoryFilter = filter.$and.find((entry) => entry.$or)?.$or;

  assert.equal(error, undefined);
  assert.equal(categoryFilter.length, 2);
  assert.match(String(categoryFilter[0].category), /\^Women\$/);
  assert.match(String(categoryFilter[0].category), /\^Dresses\$/);
  assert.match(String(categoryFilter[0].category), /\^Heels\$/);
  assert.match(String(categoryFilter[1].categories), /\^Dresses\$/);
});
