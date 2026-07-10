import mongoose from 'mongoose';

const webhookSubscriptionSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    events: {
      type: [String],
      default: ['*'],
    },
    secret: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastDeliveryAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

webhookSubscriptionSchema.index({ isActive: 1, events: 1 });

const WebhookSubscription = mongoose.model('WebhookSubscription', webhookSubscriptionSchema);

export default WebhookSubscription;
