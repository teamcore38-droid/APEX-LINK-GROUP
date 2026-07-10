import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, getStockPresentation } from '../src/utils/productUi.js';

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
