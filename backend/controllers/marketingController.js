import mongoose from 'mongoose';
import AbandonedCart from '../models/abandonedCartModel.js';
import AnalyticsEvent from '../models/analyticsEventModel.js';
import NewsletterSubscriber from '../models/newsletterSubscriberModel.js';
import { sendDueAbandonedCartEmails, upsertNewsletterSubscriber, getRequestIp, getUserAgent } from '../utils/marketingService.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getSessionId = (req) =>
  String(req.body?.sessionId || req.query?.sessionId || req.headers['x-session-id'] || '').trim();

const subscribeNewsletter = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  const subscriber = await upsertNewsletterSubscriber(req, {
    email,
    name: req.body.name || req.user?.name || '',
    source: req.body.source || 'storefront-footer',
    tags: req.body.tags || ['storefront'],
  });

  res.status(201).json({
    message: 'Newsletter subscription saved.',
    subscriber,
  });
};

const unsubscribeNewsletter = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  const subscriber = await NewsletterSubscriber.findOneAndUpdate(
    { email },
    { status: 'Unsubscribed', unsubscribedAt: new Date() },
    { new: true }
  );

  if (!subscriber) {
    return res.status(404).json({ message: 'Subscriber not found' });
  }

  res.json({ message: 'You have been unsubscribed.', subscriber });
};

const recordAbandonedCart = async (req, res) => {
  const sessionId = getSessionId(req);
  const email = String(req.body.email || req.user?.email || '').trim().toLowerCase();

  if (!req.user?._id && !sessionId && !email) {
    return res.status(400).json({ message: 'Session ID or email is required' });
  }

  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const normalizedItems = items
    .filter((item) => item?.product && mongoose.Types.ObjectId.isValid(item.product))
    .map((item) => ({
      product: item.product,
      name: String(item.name || '').trim(),
      image: String(item.image || '').trim(),
      price: Number(item.price || 0),
      qty: Number(item.qty || 0),
      variantId: String(item.variantId || '').trim(),
      variantLabel: String(item.variantLabel || '').trim(),
      sku: String(item.sku || '').trim(),
    }));

  const status = normalizedItems.length > 0 ? 'Active' : 'Expired';
  const filter = req.user?._id ? { user: req.user._id, status: { $in: ['Active', 'Email Sent'] } } : email ? { email, status: { $in: ['Active', 'Email Sent'] } } : { sessionId, status: { $in: ['Active', 'Email Sent'] } };
  const cart = await AbandonedCart.findOneAndUpdate(
    filter,
    {
      user: req.user?._id || null,
      sessionId,
      email,
      name: String(req.body.name || req.user?.name || '').trim(),
      items: normalizedItems,
      subtotal: Number(req.body.subtotal || 0),
      currency: String(req.body.currency || 'LKR').toUpperCase(),
      checkoutUrl: String(req.body.checkoutUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`).trim(),
      status,
      lastActivityAt: new Date(),
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
      ...(status === 'Active' ? { recoveredAt: null } : {}),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json(cart);
};

const recoverAbandonedCart = async (req, res) => {
  const sessionId = getSessionId(req);
  const email = String(req.body.email || req.user?.email || '').trim().toLowerCase();
  const filter = req.user?._id ? { user: req.user._id } : email ? { email } : { sessionId };

  await AbandonedCart.updateMany(
    { ...filter, status: { $in: ['Active', 'Email Sent'] } },
    { status: 'Recovered', recoveredAt: new Date(), order: req.body.orderId || null }
  );

  res.json({ message: 'Cart marked as recovered.' });
};

const sendAbandonedCartBatch = async (req, res) => {
  const results = await sendDueAbandonedCartEmails({
    limit: Number(req.body.limit || req.query.limit || 50),
    minAgeMinutes: Number(req.body.minAgeMinutes || req.query.minAgeMinutes || 60),
  });

  res.json({ sent: results.length, results });
};

const recordAnalyticsEvent = async (req, res) => {
  const events = Array.isArray(req.body.events) ? req.body.events : [req.body];
  const records = await AnalyticsEvent.insertMany(
    events
      .filter((event) => event?.eventName)
      .map((event) => ({
        eventName: String(event.eventName || '').trim(),
        user: req.user?._id || null,
        sessionId: String(event.sessionId || getSessionId(req)).trim(),
        anonymousId: String(event.anonymousId || '').trim(),
        source: String(event.source || 'web').trim(),
        path: String(event.path || '').trim(),
        referrer: String(event.referrer || '').trim(),
        properties: event.properties || {},
        ipAddress: getRequestIp(req),
        userAgent: getUserAgent(req),
      })),
    { ordered: false }
  );

  res.status(202).json({ accepted: records.length });
};

export {
  recoverAbandonedCart,
  recordAbandonedCart,
  recordAnalyticsEvent,
  sendAbandonedCartBatch,
  subscribeNewsletter,
  unsubscribeNewsletter,
};
