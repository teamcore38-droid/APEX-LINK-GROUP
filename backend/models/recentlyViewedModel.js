import mongoose from 'mongoose';

const recentlyViewedSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: String, default: '', trim: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

recentlyViewedSchema.index({ user: 1, viewedAt: -1 });
recentlyViewedSchema.index({ sessionId: 1, viewedAt: -1 });
recentlyViewedSchema.index({ user: 1, product: 1 });
recentlyViewedSchema.index({ sessionId: 1, product: 1 });

const RecentlyViewed = mongoose.model('RecentlyViewed', recentlyViewedSchema);

export default RecentlyViewed;
