import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckoutIntegrity } from '../../utils/fraudService.js';

test('checkout integrity flags mismatched totals', () => {
  const result = buildCheckoutIntegrity(
    {
      totalPrice: 120,
      orderItems: [{ product: 'p1', variantId: '', price: 100, name: 'Product' }],
    },
    {
      totalPrice: 12,
      orderItems: [{ product: 'p1', price: 100 }],
    }
  );

  assert.equal(result.tamperDetected, true);
  assert.match(result.tamperReasons.join(' '), /Client total/);
});

test('checkout integrity allows matching client price echoes', () => {
  const result = buildCheckoutIntegrity(
    {
      totalPrice: 120,
      orderItems: [{ product: 'p1', variantId: '', price: 100, name: 'Product' }],
    },
    {
      totalPrice: 120,
      orderItems: [{ product: 'p1', price: 100 }],
    }
  );

  assert.equal(result.tamperDetected, false);
});
