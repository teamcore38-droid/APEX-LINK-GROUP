import mongoose from 'mongoose';

const newsletterSubscriberSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Subscribed', 'Unsubscribed', 'Bounced'],
      default: 'Subscribed',
    },
    source: {
      type: String,
      default: 'storefront',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    consentVersion: {
      type: String,
      default: '2026-07-09',
      trim: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    syncStatus: {
      type: String,
      enum: ['Pending', 'Synced', 'Failed', 'Skipped'],
      default: 'Pending',
    },
    syncError: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);

export default NewsletterSubscriber;
