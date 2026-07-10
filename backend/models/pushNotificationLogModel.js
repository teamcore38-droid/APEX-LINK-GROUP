import mongoose from 'mongoose';

const pushNotificationLogSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PushSubscription',
      default: null,
    },
    event: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    body: {
      type: String,
      default: '',
      trim: true,
    },
    url: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['queued', 'skipped', 'sent', 'failed'],
      default: 'queued',
    },
    provider: {
      type: String,
      default: 'local-log',
      trim: true,
    },
    error: {
      type: String,
      default: '',
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

pushNotificationLogSchema.index({ user: 1, createdAt: -1 });
pushNotificationLogSchema.index({ event: 1, createdAt: -1 });

const PushNotificationLog = mongoose.model('PushNotificationLog', pushNotificationLogSchema);

export default PushNotificationLog;
