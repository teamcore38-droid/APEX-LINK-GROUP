import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generatePayHereCheckoutHash,
  generatePayHereNotificationSignature,
  verifyPayHereNotification,
} from '../../utils/paymentService.js';

test('PayHere checkout hash is deterministic and uppercase', () => {
  const hash = generatePayHereCheckoutHash({
    merchantId: '121212',
    orderId: 'ORDER-100',
    amount: 2500,
    currency: 'LKR',
    merchantSecret: 'sandbox-secret',
  });

  assert.equal(hash, hash.toUpperCase());
  assert.equal(hash.length, 32);
  assert.equal(
    hash,
    generatePayHereCheckoutHash({
      merchantId: '121212',
      orderId: 'ORDER-100',
      amount: '2500.00',
      currency: 'LKR',
      merchantSecret: 'sandbox-secret',
    })
  );
});

test('PayHere notification signature verification matches callback payload', () => {
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  process.env.PAYHERE_MERCHANT_SECRET = 'sandbox-secret';

  try {
    const payload = {
      merchant_id: '121212',
      order_id: 'ORDER-100',
      payhere_amount: '2500.00',
      payhere_currency: 'LKR',
      status_code: '2',
    };

    payload.md5sig = generatePayHereNotificationSignature({
      merchantId: payload.merchant_id,
      orderId: payload.order_id,
      amount: payload.payhere_amount,
      currency: payload.payhere_currency,
      statusCode: payload.status_code,
    });

    assert.equal(verifyPayHereNotification(payload), true);
    assert.equal(verifyPayHereNotification({ ...payload, payhere_amount: '2501.00' }), false);
  } finally {
    if (merchantSecret === undefined) {
      delete process.env.PAYHERE_MERCHANT_SECRET;
    } else {
      process.env.PAYHERE_MERCHANT_SECRET = merchantSecret;
    }
  }
});
