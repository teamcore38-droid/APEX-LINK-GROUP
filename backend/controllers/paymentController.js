import Order from '../models/orderModel.js';
import StripeEvent from '../models/stripeEventModel.js';
import {
  applyCancelledPaymentToOrder,
  applyFailedPaymentToOrder,
  applyRefundToOrder,
  applySuccessfulPaymentToOrder,
  calculateRefundableAmount,
} from '../utils/orderPaymentLifecycle.js';
import { commitPromotionsForOrder } from '../utils/commerceService.js';
import {
  deductReservedInventory,
  releaseReservedInventory,
} from '../utils/inventoryService.js';
import { syncVendorOrdersForOrder } from '../utils/vendorService.js';
import { awardOrderLoyaltyPoints } from '../utils/loyaltyService.js';
import {
  buildSafePaymentResult,
  buildSafeRefundRecord,
  buildWebhookEvent,
  getStripeClient,
  getStripeCurrency,
  isStripeConfigured,
  isStripeWebhookConfigured,
  toStripeAmount,
} from '../utils/paymentService.js';
import { recordAuditLog } from '../utils/auditService.js';
import { notifyOrderEvent } from '../utils/pushService.js';
import { emitWebhookEvent } from '../utils/webhookService.js';
import {
  assessOrderFraud,
  recordFraudSignal,
  shouldBlockPayment,
} from '../utils/fraudService.js';

const REFUND_REASON_VALUES = ['duplicate', 'fraudulent', 'requested_by_customer'];

const getSafeWebhookActor = () => ({
  name: 'Stripe Webhook',
  email: 'stripe-webhook@system',
});

const getAdminActor = (user) => ({
  _id: user?._id,
  name: user?.name || user?.email || 'Admin',
  email: user?.email || '',
});

const findOrderForPaymentIntent = async (paymentIntentId = '', fallbackOrderId = '') => {
  const normalizedIntentId = String(paymentIntentId || '').trim();
  const normalizedOrderId = String(fallbackOrderId || '').trim();

  if (normalizedIntentId) {
    const byIntent = await Order.findOne({ paymentIntentId: normalizedIntentId });

    if (byIntent) {
      return byIntent;
    }
  }

  if (normalizedOrderId) {
    try {
      return await Order.findById(normalizedOrderId);
    } catch {
      return null;
    }
  }

  return null;
};

const findOrderForRefund = async (refund = {}) => {
  const paymentIntentId =
    typeof refund.payment_intent === 'string'
      ? refund.payment_intent
      : refund.payment_intent?.id || '';
  const chargeId =
    typeof refund.charge === 'string' ? refund.charge : refund.charge?.id || '';
  const fallbackOrderId = refund.metadata?.orderId || '';

  if (paymentIntentId) {
    const byIntent = await Order.findOne({ paymentIntentId });

    if (byIntent) {
      return byIntent;
    }
  }

  if (chargeId) {
    const byCharge = await Order.findOne({ 'paymentResult.chargeId': chargeId });

    if (byCharge) {
      return byCharge;
    }
  }

  if (fallbackOrderId) {
    try {
      return await Order.findById(fallbackOrderId);
    } catch {
      return null;
    }
  }

  return null;
};

const updateStripeEventRecord = async (eventRecord, updates = {}) => {
  if (!eventRecord) {
    return;
  }

  eventRecord.type = updates.type || eventRecord.type;
  eventRecord.paymentIntentId = updates.paymentIntentId ?? eventRecord.paymentIntentId;
  eventRecord.orderId = updates.orderId ?? eventRecord.orderId;
  eventRecord.processed = updates.processed ?? eventRecord.processed;
  eventRecord.processingError = updates.processingError ?? eventRecord.processingError;
  await eventRecord.save();
};

const processPaymentIntentSucceeded = async (paymentIntent) => {
  const order = await findOrderForPaymentIntent(
    paymentIntent.id,
    paymentIntent.metadata?.orderId || ''
  );

  if (!order) {
    return { order: null, paymentIntentId: paymentIntent.id };
  }

  await applySuccessfulPaymentToOrder({
    order,
    paymentIntent,
    actor: getSafeWebhookActor(),
    source: 'webhook',
  });
  await deductReservedInventory({ order, actor: getSafeWebhookActor() });
  await commitPromotionsForOrder(order);
  await awardOrderLoyaltyPoints(order, getSafeWebhookActor());

  if (!order.paymentResult?.chargeId && paymentIntent.latest_charge) {
    order.paymentResult = {
      ...order.paymentResult,
      chargeId:
        typeof paymentIntent.latest_charge === 'string'
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id || '',
    };
  }

  await order.save();
  await syncVendorOrdersForOrder(order);
  await notifyOrderEvent(order, 'order.paid');
  await emitWebhookEvent('order.paid', order.toObject(), {
    resourceType: 'Order',
    resourceId: order._id.toString(),
  });

  return { order, paymentIntentId: paymentIntent.id };
};

