import mongoose from 'mongoose';

const webhookDeliverySchema = mongoose.Schema(
  {
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WebhookSubscription',
      required: true,
    },
    event: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      type: String,
      default: '',
      trim: true,
    },
    resourceId: {
      type: String,
      default: '',
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'delivered', 'failed'],
      default: 'pending',
    },
    httpStatus: {
      type: Number,
      default: 0,
    },
    responseBody: {
      type: String,
      default: '',
    },
    error: {
      type: String,
      default: '',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    nextRetryAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

webhookDeliverySchema.index({ subscription: 1, createdAt: -1 });
webhookDeliverySchema.index({ event: 1, createdAt: -1 });

const WebhookDelivery = mongoose.model('WebhookDelivery', webhookDeliverySchema);

export default WebhookDelivery;
