import mongoose from 'mongoose';

const privacyRequestSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['export', 'delete'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Ready', 'Completed', 'Rejected'],
      default: 'Pending',
    },
    requestedEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    adminNote: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

privacyRequestSchema.index({ user: 1, createdAt: -1 });
privacyRequestSchema.index({ status: 1, type: 1 });

const PrivacyRequest = mongoose.model('PrivacyRequest', privacyRequestSchema);

export default PrivacyRequest;
