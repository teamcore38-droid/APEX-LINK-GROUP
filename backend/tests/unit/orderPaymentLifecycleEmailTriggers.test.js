import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRefundToOrder,
  maybeSendOrderConfirmedEmail,
  maybeSendOrderLifecycleStatusEmail,
  maybeSendOrderPlacedEmail,
} from '../../utils/orderPaymentLifecycle.js';

const EMAIL_ENV_KEYS = [
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
];

const withEmailFallback = async (callback) => {
  const previous = Object.fromEntries(EMAIL_ENV_KEYS.map((key) => [key, process.env[key]]));
  const originalLog = console.log;

  try {
    EMAIL_ENV_KEYS.forEach((key) => {
      delete process.env[key];
    });
    console.log = () => {};
    await callback();
  } finally {
    EMAIL_ENV_KEYS.forEach((key) => {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    });
    console.log = originalLog;
  }
};

const createOrder = (overrides = {}) => ({
  _id: { toString: () => 'order-id' },
  shippingAddress: { email: 'customer@example.com' },
  totalPrice: 100,
  orderStatus: 'Processing',
  paymentStatus: 'Payment Pending',
  isPaid: false,
  isDelivered: false,
  notifications: {},
  statusHistory: [],
  refundHistory: [],
  refundedAmount: 0,
  refundStatus: 'Not Refunded',
  paymentResult: { amountReceived: 100 },
  ...overrides,
});

test('order placed email is not marked when SMTP send is skipped', async () => {
  await withEmailFallback(async () => {
    const order = createOrder();

    assert.equal(await maybeSendOrderPlacedEmail(order), false);
    assert.equal(order.notifications.orderPlacedSentAt, undefined);
  });
});

test('order confirmed email is not marked when SMTP send is skipped', async () => {
  await withEmailFallback(async () => {
    const order = createOrder({ orderStatus: 'Confirmed' });

    assert.equal(await maybeSendOrderConfirmedEmail(order), false);
    assert.equal(order.notifications.orderConfirmedSentAt, undefined);
  });
});

test('existing sent markers prevent duplicate lifecycle emails', async () => {
  await withEmailFallback(async () => {
    const order = createOrder({
      orderStatus: 'Confirmed',
      notifications: {
        orderPlacedSentAt: new Date(),
        orderConfirmedSentAt: new Date(),
      },
    });

    assert.equal(await maybeSendOrderPlacedEmail(order), false);
    assert.equal(await maybeSendOrderConfirmedEmail(order), false);
  });
});

test('status email is skipped for non-final fulfillment updates', async () => {
  await withEmailFallback(async () => {
    const order = createOrder({ orderStatus: 'Shipped', trackingNumber: 'TRK-1' });

    assert.equal(
      await maybeSendOrderLifecycleStatusEmail(order, {
        orderStatus: 'Packed',
        isPaid: false,
        isDelivered: false,
        trackingNumber: '',
      }),
      false
    );
    assert.deepEqual(order.notifications, {});
  });
});

test('final status email prioritizes cancelled over other same-update changes', async () => {
  await withEmailFallback(async () => {
    const order = createOrder({
      orderStatus: 'Cancelled',
      isPaid: true,
      isDelivered: true,
    });

    assert.equal(
      await maybeSendOrderLifecycleStatusEmail(order, {
        orderStatus: 'Processing',
        isPaid: false,
        isDelivered: false,
      }),
      false
    );
    assert.equal(order.notifications.orderCancelledSentAt, undefined);
    assert.equal(order.notifications.orderConfirmedSentAt, undefined);
    assert.equal(order.notifications.orderDeliveredSentAt, undefined);
  });
});

test('final status email prioritizes delivered over confirmation', async () => {
  await withEmailFallback(async () => {
    const order = createOrder({
      orderStatus: 'Delivered',
      isPaid: true,
      isDelivered: true,
    });

    assert.equal(
      await maybeSendOrderLifecycleStatusEmail(order, {
        orderStatus: 'Processing',
        isPaid: false,
        isDelivered: false,
      }),
      false
    );
    assert.equal(order.notifications.orderDeliveredSentAt, undefined);
    assert.equal(order.notifications.orderConfirmedSentAt, undefined);
  });
});

test('partial refund does not send a final refunded email', async () => {
  await withEmailFallback(async () => {
    const order = createOrder({ isPaid: true, paymentStatus: 'Paid' });

    await applyRefundToOrder({
      order,
      refundRecord: {
        refundId: 'refund-partial',
        amount: 25,
        currency: 'LKR',
        status: 'succeeded',
      },
    });

    assert.equal(order.refundStatus, 'Partially Refunded');
    assert.deepEqual(order.notifications.refundEmailEventIds || [], []);
  });
});

test('full refund sends one refunded email per refund event', async () => {
  await withEmailFallback(async () => {
    const order = createOrder({ isPaid: true, paymentStatus: 'Paid' });

    await applyRefundToOrder({
      order,
      refundRecord: {
        refundId: 'refund-full',
        amount: 100,
        currency: 'LKR',
        status: 'succeeded',
      },
    });

    assert.equal(order.refundStatus, 'Refunded');
    assert.deepEqual(order.notifications.refundEmailEventIds || [], []);

    await applyRefundToOrder({
      order,
      refundRecord: {
        refundId: 'refund-full',
        amount: 100,
        currency: 'LKR',
        status: 'succeeded',
      },
    });

    assert.deepEqual(order.notifications.refundEmailEventIds || [], []);
  });
});
