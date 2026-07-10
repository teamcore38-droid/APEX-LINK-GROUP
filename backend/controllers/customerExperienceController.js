import mongoose from 'mongoose';
import Product from '../models/productModel.js';
import RecentlyViewed from '../models/recentlyViewedModel.js';
import SupportTicket from '../models/supportTicketModel.js';
import User from '../models/userModel.js';
import { LoyaltyAccount, LoyaltyTransaction } from '../models/loyaltyModel.js';
import { activeProductFilter, getPersonalizedRecommendations } from '../utils/recommendationService.js';
import { getOrCreateLoyaltyAccount } from '../utils/loyaltyService.js';
import { emitWebhookEvent } from '../utils/webhookService.js';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSessionId = (req) =>
  String(req.body?.sessionId || req.query?.sessionId || req.headers['x-session-id'] || '').trim();

const buildSearchFilter = (query = {}) => {
  const {
    keyword = '',
    category = '',
    brand = '',
    origin = '',
    minPrice = '',
    maxPrice = '',
    stock = '',
    rating = '',
  } = query;
  const filters = [activeProductFilter];

  if (keyword) {
    const pattern = new RegExp(escapeRegex(String(keyword).trim()), 'i');
    filters.push({
      $or: [
        { name: pattern },
        { brand: pattern },
        { category: pattern },
        { origin: pattern },
        { sku: pattern },
        { shortDescription: pattern },
        { description: pattern },
      ],
    });
  }

  if (category) {
    filters.push({ category: { $regex: new RegExp(`^${escapeRegex(category)}$`, 'i') } });
  }

  if (brand) {
    filters.push({ brand: { $regex: new RegExp(`^${escapeRegex(brand)}$`, 'i') } });
  }

  if (origin) {
    filters.push({ origin: { $regex: new RegExp(escapeRegex(origin), 'i') } });
  }

  const min = minPrice === '' ? null : Number(minPrice);
  const max = maxPrice === '' ? null : Number(maxPrice);

  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    const priceFilter = {};
    if (!Number.isNaN(min) && min !== null) priceFilter.$gte = min;
    if (!Number.isNaN(max) && max !== null) priceFilter.$lte = max;
    filters.push({ price: priceFilter });
  }

  if (stock === 'in-stock') {
    filters.push({ countInStock: { $gt: 0 } });
  } else if (stock === 'out-of-stock') {
    filters.push({ countInStock: { $lte: 0 } });
  }

  const minRating = Number(rating || 0);
  if (minRating > 0) {
    filters.push({ rating: { $gte: minRating } });
  }

  return { $and: filters };
};