const processPaymentIntentFailed = async (paymentIntent) => {
  const order = await findOrderForPaymentIntent(
    paymentIntent.id,
    paymentIntent.metadata?.orderId || ''
  );

  if (!order) {
    return { order: null, paymentIntentId: paymentIntent.id };
  }

  const failureMessage = paymentIntent.last_payment_error?.message
    ? `Stripe reported payment failure: ${paymentIntent.last_payment_error.message}`
    : '';

  await applyFailedPaymentToOrder({
    order,
    paymentIntent,
    actor: getSafeWebhookActor(),
    source: 'webhook',
    note: failureMessage,
  });
  await releaseReservedInventory({
    order,
    actor: getSafeWebhookActor(),
    note: 'Released reservation after Stripe reported payment failure.',
  });

  await order.save();
  await syncVendorOrdersForOrder(order);
  await emitWebhookEvent('payment.failed', order.toObject(), {
    resourceType: 'Order',
    resourceId: order._id.toString(),
  });

  return { order, paymentIntentId: paymentIntent.id };
};

const processPaymentIntentCanceled = async (paymentIntent) => {
  const order = await findOrderForPaymentIntent(
    paymentIntent.id,
    paymentIntent.metadata?.orderId || ''
  );

  if (!order) {
    return { order: null, paymentIntentId: paymentIntent.id };
  }

  await applyCancelledPaymentToOrder({
    order,
    paymentIntent,
    actor: getSafeWebhookActor(),
    source: 'webhook',
  });
  await releaseReservedInventory({
    order,
    actor: getSafeWebhookActor(),
    note: 'Released reservation after Stripe payment was cancelled.',
  });

  await order.save();
  await syncVendorOrdersForOrder(order);
  await emitWebhookEvent('payment.cancelled', order.toObject(), {
    resourceType: 'Order',
    resourceId: order._id.toString(),
  });

  return { order, paymentIntentId: paymentIntent.id };
};

const processRefundObject = async (refund, eventType = 'refund.updated') => {
  const order = await findOrderForRefund(refund);

  if (!order) {
    return {
      order: null,
      paymentIntentId:
        typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id || '',
    };
  }

  const refundRecord = buildSafeRefundRecord(refund, {
    source: 'webhook',
    processedByName: 'Stripe Webhook',
  });

  await applyRefundToOrder({
    order,
    refundRecord,
    actor: getSafeWebhookActor(),
    source: 'webhook',
    note:
      eventType === 'refund.failed'
        ? `Stripe reported a failed refund attempt for ${refundRecord.amount.toFixed(2)} ${String(refundRecord.currency || '').toUpperCase() || getStripeCurrency().toUpperCase()}.`
        : undefined,
  });

  await order.save();
  await syncVendorOrdersForOrder(order);
  await emitWebhookEvent('refund.updated', order.toObject(), {
    resourceType: 'Order',
    resourceId: order._id.toString(),
  });

  return {
    order,
    paymentIntentId:
      typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id || '',
  };
};

const processChargeRefunded = async (charge) => {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id || '';
  const chargeId = charge.id || '';

  let order = await findOrderForPaymentIntent(paymentIntentId, '');

  if (!order && chargeId) {
    order = await Order.findOne({ 'paymentResult.chargeId': chargeId });
  }

  if (!order) {
    return { order: null, paymentIntentId };
  }

  if (Array.isArray(charge.refunds?.data) && charge.refunds.data.length > 0) {
    for (const refund of charge.refunds.data) {
      const refundRecord = buildSafeRefundRecord(refund, {
        source: 'webhook',
        processedByName: 'Stripe Webhook',
      });

      await applyRefundToOrder({
        order,
        refundRecord,
        actor: getSafeWebhookActor(),
        source: 'webhook',
      });
    }
  } else if (Number(charge.amount_refunded || 0) > 0) {
    const fallbackRefundRecord = buildSafeRefundRecord(null, {
      refundId: `charge_refund_${charge.id}_${charge.amount_refunded}`,
      amount: Number(charge.amount_refunded) / 100,
      currency: charge.currency || getStripeCurrency(),
      status: 'succeeded',
      source: 'webhook',
      processedByName: 'Stripe Webhook',
    });

    await applyRefundToOrder({
      order,
      refundRecord: fallbackRefundRecord,
      actor: getSafeWebhookActor(),
      source: 'webhook',
    });
  }

  await order.save();
  await syncVendorOrdersForOrder(order);
  await emitWebhookEvent('refund.updated', order.toObject(), {
    resourceType: 'Order',
    resourceId: order._id.toString(),
  });

  return { order, paymentIntentId };
};

