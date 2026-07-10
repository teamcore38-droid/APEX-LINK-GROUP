import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import RecentlyViewed from '../models/recentlyViewedModel.js';
import WishlistItem from '../models/wishlistModel.js';

const activeProductFilter = {
  $and: [
    { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
    { $or: [{ approvalStatus: 'Approved' }, { approvalStatus: { $exists: false } }] },
  ],
};

const getPersonalizedRecommendations = async ({ userId = null, sessionId = '', limit = 8 } = {}) => {
  const categoryWeights = new Map();
  const excludeProductIds = new Set();

  const recentFilter = userId ? { user: userId } : sessionId ? { sessionId } : null;

  if (recentFilter) {
    const recentViews = await RecentlyViewed.find(recentFilter)
      .populate('product', 'category')
      .sort({ viewedAt: -1 })
      .limit(20)
      .lean();

    recentViews.forEach((entry) => {
      if (entry.product?._id) {
        excludeProductIds.add(entry.product._id.toString());
      }
      if (entry.product?.category) {
        categoryWeights.set(entry.product.category, (categoryWeights.get(entry.product.category) || 0) + 3);
      }
    });
  }

  if (userId) {
    const [orders, wishlist] = await Promise.all([
      Order.find({ user: userId }).sort({ createdAt: -1 }).limit(8).lean(),
      WishlistItem.find({ user: userId }).populate('product', 'category').lean(),
    ]);

    orders.flatMap((order) => order.orderItems || []).forEach((item) => {
      excludeProductIds.add(item.product?.toString?.() || String(item.product || ''));
      if (item.name) {
        categoryWeights.set(item.category || '', (categoryWeights.get(item.category || '') || 0) + 1);
      }
    });

    (wishlist || []).forEach((item) => {
      if (item.product?.category) {
        categoryWeights.set(item.product.category, (categoryWeights.get(item.product.category) || 0) + 2);
      }
    });
  }

  const preferredCategories = [...categoryWeights.entries()]
    .filter(([category]) => category)
    .sort((left, right) => right[1] - left[1])
    .map(([category]) => category);

  const baseFilter = {
    ...activeProductFilter,
    ...(excludeProductIds.size > 0 ? { _id: { $nin: [...excludeProductIds] } } : {}),
  };

  const recommended = preferredCategories.length
    ? await Product.find({ ...baseFilter, category: { $in: preferredCategories } })
        .sort({ isFeatured: -1, rating: -1, createdAt: -1 })
        .limit(limit)
    : [];

  if (recommended.length >= limit) {
    return recommended;
  }

  const fallback = await Product.find({
    ...baseFilter,
    _id: { $nin: [...excludeProductIds, ...recommended.map((product) => product._id.toString())] },
  })
    .sort({ isFeatured: -1, isBestSeller: -1, rating: -1, createdAt: -1 })
    .limit(limit - recommended.length);

  return [...recommended, ...fallback];
};

export { activeProductFilter, getPersonalizedRecommendations };
