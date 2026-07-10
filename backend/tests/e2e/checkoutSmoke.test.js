import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.E2E_BASE_URL || '';

test('checkout quote smoke test recalculates totals server-side', { skip: !baseUrl }, async (t) => {
  const productsResponse = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/products`);
  assert.equal(productsResponse.ok, true);
  const productPayload = await productsResponse.json();
  const products = Array.isArray(productPayload) ? productPayload : productPayload.products || [];

  if (products.length === 0) {
    t.skip('No products are seeded in the target environment');
    return;
  }

  const product = products.find((item) => Number(item.countInStock || 0) > 0) || products[0];
  const quoteResponse = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/orders/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderItems: [
        {
          product: product._id,
          qty: 1,
          price: 0,
        },
      ],
      shippingAddress: {
        fullName: 'E2E Test',
        phone: '+10000000000',
        email: 'e2e@example.com',
        addressLine1: '100 Test Street',
        city: 'Colombo',
        state: 'WP',
        postalCode: '10000',
        country: 'LK',
      },
      totalPrice: 0,
    }),
  });

  assert.equal(quoteResponse.ok, true);
  const quote = await quoteResponse.json();
  assert.equal(Number(quote.totalPrice) > 0, true);
  assert.notEqual(Number(quote.totalPrice), 0);
});