const processWebhookEvent = async (event) => {
  const type = event.type;
  const object = event.data?.object || {};

  switch (type) {
    case 'payment_intent.succeeded':
      return processPaymentIntentSucceeded(object);
    case 'payment_intent.payment_failed':
      return processPaymentIntentFailed(object);
    case 'payment_intent.canceled':
      return processPaymentIntentCanceled(object);
    case 'refund.created':
    case 'refund.updated':
    case 'refund.failed':
      return processRefundObject(object, type);
    case 'charge.refunded':
      return processChargeRefunded(object);
    default:
      return {
        ignored: true,
        paymentIntentId:
          object.payment_intent ||
          (typeof object.id === 'string' && object.id.startsWith('pi_') ? object.id : ''),
      };
  }
};

const createPaymentIntent = async (req, res) => {
  const { orderId = '' } = req.body;

  try {
    if (!isStripeConfigured()) {
      return res.status(400).json({ message: 'Stripe payment is not configured for this environment' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!req.user.isAdmin && order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to pay for this order' });
    }

    if (order.isPaid) {
      return res.status(400).json({ message: 'This order has already been paid' });
    }

    const fraudRisk = await assessOrderFraud(order, req);
    order.fraudRisk = {
      ...order.fraudRisk,
      ...fraudRisk,
      paymentBlockedAt: shouldBlockPayment(fraudRisk) ? new Date() : order.fraudRisk?.paymentBlockedAt,
    };

    if (fraudRisk.level !== 'low') {
      await recordFraudSignal(req, order, 'payment.fraud.review', fraudRisk);
    }

    if (shouldBlockPayment(fraudRisk) && !req.user.isAdmin) {
      await order.save();
      await recordFraudSignal(req, order, 'payment.fraud.blocked', fraudRisk);
      return res.status(403).json({
        message: 'This payment needs manual review before it can be processed.',
        fraudRisk,
      });
    }

    const stripe = getStripeClient();
    let paymentIntent = null;

    if (order.paymentIntentId) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);

        if (existingIntent && !['canceled', 'succeeded'].includes(existingIntent.status)) {
          paymentIntent = existingIntent;
        }
      } catch (error) {
        console.error('[paymentController:createPaymentIntent:retrieve]', error.message);
      }
    }

    if (!paymentIntent) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: toStripeAmount(order.totalPrice),
        currency: String(order.currency || getStripeCurrency()).toLowerCase(),
        metadata: {
          orderId: order._id.toString(),
          userId: req.user._id.toString(),
        },
        receipt_email: order.shippingAddress?.email || req.user.email || undefined,
      });
    }

    order.paymentProvider = 'Stripe';
    order.paymentIntentId = paymentIntent.id;
    order.paymentStatus = 'Payment Pending';
    order.paymentResult = buildSafePaymentResult(paymentIntent);
    await order.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error('[paymentController:createPaymentIntent]', error);
    res.status(500).json({ message: 'Unable to prepare payment right now' });
  }
};

