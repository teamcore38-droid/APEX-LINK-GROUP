import crypto from 'crypto';

const md5Upper = (value) =>
  crypto.createHash('md5').update(String(value), 'utf8').digest('hex').toUpperCase();

const formatPayHereAmount = (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new Error('PayHere amount must be a valid non-negative number');
  }

  return numericAmount.toFixed(2);
};

const getPayHereCurrency = () => String(process.env.PAYHERE_CURRENCY || 'LKR').toUpperCase();

const isPayHereSandbox = () => process.env.PAYHERE_SANDBOX !== 'false';

const getPayHereCheckoutUrl = () =>
  isPayHereSandbox()
    ? 'https://sandbox.payhere.lk/pay/checkout'
    : 'https://www.payhere.lk/pay/checkout';

const isPayHereConfigured = () =>
  Boolean(process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET);

const getFrontendUrl = () =>
  String(process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

const getPayHereReturnUrl = (orderId) =>
  process.env.PAYHERE_RETURN_URL ||
  `${getFrontendUrl()}/order-success?order_id=${encodeURIComponent(orderId)}`;

const getPayHereCancelUrl = () =>
  process.env.PAYHERE_CANCEL_URL || `${getFrontendUrl()}/checkout`;

const getPayHereNotifyUrl = () => {
  if (process.env.PAYHERE_NOTIFY_URL) {
    return process.env.PAYHERE_NOTIFY_URL;
  }

  const backendUrl = String(process.env.BACKEND_PUBLIC_URL || process.env.API_PUBLIC_URL || '').replace(/\/+$/, '');
  return backendUrl ? `${backendUrl}/api/payments/payhere/notify` : '';
};

const generatePayHereCheckoutHash = ({
  merchantId = process.env.PAYHERE_MERCHANT_ID,
  orderId,
  amount,
  currency,
  merchantSecret = process.env.PAYHERE_MERCHANT_SECRET,
}) => {
  const hashedSecret = md5Upper(merchantSecret);
  return md5Upper(`${merchantId}${orderId}${formatPayHereAmount(amount)}${currency}${hashedSecret}`);
};

const generatePayHereNotificationSignature = ({
  merchantId,
  orderId,
  amount,
  currency,
  statusCode,
  merchantSecret = process.env.PAYHERE_MERCHANT_SECRET,
}) => {
  const hashedSecret = md5Upper(merchantSecret);
  return md5Upper(`${merchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`);
};

const verifyPayHereNotification = (payload = {}) => {
  const localSignature = generatePayHereNotificationSignature({
    merchantId: payload.merchant_id,
    orderId: payload.order_id,
    amount: payload.payhere_amount,
    currency: payload.payhere_currency,
    statusCode: payload.status_code,
  });

  return localSignature === String(payload.md5sig || '').toUpperCase();
};

const getPayHereStatusType = (statusCode = '') => {
  switch (String(statusCode)) {
    case '2':
      return 'paid';
    case '0':
      return 'pending';
    case '-1':
      return 'cancelled';
    case '-2':
      return 'failed';
    case '-3':
      return 'chargedback';
    default:
      return 'unknown';
  }
};

const isDuplicateSuccessfulPayHereNotification = (order = {}, paymentId = '') =>
  Boolean(
    order.isPaid &&
      (!paymentId ||
        String(order.paymentIntentId || '') === String(paymentId) ||
        String(order.paymentResult?.id || '') === String(paymentId))
  );

const validatePayHereNotificationForOrder = (payload = {}, order = {}) => {
  const errors = [];
  const expectedMerchantId = String(process.env.PAYHERE_MERCHANT_ID || '').trim();
  const payloadMerchantId = String(payload.merchant_id || '').trim();
  const orderId = order?._id?.toString?.() || String(order._id || '');
  let expectedAmount = '';
  let payloadAmount = '';
  const payloadCurrency = String(payload.payhere_currency || '').toUpperCase();

  try {
    expectedAmount = formatPayHereAmount(order.totalPrice);
    payloadAmount = formatPayHereAmount(payload.payhere_amount);
  } catch {
    errors.push('PayHere amount must be valid');
  }

  if (!expectedMerchantId || payloadMerchantId !== expectedMerchantId) {
    errors.push('PayHere merchant_id mismatch');
  }

  if (!orderId || String(payload.order_id || '').trim() !== orderId) {
    errors.push('PayHere order_id mismatch');
  }

  if (payloadAmount && expectedAmount && payloadAmount !== expectedAmount) {
    errors.push('PayHere amount mismatch');
  }

  if (payloadCurrency !== 'LKR') {
    errors.push('PayHere currency must be LKR');
  }

  if (!verifyPayHereNotification(payload)) {
    errors.push('Invalid PayHere md5sig');
  }

  return {
    valid: errors.length === 0,
    errors,
    expectedAmount,
    payloadAmount,
    payloadCurrency,
  };
};

const splitCustomerName = (fullName = '') => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: 'Customer', lastName: 'Apex' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Customer' };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
};

const buildPayHereCheckoutPayload = (order) => {
  if (!isPayHereConfigured()) {
    throw new Error('PayHere payment is not configured for this environment');
  }

  const notifyUrl = getPayHereNotifyUrl();

  if (!notifyUrl) {
    throw new Error('PAYHERE_NOTIFY_URL or BACKEND_PUBLIC_URL is required for PayHere callbacks');
  }

  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const orderId = order._id.toString();
  const amount = formatPayHereAmount(order.totalPrice);
  const currency = 'LKR';
  const fullName = order.shippingAddress?.fullName || order.guestCustomer?.name || order.user?.name || '';
  const { firstName, lastName } = splitCustomerName(fullName);
  const items =
    order.orderItems?.map((item) => item.name).filter(Boolean).join(', ').slice(0, 250) ||
    `Order ${orderId}`;

  return {
    checkoutUrl: getPayHereCheckoutUrl(),
    fields: {
      merchant_id: merchantId,
      return_url: getPayHereReturnUrl(orderId),
      cancel_url: getPayHereCancelUrl(),
      notify_url: notifyUrl,
      order_id: orderId,
      items,
      currency,
      amount,
      first_name: firstName,
      last_name: lastName,
      email: order.shippingAddress?.email || order.guestCustomer?.email || '',
      phone: order.shippingAddress?.phone || order.guestCustomer?.phone || '',
      address:
        order.shippingAddress?.address ||
        [order.shippingAddress?.addressLine1, order.shippingAddress?.addressLine2].filter(Boolean).join(', '),
      city: order.shippingAddress?.city || '',
      country: order.shippingAddress?.country || 'Sri Lanka',
      custom_1: orderId,
      custom_2: order.guestCheckout ? 'guest' : 'customer',
      hash: generatePayHereCheckoutHash({ merchantId, orderId, amount, currency }),
    },
  };
};

const buildPayHerePaymentResult = (payload = {}) => ({
  provider: 'PayHere',
  id: payload.payment_id || '',
  status: payload.status || payload.status_message || '',
  amountReceived: Number(payload.payhere_amount || 0),
  currency: payload.payhere_currency || '',
  paymentMethodType: payload.method || '',
  receiptEmail: payload.email || '',
  created: new Date(),
});

export {
  buildPayHereCheckoutPayload,
  buildPayHerePaymentResult,
  formatPayHereAmount,
  generatePayHereCheckoutHash,
  generatePayHereNotificationSignature,
  getPayHereCheckoutUrl,
  getPayHereCurrency,
  getPayHereStatusType,
  isPayHereConfigured,
  isDuplicateSuccessfulPayHereNotification,
  validatePayHereNotificationForOrder,
  verifyPayHereNotification,
};
