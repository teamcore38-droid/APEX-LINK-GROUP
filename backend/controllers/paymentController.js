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
  getPayHereStatusType,
  isDuplicateSuccessfulPayHereNotification,
  isPayHereConfigured,
  validatePayHereNotificationForOrder,
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
  const { orderId = '' } = req.body;

  try {
    const allowedBodyKeys = new Set(['orderId']);
    const unexpectedBodyKey = Object.keys(req.body || {}).find((key) => !allowedBodyKeys.has(key));

    if (unexpectedBodyKey) {
      return res.status(400).json({ message: 'Only orderId is accepted for PayHere checkout creation' });
    }

    if (!isPayHereConfigured()) {
      return res.status(400).json({ message: 'PayHere payment is not configured for this environment' });
    }

    const order = await Order.findById(orderId).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!isOrderOwnerOrAdmin(order, req.user)) {
      return res.status(401).json({ message: 'Not authorized to pay for this order' });
    }

    if (order.isPaid) {
      return res.status(400).json({ message: 'This order has already been paid' });
    }

    if (String(order.currency || 'LKR').toUpperCase() !== 'LKR') {
      return res.status(400).json({ message: 'PayHere checkout currently supports LKR orders only' });
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
  const wasAlreadyPaid = Boolean(order.isPaid);
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

  if (wasAlreadyPaid) {
    await order.save();
    return false;
  }

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
  return true;
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

    if (!paymentId && statusCode === '2') {
      await updatePaymentEvent(eventRecord, {
        processed: false,
        processingError: 'Missing PayHere payment_id',
        payload,
      });
      return res.status(400).json({ message: 'Missing PayHere payment_id' });
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

    const validation = validatePayHereNotificationForOrder(payload, order);

    if (!validation.valid) {
      await updatePaymentEvent(eventRecord, {
        orderId: order._id,
        paymentIntentId: paymentId,
        processed: false,
        processingError: validation.errors.join('; '),
        payload,
      });
      return res.status(400).json({ message: validation.errors[0] || 'Invalid PayHere notification' });
    }

    if (paymentId) {
      const paymentIdOrder = await Order.findOne({
        _id: { $ne: order._id },
        $or: [
          { paymentIntentId: paymentId },
          { 'paymentResult.id': paymentId },
        ],
      }).select('_id');

      if (paymentIdOrder) {
        await updatePaymentEvent(eventRecord, {
          orderId: order._id,
          paymentIntentId: paymentId,
          processed: false,
          processingError: 'PayHere payment_id is already linked to another order',
          payload,
        });
        return res.status(409).json({ message: 'PayHere payment already linked to another order' });
      }
    }

    if (statusCode === '2' && order.isPaid && !isDuplicateSuccessfulPayHereNotification(order, paymentId)) {
      await updatePaymentEvent(eventRecord, {
        orderId: order._id,
        paymentIntentId: paymentId,
        processed: false,
        processingError: 'Order is already paid with a different payment reference',
        payload,
      });
      return res.status(409).json({ message: 'Order is already paid' });
    }

    if (statusCode === '2' && isDuplicateSuccessfulPayHereNotification(order, paymentId)) {
      order.paymentProvider = 'PayHere';
      order.paymentMethod = payload.method || order.paymentMethod || 'PayHere';
      order.paymentIntentId = paymentId || order.paymentIntentId || order._id.toString();
      order.paymentResult = {
        ...order.paymentResult,
        ...buildPayHerePaymentResult({
          ...payload,
          status: 'succeeded',
          email: order.shippingAddress?.email || order.guestCustomer?.email || '',
        }),
      };
      await order.save();
      await updatePaymentEvent(eventRecord, {
        orderId: order._id,
        paymentIntentId: paymentId,
        processed: true,
        processingError: '',
        payload,
      });
      return res.status(200).json({ received: true, duplicate: true });
    }

    const statusType = getPayHereStatusType(statusCode);

    if (statusType === 'paid') {
      await completeSuccessfulPayment(order, payload);
    } else if (statusType === 'pending') {
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
    } else if (statusType === 'cancelled') {
      await completeFailedPayment(order, payload, 'cancelled');
    } else {
      await completeFailedPayment(order, payload, statusType === 'chargedback' ? 'chargedback' : 'failed');
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
