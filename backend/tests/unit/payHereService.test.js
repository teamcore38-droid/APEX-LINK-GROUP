import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatPayHereAmount,
  generatePayHereCheckoutHash,
  generatePayHereNotificationSignature,
  getPayHereStatusType,
  isDuplicateSuccessfulPayHereNotification,
  validatePayHereNotificationForOrder,
  verifyPayHereNotification,
} from '../../utils/paymentService.js';

const withPayHereEnv = (fn) => {
  const originalMerchantId = process.env.PAYHERE_MERCHANT_ID;
  const originalSecret = process.env.PAYHERE_MERCHANT_SECRET;
  process.env.PAYHERE_MERCHANT_ID = '121212';
  process.env.PAYHERE_MERCHANT_SECRET = 'sandbox-secret';

  try {
    fn();
  } finally {
    if (originalMerchantId === undefined) {
      delete process.env.PAYHERE_MERCHANT_ID;
    } else {
      process.env.PAYHERE_MERCHANT_ID = originalMerchantId;
    }

    if (originalSecret === undefined) {
      delete process.env.PAYHERE_MERCHANT_SECRET;
    } else {
      process.env.PAYHERE_MERCHANT_SECRET = originalSecret;
    }
  }
};

const createOrder = (overrides = {}) => ({
  _id: { toString: () => 'ORDER-100' },
  totalPrice: 2500,
  currency: 'LKR',
  isPaid: false,
  paymentIntentId: '',
  paymentResult: {},
  ...overrides,
});

const createPayload = (overrides = {}) => {
  const payload = {
    merchant_id: '121212',
    order_id: 'ORDER-100',
    payment_id: 'PAY-100',
    payhere_amount: '2500.00',
    payhere_currency: 'LKR',
    status_code: '2',
    ...overrides,
  };

  payload.md5sig = generatePayHereNotificationSignature({
    merchantId: payload.merchant_id,
    orderId: payload.order_id,
    amount: payload.payhere_amount,
    currency: payload.payhere_currency,
    statusCode: payload.status_code,
  });

  return payload;
};

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
  withPayHereEnv(() => {
    const payload = createPayload();
    assert.equal(verifyPayHereNotification(payload), true);
    assert.equal(verifyPayHereNotification({ ...payload, payhere_amount: '2501.00' }), false);
  });
});

test('PayHere amount formatting always uses two decimal places', () => {
  assert.equal(formatPayHereAmount(2500), '2500.00');
  assert.equal(formatPayHereAmount('2500.5'), '2500.50');
  assert.throws(() => formatPayHereAmount('not-a-number'), /valid non-negative/);
});

test('PayHere notification validator accepts a valid successful notification', () => {
  withPayHereEnv(() => {
    const result = validatePayHereNotificationForOrder(createPayload(), createOrder());

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });
});

test('PayHere notification validator rejects invalid signature', () => {
  withPayHereEnv(() => {
    const result = validatePayHereNotificationForOrder(
      { ...createPayload(), md5sig: 'BAD-SIGNATURE' },
      createOrder()
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('Invalid PayHere md5sig'));
  });
});

test('PayHere notification validator rejects merchant mismatch', () => {
  withPayHereEnv(() => {
    const result = validatePayHereNotificationForOrder(createPayload({ merchant_id: '999999' }), createOrder());

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('PayHere merchant_id mismatch'));
  });
});

test('PayHere notification validator rejects amount mismatch', () => {
  withPayHereEnv(() => {
    const result = validatePayHereNotificationForOrder(createPayload({ payhere_amount: '2501.00' }), createOrder());

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('PayHere amount mismatch'));
  });
});

test('PayHere notification validator rejects currency mismatch', () => {
  withPayHereEnv(() => {
    const result = validatePayHereNotificationForOrder(createPayload({ payhere_currency: 'USD' }), createOrder());

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('PayHere currency must be LKR'));
  });
});

test('PayHere duplicate success helper prevents paid order reprocessing', () => {
  assert.equal(
    isDuplicateSuccessfulPayHereNotification(
      createOrder({ isPaid: true, paymentIntentId: 'PAY-100', paymentResult: { id: 'PAY-100' } }),
      'PAY-100'
    ),
    true
  );
  assert.equal(
    isDuplicateSuccessfulPayHereNotification(
      createOrder({ isPaid: true, paymentIntentId: 'PAY-100', paymentResult: { id: 'PAY-100' } }),
      'PAY-200'
    ),
    false
  );
  assert.equal(isDuplicateSuccessfulPayHereNotification(createOrder({ isPaid: false }), 'PAY-100'), false);
});

test('PayHere status code mapper supports documented statuses', () => {
  assert.equal(getPayHereStatusType('2'), 'paid');
  assert.equal(getPayHereStatusType('0'), 'pending');
  assert.equal(getPayHereStatusType('-1'), 'cancelled');
  assert.equal(getPayHereStatusType('-2'), 'failed');
  assert.equal(getPayHereStatusType('-3'), 'chargedback');
  assert.equal(getPayHereStatusType('unexpected'), 'unknown');
});
