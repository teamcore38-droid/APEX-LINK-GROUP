import mongoose from 'mongoose';

const twoFactorChallengeSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['admin-login', 'enable-2fa', 'disable-2fa'],
      default: 'admin-login',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
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

twoFactorChallengeSchema.index({ user: 1, purpose: 1, createdAt: -1 });

const TwoFactorChallenge = mongoose.model('TwoFactorChallenge', twoFactorChallengeSchema);

export default TwoFactorChallenge;
