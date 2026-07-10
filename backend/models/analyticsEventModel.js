import mongoose from 'mongoose';

const analyticsEventSchema = mongoose.Schema(
  {
    eventName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sessionId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    anonymousId: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      default: 'web',
      trim: true,
    },
    path: {
      type: String,
      default: '',
      trim: true,
    },
    referrer: {
      type: String,
      default: '',
      trim: true,
    },
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ eventName: 1, createdAt: -1 });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

export default AnalyticsEvent;
