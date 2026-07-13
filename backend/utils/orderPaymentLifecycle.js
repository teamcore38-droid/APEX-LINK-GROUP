import {
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendRefundConfirmationEmail,
  sendInvoiceEmail,
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

const maybeSendOrderConfirmation = async (order) => {
  if (order.notifications?.orderConfirmationSentAt) {
    return false;
  }

  await sendOrderConfirmationEmail(order);
  markNotificationSent(order, 'orderConfirmationSentAt');
  return true;
};

const maybeSendInvoiceEmail = async (order) => {
  if (order.notifications?.invoiceSentAt) {
    return false;
  }

  await sendInvoiceEmail(order);
  markNotificationSent(order, 'invoiceSentAt');
  return true;
};

const maybeSendStatusEmail = async (order, emailKey) => {
  if (order.notifications?.lastStatusEmailKey === emailKey) {
    return false;
  }

  await sendOrderStatusUpdateEmail(order);
  markNotificationSent(order, 'lastStatusEmailKey', emailKey);
  return true;
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

  await maybeSendOrderConfirmation(order);
  await maybeSendInvoiceEmail(order);
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
    refundRecord.refundId &&
    !hasRefundNotification(order, refundRecord.refundId)
  ) {
    await sendRefundConfirmationEmail(order, refundRecord);
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
  maybeSendOrderConfirmation,
  maybeSendInvoiceEmail,
  maybeSendStatusEmail,
  applySuccessfulPaymentToOrder,
  applyFailedPaymentToOrder,
  applyCancelledPaymentToOrder,
  applyRefundToOrder,
  createStatusEmailKey,
};