const getAdvancedSearch = async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 48);
  const sort = String(req.query.sort || '');
  const filter = buildSearchFilter(req.query);
  const sortMap = {
    newest: { createdAt: -1 },
    'price-low': { price: 1 },
    'price-high': { price: -1 },
    'rating-high': { rating: -1, createdAt: -1 },
    'name-asc': { name: 1 },
  };

  const [totalProducts, products, facets, priceRange] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort(sortMap[sort] || { isFeatured: -1, isBestSeller: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.aggregate([
      { $match: filter },
      {
        $facet: {
          categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
          brands: [{ $group: { _id: '$brand', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
          origins: [{ $group: { _id: '$origin', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
          availability: [
            {
              $group: {
                _id: { $cond: [{ $gt: ['$countInStock', 0] }, 'in-stock', 'out-of-stock'] },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),
    Product.aggregate([
      { $match: filter },
      { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
    ]),
  ]);

  const totalPages = totalProducts === 0 ? 1 : Math.ceil(totalProducts / limit);

  res.json({
    products,
    currentPage: Math.min(page, totalPages),
    totalPages,
    totalProducts,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    facets: {
      categories: facets[0]?.categories || [],
      brands: facets[0]?.brands || [],
      origins: facets[0]?.origins || [],
      availability: facets[0]?.availability || [],
      priceRange: priceRange[0] || { min: 0, max: 0 },
    },
  });
};

const recordRecentlyViewed = async (req, res) => {
  const { productId = '' } = req.body;
  const sessionId = getSessionId(req);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Valid product is required' });
  }

  if (!req.user?._id && !sessionId) {
    return res.status(400).json({ message: 'Session ID is required for guest recently viewed products' });
  }

  const filter = req.user?._id
    ? { user: req.user._id, product: productId }
    : { sessionId, product: productId };
  const viewed = await RecentlyViewed.findOneAndUpdate(
    filter,
    {
      ...filter,
      viewedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json(viewed);
};

const getRecentlyViewed = async (req, res) => {
  const sessionId = getSessionId(req);

  if (!req.user?._id && !sessionId) {
    return res.json([]);
  }

  const filter = req.user?._id ? { user: req.user._id } : { sessionId };
  const viewed = await RecentlyViewed.find(filter)
    .populate('product')
    .sort({ viewedAt: -1 })
    .limit(12);

  res.json(viewed.map((entry) => entry.product).filter(Boolean));
};

const getRecommendations = async (req, res) => {
  const products = await getPersonalizedRecommendations({
    userId: req.user?._id || null,
    sessionId: getSessionId(req),
    limit: Number.parseInt(req.query.limit, 10) || 8,
  });

  res.json(products);
};

const getLoyalty = async (req, res) => {
  const account = await getOrCreateLoyaltyAccount(req.user._id);
  const transactions = await LoyaltyTransaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ account, transactions });
};

const getNotificationPreferences = async (req, res) => {
  const user = await User.findById(req.user._id).select('notificationPreferences phone email');
  res.json(user.notificationPreferences || {});
};

const updateNotificationPreferences = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.notificationPreferences = {
    ...user.notificationPreferences,
    ...req.body,
    email: {
      ...user.notificationPreferences?.email,
      ...req.body.email,
    },
    sms: {
      ...user.notificationPreferences?.sms,
      ...req.body.sms,
    },
    whatsapp: {
      ...user.notificationPreferences?.whatsapp,
      ...req.body.whatsapp,
    },
  };
  await user.save();

  res.json(user.notificationPreferences);
};

const createSupportTicket = async (req, res) => {
  const subject = String(req.body.subject || '').trim();
  const body = String(req.body.message || req.body.body || '').trim();

  if (!subject || !body) {
    return res.status(400).json({ message: 'Subject and message are required' });
  }

  const ticket = await SupportTicket.create({
    user: req.user?._id || null,
    order: mongoose.Types.ObjectId.isValid(req.body.orderId) ? req.body.orderId : null,
    guestEmail: String(req.body.guestEmail || req.user?.email || '').trim().toLowerCase(),
    name: String(req.body.name || req.user?.name || '').trim(),
    subject,
    category: ['General', 'Order', 'Shipping', 'Return', 'Product', 'Payment', 'B2B'].includes(req.body.category)
      ? req.body.category
      : 'General',
    priority: ['Low', 'Normal', 'High', 'Urgent'].includes(req.body.priority) ? req.body.priority : 'Normal',
    channel: ['Live Chat', 'Support Ticket', 'Email', 'WhatsApp'].includes(req.body.channel)
      ? req.body.channel
      : 'Support Ticket',
    messages: [
      {
        author: req.user?._id || null,
        authorName: req.user?.name || req.body.name || '',
        authorEmail: req.user?.email || req.body.guestEmail || '',
        body,
        isStaff: false,
      },
    ],
    lastMessageAt: new Date(),
  });
  await emitWebhookEvent('support.ticket.created', ticket.toObject(), {
    resourceType: 'SupportTicket',
    resourceId: ticket._id.toString(),
  });

  res.status(201).json(ticket);
};

const getSupportTickets = async (req, res) => {
  const guestEmail = String(req.query.guestEmail || '').trim().toLowerCase();
  const filter = req.user?._id ? { user: req.user._id } : guestEmail ? { guestEmail } : null;

  if (!filter) {
    return res.json([]);
  }

  const tickets = await SupportTicket.find(filter).sort({ lastMessageAt: -1 }).limit(100);
  res.json(tickets);
};

const addSupportTicketReply = async (req, res) => {
  const body = String(req.body.body || req.body.message || '').trim();

  if (!body) {
    return res.status(400).json({ message: 'Reply message is required' });
  }

  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({ message: 'Support ticket not found' });
  }

  const isOwner =
    req.user?._id?.toString?.() === ticket.user?.toString?.() ||
    (!ticket.user && String(req.body.guestEmail || '').toLowerCase() === ticket.guestEmail);

  if (!isOwner) {
    return res.status(403).json({ message: 'Not authorized to reply to this ticket' });
  }

  ticket.messages.push({
    author: req.user?._id || null,
    authorName: req.user?.name || req.body.name || '',
    authorEmail: req.user?.email || req.body.guestEmail || '',
    body,
    isStaff: false,
  });
  ticket.status = 'Pending Staff';
  ticket.lastMessageAt = new Date();
  await ticket.save();

  res.json(ticket);
};

const getAdminSupportTickets = async (req, res) => {
  const { status = '' } = req.query;
  const filter = status ? { status } : {};
  const tickets = await SupportTicket.find(filter)
    .populate('user', 'name email phone')
    .populate('order', '_id orderStatus totalPrice')
    .sort({ lastMessageAt: -1 })
    .limit(200);

  res.json(tickets);
};

const updateAdminSupportTicket = async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({ message: 'Support ticket not found' });
  }

  if (req.body.status) {
    ticket.status = req.body.status;
  }

  if (req.body.reply) {
    ticket.messages.push({
      author: req.user._id,
      authorName: req.user.name || req.user.email || 'Staff',
      authorEmail: req.user.email,
      body: String(req.body.reply).trim(),
      isStaff: true,
    });
    ticket.status = req.body.status || 'Pending Customer';
    ticket.lastMessageAt = new Date();
  }

  if (req.body.assignedToName !== undefined) {
    ticket.assignedTo = req.user._id;
    ticket.assignedToName = req.body.assignedToName || req.user.name || req.user.email || '';
  }

  await ticket.save();
  res.json(ticket);
};

export {
  addSupportTicketReply,
  createSupportTicket,
  getAdvancedSearch,
  getAdminSupportTickets,
  getLoyalty,
  getNotificationPreferences,
  getRecentlyViewed,
  getRecommendations,
  getSupportTickets,
  recordRecentlyViewed,
  updateAdminSupportTicket,
  updateNotificationPreferences,
};
