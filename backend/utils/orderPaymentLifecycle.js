import {
  sendOrderPlacedEmail,
  sendOrderConfirmedEmail,
  sendOrderCancelledEmail,
  sendOrderDeliveredEmail,
  sendRefundConfirmationEmail,
} from './emailService.js';

const getPaymentLabel = (order) => order.paymentStatus || (order.isPaid ? 'Paid' : 'Unpaid');

const pushStatusHistoryIfMeaningful = (order, entry) => {
  if (!entry?.note) {
    return false;
  }

  const lastEntry = order.statusHistory?.[order.statusHistory.length - 1];

  if (
    lastEntry &&
    lastEntry.status === entry.status &&
    lastEntry.note === entry.note &&
    String(lastEntry.updatedByName || '') === String(entry.updatedByName || '')
  ) {
    return false;
  }

  order.statusHistory.push({
    status: entry.status || order.orderStatus || 'Processing',
    note: entry.note,
    updatedAt: entry.updatedAt || new Date(),
    updatedBy: entry.updatedBy,
    updatedByName: entry.updatedByName || '',
  });

  return true;
};

const markNotificationSent = (order, key, value = new Date()) => {
  if (!order.notifications) {
    order.notifications = {};
  }

  order.notifications[key] = value;
};

const hasNotificationBeenSent = (order, key) => Boolean(order.notifications?.[key]);
const wasEmailSent = (result) => Boolean(result?.sent);

const hasRefundNotification = (order, refundId) =>
  Boolean(order.notifications?.refundEmailEventIds?.includes(refundId));

const addRefundNotification = (order, refundId) => {
  if (!order.notifications) {
    order.notifications = {};
  }

  const existing = Array.isArray(order.notifications.refundEmailEventIds)
    ? order.notifications.refundEmailEventIds
    : [];

  if (!existing.includes(refundId)) {
    order.notifications.refundEmailEventIds = [...existing, refundId];
  }
};

const calculateRefundStatus = (order) => {
  const refundedAmount = Number(order.refundedAmount || 0);
  const totalPaid = Number(
    order.paymentResult?.amountReceived || order.totalPrice || 0
  );

  if (!refundedAmount) {
    return 'Not Refunded';
  }

  if (refundedAmount >= totalPaid && totalPaid > 0) {
    return 'Refunded';
  }

  return 'Partially Refunded';
};

const calculateRefundableAmount = (order) =>
  Math.max(
    Number(order.paymentResult?.amountReceived || order.totalPrice || 0) -
      Number(order.refundedAmount || 0),
    0
  );

const getPaymentProviderLabel = (paymentIntent, order, fallback = 'Payment gateway') =>
  paymentIntent?.provider || order.paymentProvider || fallback;

const getPaymentCreatedAt = (paymentIntent, fallback) => {
  if (paymentIntent?.created instanceof Date) {
    return paymentIntent.created;
  }

  if (typeof paymentIntent?.created === 'number') {
    return new Date(paymentIntent.created * 1000);
  }

  return fallback;
};

const maybeSendOrderPlacedEmail = async (order) => {
  if (hasNotificationBeenSent(order, 'orderPlacedSentAt')) {
    return false;
  }

  const result = await sendOrderPlacedEmail(order);

  if (!wasEmailSent(result)) {
    return false;
  }

  markNotificationSent(order, 'orderPlacedSentAt');
  return true;
};

const maybeSendOrderConfirmedEmail = async (order) => {
  if (hasNotificationBeenSent(order, 'orderConfirmedSentAt')) {
    return false;
  }

  const result = await sendOrderConfirmedEmail(order);

  if (!wasEmailSent(result)) {
    return false;
  }

  markNotificationSent(order, 'orderConfirmedSentAt');
  return true;
};

const maybeSendOrderCancelledEmail = async (order) => {
  if (hasNotificationBeenSent(order, 'orderCancelledSentAt')) {
    return false;
  }

  const result = await sendOrderCancelledEmail(order);

  if (!wasEmailSent(result)) {
    return false;
  }

  markNotificationSent(order, 'orderCancelledSentAt');
  return true;
};

const maybeSendOrderDeliveredEmail = async (order) => {
  if (hasNotificationBeenSent(order, 'orderDeliveredSentAt')) {
    return false;
  }

  const result = await sendOrderDeliveredEmail(order);

  if (!wasEmailSent(result)) {
    return false;
  }

  markNotificationSent(order, 'orderDeliveredSentAt');
  return true;
};

