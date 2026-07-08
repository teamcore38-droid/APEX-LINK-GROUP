import Stripe from 'stripe';

let stripeClient = null;

const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);
const isStripeWebhookConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

const getStripeCurrency = () => (process.env.STRIPE_CURRENCY || 'lkr').toLowerCase();

const getStripeClient = () => {
  if (!isStripeConfigured()) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

const toStripeAmount = (amount) => Math.round(Number(amount || 0) * 100);

const buildSafePaymentResult = (paymentIntent) => {
  if (!paymentIntent) {
    return {
      id: '',
      status: '',
      amountReceived: 0,
      currency: '',
      chargeId: '',
      paymentMethodType: '',
      receiptEmail: '',
      created: null,
    };
  }

  const latestCharge =
    typeof paymentIntent.latest_charge === 'object' ? paymentIntent.latest_charge : null;
  const paymentMethodType =
    paymentIntent.payment_method_types?.[0] ||
    latestCharge?.payment_method_details?.type ||
    '';

  return {
    id: paymentIntent.id || '',
    status: paymentIntent.status || '',
    amountReceived:
      Number(paymentIntent.amount_received || 0) > 0
        ? Number(paymentIntent.amount_received || 0) / 100
        : Number(paymentIntent.amount || 0) / 100,
    currency: paymentIntent.currency || '',
    chargeId:
      latestCharge?.id ||
      (typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : '') ||
      '',
    paymentMethodType,
    receiptEmail: paymentIntent.receipt_email || '',
    created: paymentIntent.created ? new Date(paymentIntent.created * 1000) : null,
  };
};

const buildSafeRefundRecord = (refund, overrides = {}) => ({
  refundId: refund?.id || overrides.refundId || '',
  amount:
    Number(refund?.amount || 0) > 0
      ? Number(refund.amount) / 100
      : Number(overrides.amount || 0),
  currency: refund?.currency || overrides.currency || '',
  status: refund?.status || overrides.status || '',
  reason: refund?.reason || overrides.reason || '',
  receiptNumber: refund?.receipt_number || overrides.receiptNumber || '',
  createdAt: refund?.created ? new Date(refund.created * 1000) : overrides.createdAt || new Date(),
  processedBy: overrides.processedBy,
  processedByName: overrides.processedByName || '',
  source: overrides.source || 'system',
});

const buildWebhookEvent = (rawBody, signature) => {
  const stripe = getStripeClient();

  if (!stripe || !isStripeWebhookConfigured()) {
    throw new Error('Stripe webhook is not configured');
  }

  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
};

export {
  isStripeConfigured,
  isStripeWebhookConfigured,
  getStripeCurrency,
  getStripeClient,
  toStripeAmount,
  buildSafePaymentResult,
  buildSafeRefundRecord,
  buildWebhookEvent,
};
