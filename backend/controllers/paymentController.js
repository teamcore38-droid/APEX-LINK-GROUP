import Order from '../models/orderModel.js';
import PaymentEvent from '../models/paymentEventModel.js';
import {
  applyCancelledPaymentToOrder,
  applyFailedPaymentToOrder,
  applyRefundToOrder,
  applySuccessfulPaymentToOrder,
  calculateRefundableAmount,
  pushStatusHistoryIfMeaningful,
} from '../utils/orderPaymentLifecycle.js';
import { commitPromotionsForOrder } from '../utils/commerceService.js';
import {
  deductReservedInventory,
  releaseReservedInventory,
} from '../utils/inventoryService.js';
import { syncVendorOrdersForOrder } from '../utils/vendorService.js';
import { awardOrderLoyaltyPoints } from '../utils/loyaltyService.js';
import {
  buildPayHereCheckoutPayload,
  buildPayHerePaymentResult,
  formatPayHereAmount,
  isPayHereConfigured,
  verifyPayHereNotification,
} from '../utils/paymentService.js';
import { recordAuditLog } from '../utils/auditService.js';
import { notifyOrderEvent } from '../utils/pushService.js';
import { emitWebhookEvent } from '../utils/webhookService.js';
import {
  assessOrderFraud,
  recordFraudSignal,
  shouldBlockPayment,
} from '../utils/fraudService.js';

const getSafePayHereActor = () => ({
  name: 'PayHere Callback',
  email: 'payhere-callback@system',
});

const getAdminActor = (user) => ({
  _id: user?._id,
  name: user?.name || user?.email || 'Admin',
  email: user?.email || '',
});

const isOrderOwnerOrAdmin = (order, user) =>
  Boolean(
    user?.isAdmin ||
      order.user?.toString?.() === user?._id?.toString?.()
  );

const isGuestOrderAccessor = (order, payload = {}) => {
  const email = String(payload.email || payload.guestEmail || '').trim().toLowerCase();
  const accessToken = String(payload.accessToken || payload.guestAccessToken || '').trim();
  const orderEmail = String(order?.guestCustomer?.email || order?.shippingAddress?.email || '').toLowerCase();
  const tokenMatches = Boolean(
    order?.guestCustomer?.accessToken && accessToken === order.guestCustomer.accessToken
  );

  return Boolean(
    order?.guestCheckout &&
      (tokenMatches || (email && email === orderEmail && !order.guestCustomer?.accessToken))
  );
};

const ensurePaymentEvent = async ({ eventId, type, orderId, paymentIntentId, payload }) => {
  let eventRecord = await PaymentEvent.findOne({ eventId });

  if (eventRecord) {
    return eventRecord;
  }

  try {
    eventRecord = await PaymentEvent.create({
      eventId,
      provider: 'PayHere',
      type,
      orderId,
      paymentIntentId,
      processed: false,
      payload,
    });
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    eventRecord = await PaymentEvent.findOne({ eventId });
  }

  return eventRecord;
};

const updatePaymentEvent = async (eventRecord, updates = {}) => {
  if (!eventRecord) {
    return;
  }

  eventRecord.type = updates.type || eventRecord.type;
  eventRecord.paymentIntentId = updates.paymentIntentId ?? eventRecord.paymentIntentId;
  eventRecord.orderId = updates.orderId ?? eventRecord.orderId;
  eventRecord.processed = updates.processed ?? eventRecord.processed;
  eventRecord.processingError = updates.processingError ?? eventRecord.processingError;
  eventRecord.payload = updates.payload ?? eventRecord.payload;
  await eventRecord.save();
};