const maybeSendOrderLifecycleStatusEmail = async (order, previousState = {}) => {
  const orderWasCancelled = previousState.orderStatus === 'Cancelled';
  const orderIsCancelled = order.orderStatus === 'Cancelled';

  if (!orderWasCancelled && orderIsCancelled) {
    return maybeSendOrderCancelledEmail(order);
  }

  const orderWasDelivered = previousState.orderStatus === 'Delivered' || previousState.isDelivered === true;
  const orderIsDelivered = order.orderStatus === 'Delivered' || order.isDelivered === true;

  if (!orderWasDelivered && orderIsDelivered) {
    return maybeSendOrderDeliveredEmail(order);
  }

  const orderWasConfirmed = previousState.orderStatus === 'Confirmed' || previousState.isPaid === true;
  const orderIsConfirmed = order.orderStatus === 'Confirmed' || order.isPaid === true;

  if (!orderWasConfirmed && orderIsConfirmed) {
    return maybeSendOrderConfirmedEmail(order);
  }

  return false;
};

const applySuccessfulPaymentToOrder = async ({
  order,
  paymentIntent,
  actor = {},
  source = 'system',
}) => {
  const alreadyPaid = Boolean(order.isPaid);
  const provider = getPaymentProviderLabel(paymentIntent, order, 'PayHere');
  const createdAt = getPaymentCreatedAt(paymentIntent, order.paidAt || new Date());

  order.isPaid = true;
  order.paidAt = createdAt;
  order.paymentProvider = provider;
  order.paymentMethod = order.paymentMethod || provider;
  order.paymentIntentId = paymentIntent.id || order.paymentIntentId || '';
  order.paymentStatus = 'Paid';
  order.paymentResult = {
    ...order.paymentResult,
    id: paymentIntent.id || order.paymentResult?.id || '',
    status: paymentIntent.status || order.paymentResult?.status || 'succeeded',
    amountReceived:
      Number(paymentIntent.amount_received || 0) > 0
        ? Number(paymentIntent.amount_received || 0) / 100
        : Number(paymentIntent.amountReceived || order.paymentResult?.amountReceived || order.totalPrice || 0),
    currency: paymentIntent.currency || order.paymentResult?.currency || '',
    chargeId:
      order.paymentResult?.chargeId ||
      (typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : '') ||
      '',
    paymentMethodType:
      order.paymentResult?.paymentMethodType ||
      paymentIntent.payment_method_types?.[0] ||
      paymentIntent.paymentMethodType ||
      '',
    receiptEmail:
      paymentIntent.receipt_email ||
      paymentIntent.receiptEmail ||
      order.paymentResult?.receiptEmail ||
      order.shippingAddress?.email ||
      '',
    created: getPaymentCreatedAt(paymentIntent, order.paymentResult?.created || createdAt),
  };

  pushStatusHistoryIfMeaningful(order, {
    status: order.orderStatus,
    note: alreadyPaid
      ? `${provider} payment success confirmed again via ${source}.`
      : `Payment succeeded via ${provider} ${source === 'webhook' ? 'webhook' : 'confirmation'}.`,
    updatedAt: new Date(),
    updatedBy: actor._id,
    updatedByName: actor.name || actor.email || provider,
  });

  await maybeSendOrderConfirmedEmail(order);
};

const applyFailedPaymentToOrder = async ({
  order,
  paymentIntent,
  actor = {},
  source = 'webhook',
  note,
}) => {
  const provider = getPaymentProviderLabel(paymentIntent, order, 'PayHere');

  order.isPaid = false;
  order.paidAt = undefined;
  order.paymentProvider = provider;
  order.paymentIntentId = paymentIntent?.id || order.paymentIntentId || '';
  order.paymentStatus = 'Payment Failed';
  order.paymentResult = {
    ...order.paymentResult,
    id: paymentIntent?.id || order.paymentResult?.id || '',
    status: paymentIntent?.status || 'requires_payment_method',
    amountReceived: Number(order.paymentResult?.amountReceived || 0),
    currency: paymentIntent?.currency || order.paymentResult?.currency || '',
    chargeId: order.paymentResult?.chargeId || '',
    paymentMethodType:
      order.paymentResult?.paymentMethodType ||
      paymentIntent?.payment_method_types?.[0] ||
      paymentIntent?.paymentMethodType ||
      '',
    receiptEmail:
      paymentIntent?.receipt_email ||
      paymentIntent?.receiptEmail ||
      order.paymentResult?.receiptEmail ||
      order.shippingAddress?.email ||
      '',
    created: getPaymentCreatedAt(paymentIntent, order.paymentResult?.created),
  };

  pushStatusHistoryIfMeaningful(order, {
    status: order.orderStatus,
    note:
      note ||
      `Payment failed via ${provider} ${source === 'webhook' ? 'webhook' : 'confirmation'} and the order remains unpaid.`,
    updatedAt: new Date(),
    updatedBy: actor._id,
    updatedByName: actor.name || actor.email || provider,
  });
};

