import crypto from 'crypto';
import WebhookDelivery from '../models/webhookDeliveryModel.js';
import WebhookSubscription from '../models/webhookSubscriptionModel.js';

const EVENT_CATALOG = [
  'order.created',
  'order.paid',
  'order.status.updated',
  'order.shipment.updated',
  'order.cancellation.reviewed',
  'payment.failed',
  'payment.cancelled',
  'refund.updated',
  'support.ticket.created',
  'webhook.test',
];

const normalizeEventList = (events = []) =>
  [...new Set((events || []).map((event) => String(event || '').trim()).filter(Boolean))];

const buildWebhookEnvelope = (event, payload = {}, metadata = {}) => ({
  id: crypto.randomUUID(),
  event,
  createdAt: new Date().toISOString(),
  apiVersion: 'v1',
  resourceType: metadata.resourceType || '',
  resourceId: metadata.resourceId || '',
  data: payload,
});

const signWebhookPayload = (secret, body) =>
  crypto.createHmac('sha256', secret).update(body).digest('hex');

const getMatchingSubscriptions = async (event) =>
  WebhookSubscription.find({
    isActive: true,
    $or: [{ events: event }, { events: '*' }],
  }).select('+secret');

const deliverWebhook = async (subscription, envelope) => {
  const body = JSON.stringify(envelope);
  const signature = signWebhookPayload(subscription.secret, body);
  const headers = {
    'Content-Type': 'application/json',
    'X-Apex-Event': envelope.event,
    'X-Apex-Delivery': envelope.id,
    'X-Apex-Signature': `sha256=${signature}`,
    ...(subscription.headers ? Object.fromEntries(subscription.headers) : {}),
  };

  const delivery = await WebhookDelivery.create({
    subscription: subscription._id,
    event: envelope.event,
    resourceType: envelope.resourceType,
    resourceId: envelope.resourceId,
    payload: envelope,
    attempts: 1,
  });

  try {
    const response = await fetch(subscription.url, {
      method: 'POST',
      headers,
      body,
    });
    const responseBody = await response.text();

    delivery.status = response.ok ? 'delivered' : 'failed';
    delivery.httpStatus = response.status;
    delivery.responseBody = responseBody.slice(0, 2000);
    delivery.error = response.ok ? '' : `Webhook endpoint returned ${response.status}`;
    subscription.lastDeliveryAt = new Date();
    await Promise.all([delivery.save(), subscription.save()]);
  } catch (error) {
    delivery.status = 'failed';
    delivery.error = error.message || 'Webhook delivery failed';
    delivery.nextRetryAt = new Date(Date.now() + 15 * 60 * 1000);
    await delivery.save();
  }
};

const emitWebhookEvent = async (event, payload = {}, metadata = {}) => {
  try {
    const subscriptions = await getMatchingSubscriptions(event);

    if (subscriptions.length === 0) {
      return;
    }

    const envelope = buildWebhookEnvelope(event, payload, metadata);
    await Promise.allSettled(subscriptions.map((subscription) => deliverWebhook(subscription, envelope)));
  } catch (error) {
    console.error('[webhookService:emitWebhookEvent]', error);
  }
};

export {
  EVENT_CATALOG,
  buildWebhookEnvelope,
  deliverWebhook,
  emitWebhookEvent,
  normalizeEventList,
};
