import mongoose from 'mongoose';

const consentRecordSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sessionId: {
      type: String,
      default: '',
      trim: true,
    },
    consentVersion: {
      type: String,
      default: '2026-07-09',
      trim: true,
    },
    necessary: {
      type: Boolean,
      default: true,
    },
    analytics: {
      type: Boolean,
      default: false,
    },
    marketing: {
      type: Boolean,
      default: false,
    },
    personalization: {
      type: Boolean,
      default: false,
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

consentRecordSchema.index({ user: 1, updatedAt: -1 });
consentRecordSchema.index({ sessionId: 1, updatedAt: -1 });

const ConsentRecord = mongoose.model('ConsentRecord', consentRecordSchema);

export default ConsentRecord;
