import crypto from 'crypto';
import AbandonedCart from '../models/abandonedCartModel.js';
import NewsletterSubscriber from '../models/newsletterSubscriberModel.js';
import { sendAbandonedCartEmail, sendNewsletterWelcomeEmail } from './emailService.js';
import logger from './logger.js';

const getRequestIp = (req) =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '')
    .split(',')[0]
    .trim();

const getUserAgent = (req) => String(req.headers['user-agent'] || '').slice(0, 500);

const syncNewsletterSubscriber = async (subscriber) => {
  const webhookUrl = process.env.NEWSLETTER_WEBHOOK_URL || '';
  const mailchimpApiKey = process.env.MAILCHIMP_API_KEY || '';
  const mailchimpAudienceId = process.env.MAILCHIMP_AUDIENCE_ID || '';
  const mailchimpServer = process.env.MAILCHIMP_SERVER_PREFIX || '';

  try {
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriber.toObject()),
      });
      subscriber.syncStatus = response.ok ? 'Synced' : 'Failed';
      subscriber.syncError = response.ok ? '' : `Webhook returned ${response.status}`;
    } else if (mailchimpApiKey && mailchimpAudienceId && mailchimpServer) {
      const subscriberHash = crypto.createHash('md5').update(subscriber.email.toLowerCase()).digest('hex');
      const response = await fetch(
        `https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpAudienceId}/members/${subscriberHash}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `apikey ${mailchimpApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_address: subscriber.email,
            status_if_new: 'subscribed',
            status: subscriber.status === 'Subscribed' ? 'subscribed' : 'unsubscribed',
            merge_fields: {
              FNAME: subscriber.name || '',
            },
            tags: subscriber.tags || [],
          }),
        }
      );
      subscriber.syncStatus = response.ok ? 'Synced' : 'Failed';
      subscriber.syncError = response.ok ? '' : `Mailchimp returned ${response.status}`;
    } else {
      subscriber.syncStatus = 'Skipped';
      subscriber.syncError = 'No newsletter provider configured';
    }

    subscriber.lastSyncedAt = new Date();
    await subscriber.save();
  } catch (error) {
    subscriber.syncStatus = 'Failed';
    subscriber.syncError = error.message;
    subscriber.lastSyncedAt = new Date();
    await subscriber.save();
    logger.warn('Newsletter sync failed', { email: subscriber.email, error: error.message });
  }
};

const upsertNewsletterSubscriber = async (req, { email, name = '', source = 'storefront', tags = [] }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const subscriber = await NewsletterSubscriber.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      name: String(name || '').trim(),
      source: String(source || 'storefront').trim(),
      tags: Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
      status: 'Subscribed',
      unsubscribedAt: null,
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
      subscribedAt: new Date(),
      syncStatus: 'Pending',
      syncError: '',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Promise.allSettled([
    syncNewsletterSubscriber(subscriber),
    sendNewsletterWelcomeEmail(subscriber),
  ]);

  return subscriber;
};

const sendDueAbandonedCartEmails = async ({ limit = 50, minAgeMinutes = 60 } = {}) => {
  const dueDate = new Date(Date.now() - Number(minAgeMinutes) * 60 * 1000);
  const carts = await AbandonedCart.find({
    status: 'Active',
    email: { $ne: '' },
    items: { $ne: [] },
    lastActivityAt: { $lte: dueDate },
    emailSentAt: null,
  })
    .sort({ lastActivityAt: 1 })
    .limit(Number(limit));

  const results = [];

  for (const cart of carts) {
    const result = await sendAbandonedCartEmail(cart);
    cart.status = 'Email Sent';
    cart.emailSentAt = new Date();
    await cart.save();
    results.push({ cartId: cart._id, result });
  }

  return results;
};

export {
  getRequestIp,
  getUserAgent,
  sendDueAbandonedCartEmails,
  upsertNewsletterSubscriber,
};