const createPayHerePayment = async (req, res) => {
  const { orderId = '', guestAccessToken = '', guestEmail = '' } = req.body;

  try {
    if (!isPayHereConfigured()) {
      return res.status(400).json({ message: 'PayHere payment is not configured for this environment' });
    }

    const order = await Order.findById(orderId)
      .select('+guestCustomer.accessToken')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const canAccess =
      isOrderOwnerOrAdmin(order, req.user) ||
      isGuestOrderAccessor(order, { guestAccessToken, guestEmail });

    if (!canAccess) {
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

    if (shouldBlockPayment(fraudRisk) && !req.user?.isAdmin) {
      await order.save();
      await recordFraudSignal(req, order, 'payment.fraud.blocked', fraudRisk);
      return res.status(403).json({
        message: 'This payment needs manual review before it can be processed.',
        fraudRisk,
      });
    }

    order.paymentProvider = 'PayHere';
    order.paymentMethod = 'PayHere';
    order.paymentStatus = 'Payment Pending';
    order.paymentIntentId = order._id.toString();
    order.paymentResult = {
      ...order.paymentResult,
      id: order.paymentResult?.id || '',
      status: 'pending',
      amountReceived: 0,
      currency: order.currency,
      paymentMethodType: 'PayHere',
      receiptEmail: order.shippingAddress?.email || order.guestCustomer?.email || '',
      created: order.paymentResult?.created || new Date(),
    };
    pushStatusHistoryIfMeaningful(order, {
      status: order.orderStatus,
      note: 'PayHere checkout prepared and awaiting payment confirmation.',
      updatedAt: new Date(),
      updatedBy: req.user?._id,
      updatedByName: req.user?.name || req.user?.email || order.guestCustomer?.name || 'PayHere',
    });
    await order.save();

    const checkout = buildPayHereCheckoutPayload(order);

    res.json(checkout);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error('[paymentController:createPayHerePayment]', error);
    res.status(500).json({ message: error.message || 'Unable to prepare PayHere payment right now' });
  }
};

const completeSuccessfulPayment = async (order, payload) => {
  const actor = getSafePayHereActor();
  const paymentResult = buildPayHerePaymentResult({
    ...payload,
    status: 'succeeded',
    email: order.shippingAddress?.email || order.guestCustomer?.email || '',
  });

  await applySuccessfulPaymentToOrder({
    order,
    paymentIntent: paymentResult,
    actor,
    source: 'webhook',
  });
  order.paymentResult = {
    ...order.paymentResult,
    ...paymentResult,
  };
  order.paymentProvider = 'PayHere';
  order.paymentMethod = payload.method || 'PayHere';
  order.paymentIntentId = payload.payment_id || order.paymentIntentId || order._id.toString();

  await deductReservedInventory({ order, actor });
  await commitPromotionsForOrder(order);
  await awardOrderLoyaltyPoints(order, actor);

  const updatedOrder = await order.save();
  await syncVendorOrdersForOrder(updatedOrder);
  await notifyOrderEvent(updatedOrder, 'order.paid');
  await emitWebhookEvent('order.paid', updatedOrder.toObject(), {
    resourceType: 'Order',
    resourceId: updatedOrder._id.toString(),
  });
};

const completeFailedPayment = async (order, payload, statusType) => {
  const actor = getSafePayHereActor();
  const paymentResult = buildPayHerePaymentResult({
    ...payload,
    status: statusType,
    email: order.shippingAddress?.email || order.guestCustomer?.email || '',
  });

  if (statusType === 'cancelled') {
    await applyCancelledPaymentToOrder({
      order,
      paymentIntent: paymentResult,
      actor,
      source: 'webhook',
    });
  } else {
    await applyFailedPaymentToOrder({
      order,
      paymentIntent: paymentResult,
      actor,
      source: 'webhook',
      note: payload.status_message
        ? `PayHere reported payment ${statusType}: ${payload.status_message}`
        : undefined,
    });
  }

  order.paymentResult = {
    ...order.paymentResult,
    ...paymentResult,
  };
  order.paymentProvider = 'PayHere';
  order.paymentMethod = payload.method || 'PayHere';
  order.paymentIntentId = payload.payment_id || order.paymentIntentId || order._id.toString();

  await releaseReservedInventory({
    order,
    actor,
    note: `Released reservation after PayHere reported payment ${statusType}.`,
  });

  const updatedOrder = await order.save();
  await syncVendorOrdersForOrder(updatedOrder);
  await emitWebhookEvent(statusType === 'cancelled' ? 'payment.cancelled' : 'payment.failed', updatedOrder.toObject(), {
    resourceType: 'Order',
    resourceId: updatedOrder._id.toString(),
  });
};

const handlePayHereNotification = async (req, res) => {
  const payload = req.body || {};
  const orderId = String(payload.order_id || '').trim();
  const statusCode = String(payload.status_code || '').trim();
  const paymentId = String(payload.payment_id || '').trim();
  const eventId = `payhere:${paymentId || orderId}:${statusCode}:${payload.md5sig || ''}`;
  let eventRecord = null;

  try {
    eventRecord = await ensurePaymentEvent({
      eventId,
      type: `payhere.status.${statusCode || 'unknown'}`,
      paymentIntentId: paymentId,
      payload,
    });

    if (eventRecord?.processed) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    if (!verifyPayHereNotification(payload)) {
      await updatePaymentEvent(eventRecord, {
        processed: false,
        processingError: 'Invalid PayHere md5sig',
        payload,
      });
      return res.status(400).json({ message: 'Invalid PayHere signature' });
    }

    const order = await Order.findById(orderId).select('+guestCustomer.accessToken');

    if (!order) {
      await updatePaymentEvent(eventRecord, {
        processed: false,
        processingError: 'Order not found',
        payload,
      });
      return res.status(404).json({ message: 'Order not found' });
    }

    const expectedAmount = formatPayHereAmount(order.totalPrice);
    const amountMatches = Math.abs(Number(payload.payhere_amount || 0) - Number(expectedAmount)) <= 0.01;
    const currencyMatches =
      String(payload.payhere_currency || '').toUpperCase() === String(order.currency || '').toUpperCase();

    if (!amountMatches || !currencyMatches) {
      await updatePaymentEvent(eventRecord, {
        orderId: order._id,
        paymentIntentId: paymentId,
        processed: false,
        processingError: 'PayHere amount or currency did not match order',
        payload,
      });
      return res.status(400).json({ message: 'Payment amount or currency mismatch' });
    }

    if (statusCode === '2') {
      await completeSuccessfulPayment(order, payload);
    } else if (statusCode === '0') {
      order.paymentProvider = 'PayHere';
      order.paymentStatus = 'Payment Pending';
      order.paymentResult = {
        ...order.paymentResult,
        ...buildPayHerePaymentResult({
          ...payload,
          status: 'pending',
          email: order.shippingAddress?.email || order.guestCustomer?.email || '',
        }),
      };
      pushStatusHistoryIfMeaningful(order, {
        status: order.orderStatus,
        note: 'PayHere reported the payment as pending.',
        updatedAt: new Date(),
        updatedByName: 'PayHere',
      });
      await order.save();
    } else if (statusCode === '-1') {
      await completeFailedPayment(order, payload, 'cancelled');
    } else {
      await completeFailedPayment(order, payload, statusCode === '-3' ? 'chargedback' : 'failed');
    }

    await updatePaymentEvent(eventRecord, {
      orderId: order._id,
      paymentIntentId: paymentId,
      processed: true,
      processingError: '',
      payload,
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[paymentController:handlePayHereNotification]', error);

    if (eventRecord) {
      await updatePaymentEvent(eventRecord, {
        processed: false,
        processingError: error.message || 'PayHere notification processing failed',
        payload,
      });
    }

    return res.status(500).json({ message: 'PayHere notification processing failed' });
  }
};

const createRefund = async (req, res) => {
  const { orderId = '', amount, reason = '' } = req.body;

  try {
    const order = await Order.findById(orderId).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.isPaid) {
      return res.status(400).json({ message: 'Only paid orders can be refunded' });
    }

    const refundableAmount = calculateRefundableAmount(order);
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

    const refundRecord = {
      refundId: `manual-payhere-${Date.now()}`,
      amount: requestedAmount,
      currency: order.currency || 'LKR',
      status: 'succeeded',
      reason: String(reason || 'PayHere refund recorded by admin').trim(),
      receiptNumber: '',
      createdAt: new Date(),
      processedBy: req.user._id,
      processedByName: req.user.name || req.user.email || 'Admin',
      source: 'admin',
    };

    await applyRefundToOrder({
      order,
      refundRecord,
      actor: getAdminActor(req.user),
      source: 'admin',
      note: 'PayHere refund recorded manually by admin.',
    });

    const updatedOrder = await order.save();
    await syncVendorOrdersForOrder(updatedOrder);
    await recordAuditLog(req, 'payments.refund.record', 'Order', updatedOrder._id, {
      requestedAmount,
      reason: refundRecord.reason,
      provider: 'PayHere',
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
    res.status(500).json({ message: 'Unable to record refund right now' });
  }
};

const getOrderPaymentEvents = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).select('_id paymentIntentId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const events = await PaymentEvent.find({
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

export {
  createPayHerePayment,
  createRefund,
  getOrderPaymentEvents,
  handlePayHereNotification,
};
