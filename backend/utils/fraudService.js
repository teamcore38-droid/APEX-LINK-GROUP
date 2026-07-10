import Order from '../models/orderModel.js';
import SecurityEvent from '../models/securityEventModel.js';

const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const getRequestIp = (req) =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '')
    .split(',')[0]
    .trim();

const buildCheckoutIntegrity = (pricing, payload = {}) => {
  const clientTotal = payload.totalPrice ?? payload.clientTotalPrice ?? payload.summary?.totalPrice;
  const clientItems = Array.isArray(payload.orderItems) ? payload.orderItems : [];
  const tamperReasons = [];

  if (clientTotal !== undefined && Math.abs(toNumber(clientTotal) - toNumber(pricing.totalPrice)) > 0.01) {
    tamperReasons.push('Client total did not match server-calculated total');
  }

  clientItems.forEach((item) => {
    if (item.price === undefined) {
      return;
    }

    const productId = String(item.product || item._id || '');
    const variantId = String(item.variantId || '');
    const matchingServerItem = (pricing.orderItems || []).find(
      (serverItem) =>
        String(serverItem.product || '') === productId &&
        String(serverItem.variantId || '') === variantId
    );

    if (matchingServerItem && Math.abs(toNumber(item.price) - toNumber(matchingServerItem.price)) > 0.01) {
      tamperReasons.push(`Client price did not match server price for ${matchingServerItem.name}`);
    }
  });

  return {
    clientReportedTotal: clientTotal === undefined ? null : toNumber(clientTotal),
    serverCalculatedTotal: toNumber(pricing.totalPrice),
    tamperDetected: tamperReasons.length > 0,
    tamperReasons,
    checkedAt: new Date(),
  };
};

const assessOrderFraud = async (order, req, context = {}) => {
  const reasons = [];
  let score = 0;
  const ipAddress = getRequestIp(req);
  const email = String(order?.shippingAddress?.email || order?.guestCustomer?.email || context.email || '').toLowerCase();
  const total = toNumber(order?.totalPrice);

  if (order?.checkoutIntegrity?.tamperDetected) {
    score += 50;
    reasons.push('Checkout tamper indicators were detected');
  }

  if (total >= Number(process.env.FRAUD_HIGH_VALUE_THRESHOLD || 1000)) {
    score += 25;
    reasons.push('High-value order');
  }

  if (email) {
    const recentEmailOrders = await Order.countDocuments({
      'shippingAddress.email': email,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });

    if (recentEmailOrders >= 3) {
      score += 20;
      reasons.push('Multiple recent orders for the same email');
    }
  }

  if (ipAddress) {
    const recentIpEvents = await SecurityEvent.countDocuments({
      eventType: { $in: ['payment.fraud.blocked', 'checkout.tamper.detected'] },
      ipAddress,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (recentIpEvents > 0) {
      score += 20;
      reasons.push('Recent fraud or tamper signal from this IP');
    }
  }

  const level = score >= 70 ? 'high' : score >= 35 ? 'medium' : 'low';

  return {
    score,
    level,
    reasons,
    checkedAt: new Date(),
  };
};

const recordFraudSignal = async (req, order, eventType, fraud = {}) => {
  try {
    await SecurityEvent.create({
      user: order?.user || req.user?._id || null,
      email: String(order?.shippingAddress?.email || order?.guestCustomer?.email || '').toLowerCase(),
      eventType,
      severity: fraud.level === 'high' ? 'critical' : 'warning',
      ipAddress: getRequestIp(req),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
      metadata: {
        orderId: order?._id?.toString?.() || '',
        fraud,
      },
    });
  } catch (error) {
    console.error('[fraudService:recordFraudSignal]', error.message);
  }
};

const shouldBlockPayment = (fraud = {}) =>
  fraud.level === 'high' && process.env.FRAUD_BLOCK_HIGH_RISK !== 'false';

export {
  assessOrderFraud,
  buildCheckoutIntegrity,
  recordFraudSignal,
  shouldBlockPayment,
};