const applyCancelledPaymentToOrder = async ({
  order,
  paymentIntent,
  actor = {},
  source = 'webhook',
}) => {
  const provider = getPaymentProviderLabel(paymentIntent, order, 'PayHere');

  order.isPaid = false;
  order.paidAt = undefined;
  order.paymentProvider = provider;
  order.paymentIntentId = paymentIntent?.id || order.paymentIntentId || '';
  order.paymentStatus = 'Cancelled';
  order.paymentResult = {
    ...order.paymentResult,
    id: paymentIntent?.id || order.paymentResult?.id || '',
    status: paymentIntent?.status || 'canceled',
    currency: paymentIntent?.currency || order.paymentResult?.currency || '',
    receiptEmail:
      paymentIntent?.receipt_email ||
      order.paymentResult?.receiptEmail ||
      order.shippingAddress?.email ||
      '',
  };

  pushStatusHistoryIfMeaningful(order, {
    status: order.orderStatus,
    note: `Payment was cancelled via ${provider} ${source}.`,
    updatedAt: new Date(),
    updatedBy: actor._id,
    updatedByName: actor.name || actor.email || provider,
  });
};

const applyRefundToOrder = async ({
  order,
  refundRecord,
  actor = {},
  source = 'system',
  note,
}) => {
  const existingRefundIndex = order.refundHistory.findIndex(
    (entry) => entry.refundId === refundRecord.refundId
  );

  if (existingRefundIndex >= 0) {
    order.refundHistory[existingRefundIndex] = {
      ...order.refundHistory[existingRefundIndex].toObject?.(),
      ...refundRecord,
    };
  } else {
    order.refundHistory.push(refundRecord);
  }

  const successfulRefundTotal = order.refundHistory
    .filter((entry) => entry.status === 'succeeded')
    .reduce((total, entry) => total + Number(entry.amount || 0), 0);

  order.refundedAmount = successfulRefundTotal;

  if (refundRecord.status === 'failed') {
    order.refundStatus = 'Refund Failed';
  } else {
    order.refundStatus = calculateRefundStatus(order);
  }

  if (order.refundStatus === 'Refunded') {
    order.paymentStatus = 'Refunded';
  } else if (order.isPaid) {
    order.paymentStatus = 'Paid';
  }

  pushStatusHistoryIfMeaningful(order, {
    status: order.orderStatus,
    note:
      note ||
      (refundRecord.status === 'failed'
        ? `Refund attempt failed for ${refundRecord.amount.toFixed(2)} ${refundRecord.currency.toUpperCase()}.`
        : `Refund ${refundRecord.status} for ${refundRecord.amount.toFixed(2)} ${refundRecord.currency.toUpperCase()} via ${source}.`),
    updatedAt: refundRecord.createdAt || new Date(),
    updatedBy: actor._id || refundRecord.processedBy,
    updatedByName:
      actor.name || actor.email || refundRecord.processedByName || order.paymentProvider || 'Payment gateway',
  });

  if (
    refundRecord.status === 'succeeded' &&
    order.refundStatus === 'Refunded' &&
    refundRecord.refundId &&
    !hasRefundNotification(order, refundRecord.refundId)
  ) {
    const result = await sendRefundConfirmationEmail(order, refundRecord);

    if (!wasEmailSent(result)) {
      return;
    }

    addRefundNotification(order, refundRecord.refundId);
  }
};

const createStatusEmailKey = (order) =>
  [
    order.orderStatus,
    getPaymentLabel(order),
    order.isDelivered ? 'delivered' : 'not-delivered',
    order.trackingNumber || '',
    order.deliveryNote || '',
    Number(order.refundedAmount || 0),
    order.refundStatus || 'Not Refunded',
  ].join('|');

export {
  calculateRefundableAmount,
  calculateRefundStatus,
  pushStatusHistoryIfMeaningful,
  markNotificationSent,
  maybeSendOrderPlacedEmail,
  maybeSendOrderConfirmedEmail,
  maybeSendOrderCancelledEmail,
  maybeSendOrderDeliveredEmail,
  maybeSendOrderLifecycleStatusEmail,
  applySuccessfulPaymentToOrder,
  applyFailedPaymentToOrder,
  applyCancelledPaymentToOrder,
  applyRefundToOrder,
  createStatusEmailKey,
};