const createRefund = async (req, res) => {
  const { orderId = '', amount, reason = '' } = req.body;

  try {
    if (!isStripeConfigured()) {
      return res.status(400).json({ message: 'Stripe payment is not configured for this environment' });
    }

    const order = await Order.findById(orderId).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.isPaid) {
      return res.status(400).json({ message: 'Only paid orders can be refunded' });
    }

    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ message: 'Cancelled orders cannot be refunded' });
    }

    const hasRefundReference = Boolean(order.paymentIntentId || order.paymentResult?.chargeId);

    if (!hasRefundReference) {
      return res.status(400).json({ message: 'No Stripe payment reference is available for this order' });
    }

    const refundableAmount = calculateRefundableAmount(order);

    if (refundableAmount <= 0) {
      return res.status(400).json({ message: 'This order is already fully refunded' });
    }

    const requestedAmount =
      amount === undefined || amount === null || amount === ''
        ? refundableAmount
        : Number(amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ message: 'Refund amount must be greater than zero' });
    }

    if (requestedAmount - refundableAmount > 0.0001) {
      return res.status(400).json({ message: 'Refund amount exceeds the refundable balance' });
    }

    const normalizedReason = String(reason || '').trim();
    const stripe = getStripeClient();
    const refundPayload = {
      amount: toStripeAmount(requestedAmount),
      metadata: {
        orderId: order._id.toString(),
        requestedBy: req.user._id.toString(),
      },
    };

    if (REFUND_REASON_VALUES.includes(normalizedReason)) {
      refundPayload.reason = normalizedReason;
    } else if (normalizedReason) {
      refundPayload.metadata.customReason = normalizedReason;
    }

    if (order.paymentIntentId) {
      refundPayload.payment_intent = order.paymentIntentId;
    } else {
      refundPayload.charge = order.paymentResult?.chargeId;
    }

    const refund = await stripe.refunds.create(refundPayload);
    const refundRecord = buildSafeRefundRecord(refund, {
      source: 'admin',
      processedBy: req.user._id,
      processedByName: req.user.name || req.user.email || 'Admin',
      reason: normalizedReason || refund.reason || '',
    });

    await applyRefundToOrder({
      order,
      refundRecord,
      actor: getAdminActor(req.user),
      source: 'admin',
    });

    const updatedOrder = await order.save();
    await syncVendorOrdersForOrder(updatedOrder);
    await recordAuditLog(req, 'payments.refund.create', 'Order', updatedOrder._id, {
      requestedAmount,
      reason: normalizedReason,
    });
    const populatedOrder = await Order.findById(updatedOrder._id).populate('user', 'name email phone');
    await emitWebhookEvent('refund.updated', populatedOrder.toObject(), {
      resourceType: 'Order',
      resourceId: populatedOrder._id.toString(),
    });

    res.json(populatedOrder);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error('[paymentController:createRefund]', error);
    res.status(500).json({ message: 'Unable to process refund right now' });
  }
};

const getOrderPaymentEvents = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).select('_id paymentIntentId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const events = await StripeEvent.find({
      $or: [{ orderId: order._id }, ...(order.paymentIntentId ? [{ paymentIntentId: order.paymentIntentId }] : [])],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(events);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error('[paymentController:getOrderPaymentEvents]', error);
    res.status(500).json({ message: 'Unable to load payment audit events right now' });
  }
};

const handleStripeWebhook = async (req, res) => {
  if (!isStripeWebhookConfigured()) {
    return res.status(200).json({
      received: true,
      ignored: true,
      message: 'Stripe webhook secret is not configured.',
    });
  }

  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({ message: 'Missing Stripe signature header' });
  }

  let event = null;

  try {
    event = buildWebhookEvent(req.body, signature);
  } catch (error) {
    console.error('[paymentController:webhook:signature]', error.message);
    return res.status(400).json({ message: 'Webhook signature verification failed' });
  }

  try {
    let eventRecord = await StripeEvent.findOne({ eventId: event.id });

    if (eventRecord?.processed) {
      return res.status(200).json({
        received: true,
        duplicate: true,
        eventId: event.id,
      });
    }

    if (!eventRecord) {
      try {
        eventRecord = await StripeEvent.create({
          eventId: event.id,
          type: event.type,
          paymentIntentId: '',
          processed: false,
        });
      } catch (createError) {
        if (createError.code === 11000) {
          eventRecord = await StripeEvent.findOne({ eventId: event.id });

          if (eventRecord?.processed) {
            return res.status(200).json({
              received: true,
              duplicate: true,
              eventId: event.id,
            });
          }
        } else {
          throw createError;
        }
      }
    }

    const outcome = await processWebhookEvent(event);

    await updateStripeEventRecord(eventRecord, {
      type: event.type,
      paymentIntentId: outcome?.paymentIntentId || '',
      orderId: outcome?.order?._id || eventRecord?.orderId,
      processed: true,
      processingError: outcome?.ignored ? 'Ignored unsupported event type.' : '',
    });

    return res.status(200).json({
      received: true,
      ignored: Boolean(outcome?.ignored),
      eventId: event.id,
    });
  } catch (error) {
    console.error('[paymentController:webhook:processing]', error);

    const eventRecord = await StripeEvent.findOne({ eventId: event.id });

    if (eventRecord) {
      await updateStripeEventRecord(eventRecord, {
        type: event.type,
        processed: false,
        processingError: error.message || 'Webhook processing failed',
      });
    }

    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};

export { createPaymentIntent, createRefund, handleStripeWebhook, getOrderPaymentEvents };
