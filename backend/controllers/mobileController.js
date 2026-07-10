import Category from '../models/categoryModel.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import PushNotificationLog from '../models/pushNotificationLogModel.js';
import PushSubscription from '../models/pushSubscriptionModel.js';
import SupportTicket from '../models/supportTicketModel.js';
import { Banner, FAQItem, HomepageSection, PolicyPage } from '../models/cmsModel.js';
import { activeProductFilter, getPersonalizedRecommendations } from '../utils/recommendationService.js';

const getFrontendUrl = () =>
  String(process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

const getMobileConfig = (_req, res) => {
  const baseUrl = getFrontendUrl();

  res.json({
    apiVersion: 'v1',
    appName: 'Apex Link Group',
    appScheme: 'apex',
    webBaseUrl: baseUrl,
    manifestUrl: `${baseUrl}/manifest.webmanifest`,
    serviceWorkerUrl: `${baseUrl}/sw.js`,
    universalLinks: {
      products: `${baseUrl}/product/:id`,
      orders: `${baseUrl}/orders/:id`,
      trackOrder: `${baseUrl}/track-order`,
    },
    deepLinks: {
      product: 'apex://product/:id',
      order: 'apex://order/:id',
      trackOrder: 'apex://track-order',
    },
    push: {
      webPushPublicKey: process.env.WEB_PUSH_PUBLIC_KEY || '',
      iosBundleId: process.env.IOS_BUNDLE_ID || 'com.apexlinkgroup.app',
      androidPackage: process.env.ANDROID_PACKAGE || 'com.apexlinkgroup.app',
    },
  });
};

const getMobileBootstrap = async (req, res) => {
  const [categories, featuredProducts, recommendations, banners, sections, faqs] = await Promise.all([
    Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).limit(20),
    Product.find({ ...activeProductFilter, isFeatured: true }).sort({ createdAt: -1 }).limit(12),
    getPersonalizedRecommendations({
      userId: req.user?._id || null,
      sessionId: req.query.sessionId || '',
      limit: 8,
    }),
    Banner.find({ isActive: true }).sort({ placement: 1, displayOrder: 1 }).limit(10),
    HomepageSection.find({ isActive: true }).sort({ displayOrder: 1 }).limit(10),
    FAQItem.find({ isActive: true }).sort({ displayOrder: 1 }).limit(10),
  ]);

  res.json({
    config: {
      apiVersion: 'v1',
      webBaseUrl: getFrontendUrl(),
    },
    categories,
    featuredProducts,
    recommendations,
    cms: {
      banners,
      sections,
      faqs,
    },
  });
};

const resolveDeepLink = async (req, res) => {
  const type = String(req.query.type || req.params.type || '').trim().toLowerCase();
  const id = String(req.query.id || req.params.id || '').trim();
  const baseUrl = getFrontendUrl();

  if (!['product', 'order', 'track-order'].includes(type)) {
    return res.status(400).json({ message: 'Unsupported deep link type' });
  }

  if (type === 'track-order') {
    return res.json({
      type,
      webUrl: `${baseUrl}/track-order`,
      appUrl: 'apex://track-order',
    });
  }

  if (!id) {
    return res.status(400).json({ message: 'Deep link id is required' });
  }

  if (type === 'product') {
    const product = await Product.findById(id).select('name slug isActive approvalStatus');

    if (!product || !product.isActive || product.approvalStatus !== 'Approved') {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json({
      type,
      id,
      title: product.name,
      webUrl: `${baseUrl}/product/${id}`,
      appUrl: `apex://product/${id}`,
    });
  }

  const order = await Order.findById(id).select('orderStatus user guestCustomer shippingAddress');

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  res.json({
    type,
    id,
    title: `Order ${id.slice(-6).toUpperCase()}`,
    status: order.orderStatus,
    webUrl: `${baseUrl}/orders/${id}`,
    appUrl: `apex://order/${id}`,
  });
};

const upsertPushSubscription = async (req, res) => {
  const {
    endpoint = '',
    token = '',
    keys = {},
    platform = 'web',
    deviceId = '',
    appVersion = '',
    preferences = {},
    guestEmail = '',
    sessionId = '',
  } = req.body;

  if (!endpoint && !token) {
    return res.status(400).json({ message: 'Push endpoint or native token is required' });
  }

  const filter = endpoint
    ? { endpoint: String(endpoint).trim() }
    : { token: String(token).trim(), platform };

  const subscription = await PushSubscription.findOneAndUpdate(
    filter,
    {
      user: req.user?._id || null,
      guestEmail: String(guestEmail || '').trim().toLowerCase(),
      sessionId: String(sessionId || '').trim(),
      platform,
      endpoint: String(endpoint || '').trim(),
      token: String(token || '').trim(),
      keys: {
        p256dh: keys?.p256dh || '',
        auth: keys?.auth || '',
      },
      deviceId: String(deviceId || '').trim(),
      appVersion: String(appVersion || '').trim(),
      preferences: {
        orderUpdates: preferences.orderUpdates !== false,
        promotions: Boolean(preferences.promotions),
        support: preferences.support !== false,
      },
      isActive: true,
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json(subscription);
};

const getMyPushSubscriptions = async (req, res) => {
  const subscriptions = await PushSubscription.find({ user: req.user._id }).sort({ updatedAt: -1 });
  res.json(subscriptions);
};

const deactivatePushSubscription = async (req, res) => {
  const subscription = await PushSubscription.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isActive: false },
    { new: true }
  );

  if (!subscription) {
    return res.status(404).json({ message: 'Push subscription not found' });
  }

  res.json(subscription);
};

const getMobileAdminSummary = async (_req, res) => {
  const [orderCounts, recentOrders, lowStockProducts, pendingCancellations, supportCounts, recentPushLogs] =
    await Promise.all([
      Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
      Order.find({})
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(8),
      Product.find({
        isActive: true,
        $expr: {
          $lte: [{ $subtract: ['$countInStock', '$reservedStock'] }, '$lowStockThreshold'],
        },
      })
        .select('name sku countInStock reservedStock lowStockThreshold image')
        .sort({ updatedAt: -1 })
        .limit(8),
      Order.countDocuments({ cancellationRequests: { $elemMatch: { status: 'Pending' } } }),
      SupportTicket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      PushNotificationLog.find({}).sort({ createdAt: -1 }).limit(8),
    ]);

  const publicPolicies = await PolicyPage.find({ isActive: true }).select('slug title updatedAt').sort({ title: 1 });

  res.json({
    orderCounts,
    recentOrders,
    lowStockProducts,
    pendingCancellations,
    supportCounts,
    recentPushLogs,
    policies: publicPolicies,
  });
};

export {
  deactivatePushSubscription,
  getMobileAdminSummary,
  getMobileBootstrap,
  getMobileConfig,
  getMyPushSubscriptions,
  resolveDeepLink,
  upsertPushSubscription,
};
