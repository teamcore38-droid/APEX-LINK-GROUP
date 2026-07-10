import mongoose from 'mongoose';

const loyaltyAccountSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    pointsBalance: { type: Number, default: 0, min: 0 },
    lifetimePoints: { type: Number, default: 0, min: 0 },
    tier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze',
    },
    lastActivityAt: { type: Date },
  },
  { timestamps: true }
);

const loyaltyTransactionSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    type: {
      type: String,
      enum: ['Earned', 'Redeemed', 'Adjusted', 'Expired', 'Cancelled'],
      default: 'Earned',
    },
    points: { type: Number, required: true },
    balanceAfter: { type: Number, default: 0 },
    description: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdByName: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ order: 1, type: 1 });

const LoyaltyAccount = mongoose.model('LoyaltyAccount', loyaltyAccountSchema);
const LoyaltyTransaction = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);

export { LoyaltyAccount, LoyaltyTransaction };
