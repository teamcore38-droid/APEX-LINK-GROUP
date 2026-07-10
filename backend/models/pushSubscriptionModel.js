import mongoose from 'mongoose';

const pushSubscriptionSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    guestEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    sessionId: {
      type: String,
      default: '',
      trim: true,
    },
    platform: {
      type: String,
      enum: ['web', 'ios', 'android'],
      default: 'web',
    },
    endpoint: {
      type: String,
      default: '',
      trim: true,
    },
    token: {
      type: String,
      default: '',
      trim: true,
    },
    keys: {
      p256dh: { type: String, default: '' },
      auth: { type: String, default: '' },
    },
    deviceId: {
      type: String,
      default: '',
      trim: true,
    },
    appVersion: {
      type: String,
      default: '',
      trim: true,
    },
    preferences: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      support: { type: Boolean, default: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

pushSubscriptionSchema.index({ user: 1, endpoint: 1 });
pushSubscriptionSchema.index({ user: 1, token: 1 });
pushSubscriptionSchema.index({ guestEmail: 1, sessionId: 1 });

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

export default PushSubscription;
