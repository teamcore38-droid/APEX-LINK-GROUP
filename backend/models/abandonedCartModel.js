import mongoose from 'mongoose';

const abandonedCartSchema = mongoose.Schema(
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
      index: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
        name: { type: String, default: '', trim: true },
        image: { type: String, default: '', trim: true },
        price: { type: Number, default: 0 },
        qty: { type: Number, default: 0 },
        variantId: { type: String, default: '', trim: true },
        variantLabel: { type: String, default: '', trim: true },
        sku: { type: String, default: '', trim: true },
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'LKR',
      uppercase: true,
      trim: true,
    },
    checkoutUrl: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Recovered', 'Email Sent', 'Suppressed', 'Expired'],
      default: 'Active',
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    recoveredAt: {
      type: Date,
      default: null,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
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

abandonedCartSchema.index({ user: 1, status: 1, updatedAt: -1 });
abandonedCartSchema.index({ email: 1, status: 1, updatedAt: -1 });

const AbandonedCart = mongoose.model('AbandonedCart', abandonedCartSchema);

export default AbandonedCart;
