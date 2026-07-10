import crypto from 'crypto';
import WebhookDelivery from '../models/webhookDeliveryModel.js';
import WebhookSubscription from '../models/webhookSubscriptionModel.js';
import {
  EVENT_CATALOG,
  buildWebhookEnvelope,
  deliverWebhook,
  normalizeEventList,
} from '../utils/webhookService.js';
import { recordAuditLog } from '../utils/auditService.js';

const safeSubscriptionSelect = '-secret';

const listWebhookSubscriptions = async (_req, res) => {
  const subscriptions = await WebhookSubscription.find({})
    .select(safeSubscriptionSelect)
    .sort({ createdAt: -1 });

  res.json({ eventCatalog: EVENT_CATALOG, subscriptions });
};

const createWebhookSubscription = async (req, res) => {
  const name = String(req.body.name || '').trim();
  const url = String(req.body.url || '').trim();
  const events = normalizeEventList(req.body.events?.length ? req.body.events : ['*']);

  if (!name || !url) {
    return res.status(400).json({ message: 'Webhook name and URL are required' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ message: 'Webhook URL must be valid' });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ message: 'Webhook URL must use http or https' });
  }

  const subscription = await WebhookSubscription.create({
    name,
    url,
    events,
    headers: req.body.headers || {},
    secret: req.body.secret || crypto.randomBytes(32).toString('hex'),
    isActive: req.body.isActive !== false,
    createdBy: req.user?._id || null,
  });

  await recordAuditLog(req, 'webhooks.create', 'WebhookSubscription', subscription._id, {
    name,
    events,
  });

  const safeSubscription = await WebhookSubscription.findById(subscription._id).select(safeSubscriptionSelect);
  res.status(201).json(safeSubscription);
};

const updateWebhookSubscription = async (req, res) => {
  const subscription = await WebhookSubscription.findById(req.params.id).select('+secret');

  if (!subscription) {
    return res.status(404).json({ message: 'Webhook subscription not found' });
  }

  if (req.body.name !== undefined) subscription.name = String(req.body.name || '').trim();
  if (req.body.url !== undefined) {
    try {
      const parsedUrl = new URL(String(req.body.url || '').trim());
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ message: 'Webhook URL must use http or https' });
      }
      subscription.url = parsedUrl.toString();
    } catch {
      return res.status(400).json({ message: 'Webhook URL must be valid' });
    }
  }
  if (req.body.events !== undefined) subscription.events = normalizeEventList(req.body.events);
  if (req.body.headers !== undefined) subscription.headers = req.body.headers;
  if (req.body.secret) subscription.secret = String(req.body.secret).trim();
  if (req.body.isActive !== undefined) subscription.isActive = Boolean(req.body.isActive);

  await subscription.save();
  await recordAuditLog(req, 'webhooks.update', 'WebhookSubscription', subscription._id, {
    name: subscription.name,
    events: subscription.events,
    isActive: subscription.isActive,
  });

  const safeSubscription = await WebhookSubscription.findById(subscription._id).select(safeSubscriptionSelect);
  res.json(safeSubscription);
};

const deleteWebhookSubscription = async (req, res) => {
  const subscription = await WebhookSubscription.findById(req.params.id);

  if (!subscription) {
    return res.status(404).json({ message: 'Webhook subscription not found' });
  }

  await subscription.deleteOne();
  await recordAuditLog(req, 'webhooks.delete', 'WebhookSubscription', req.params.id, {
    name: subscription.name,
  });

  res.json({ message: 'Webhook subscription deleted' });
};

const listWebhookDeliveries = async (req, res) => {
  const filter = req.params.id ? { subscription: req.params.id } : {};
  const deliveries = await WebhookDelivery.find(filter)
    .populate('subscription', 'name url')
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(deliveries);
};

const testWebhookSubscription = async (req, res) => {
  const subscription = await WebhookSubscription.findById(req.params.id);

  if (!subscription) {
    return res.status(404).json({ message: 'Webhook subscription not found' });
  }

  await deliverWebhook(
    await WebhookSubscription.findById(req.params.id).select('+secret'),
    buildWebhookEnvelope(
      'webhook.test',
      {
        message: 'This is a test event from Apex Link Group.',
        subscriptionId: subscription._id,
      },
      {
        resourceType: 'WebhookSubscription',
        resourceId: subscription._id.toString(),
      }
    )
  );

  res.json({ message: 'Webhook test event queued' });
};

export {
  createWebhookSubscription,
  deleteWebhookSubscription,
  listWebhookDeliveries,
  listWebhookSubscriptions,
  testWebhookSubscription,
  updateWebhookSubscription,
};
