import mongoose from 'mongoose';
import AuditLog from '../models/auditLogModel.js';
import Category from '../models/categoryModel.js';
import MediaAsset from '../models/mediaAssetModel.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';
import { Banner, FAQItem, HomepageSection, PolicyPage } from '../models/cmsModel.js';
import { slugify } from './categoryController.js';
import { DEFAULT_PRODUCT_IMAGE, validateProductPayload } from './productController.js';
import { syncVendorOrdersForOrder } from '../utils/vendorService.js';
import {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  getPermissionsForUser,
  normalizePermissionList,
} from '../utils/permissions.js';
import { recordAuditLog } from '../utils/auditService.js';

const STAFF_SELECT = 'name email phone isAdmin isStaff role staffPermissions staffStatus isVendor vendorStatus createdAt';

const parseBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }

  return fallback;
};

const parseCsvLine = (line = '') => {
  const values = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
};

const parseCsvProducts = (csvText = '') => {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((payload, header, index) => {
      payload[header] = values[index] ?? '';
      return payload;
    }, {});
  });
};

const escapeCsv = (value = '') => {
  const normalized = String(value ?? '');
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const productsToCsv = (products = []) => {
  const headers = [
    '_id',
    'name',
    'slug',
    'category',
    'brand',
    'sku',
    'price',
    'compareAtPrice',
    'countInStock',
    'lowStockThreshold',
    'image',
    'isActive',
    'approvalStatus',
  ];
  const rows = products.map((product) =>
    headers.map((header) => escapeCsv(product[header])).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

const getStaffUsers = async (_req, res) => {
  const staff = await User.find({
    $or: [{ isAdmin: true }, { isStaff: true }],
  })
    .select(STAFF_SELECT)
    .sort({ isAdmin: -1, createdAt: -1 });

  res.json({
    users: staff.map((user) => ({
      ...user.toObject(),
      permissions: getPermissionsForUser(user),
    })),
    allPermissions: ALL_PERMISSIONS,
    rolePermissions: ROLE_PERMISSIONS,
  });
};

const upsertStaffUser = async (req, res) => {
  const {
    id = '',
    name = '',
    email = '',
    phone = '',
    password = '',
    role = 'custom',
    staffPermissions = [],
    staffStatus = 'Active',
    isAdmin = false,
  } = req.body;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const trimmedName = String(name || '').trim();

  if (!trimmedName || !normalizedEmail) {
    return res.status(400).json({ message: 'Staff name and email are required' });
  }

  let user = id && mongoose.Types.ObjectId.isValid(id) ? await User.findById(id) : null;

  if (!user) {
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'New staff accounts require a password with at least 6 characters' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'An account already exists with that email' });
    }

    user = new User({
      name: trimmedName,
      email: normalizedEmail,
      phone: String(phone || '').trim(),
      password,
    });
  } else {
    user.name = trimmedName;
    user.email = normalizedEmail;
    user.phone = String(phone || '').trim();
    if (password) {
      user.password = password;
    }
  }

  user.isAdmin = Boolean(isAdmin);
  user.isStaff = Boolean(isAdmin) || true;
  const requestedRole = String(role || 'custom');
  user.role = user.isAdmin
    ? 'admin'
    : ROLE_PERMISSIONS[requestedRole] && !['admin', 'owner'].includes(requestedRole)
      ? requestedRole
      : 'custom';
  user.staffPermissions = normalizePermissionList(staffPermissions).filter((permission) =>
    ALL_PERMISSIONS.includes(permission)
  );
  user.staffStatus = ['Active', 'Suspended'].includes(staffStatus) ? staffStatus : 'Active';

  const isNewStaffUser = user.isNew;
  const savedUser = await user.save();
  await recordAuditLog(req, isNewStaffUser ? 'staff.create' : 'staff.upsert', 'User', savedUser._id, {
    email: savedUser.email,
    role: savedUser.role,
  });

  res.status(201).json({
    ...savedUser.toObject(),
    password: undefined,
    permissions: getPermissionsForUser(savedUser),
  });
};

const updateStaffStatus = async (req, res) => {
  const { staffStatus = 'Active' } = req.body;
  const user = await User.findById(req.params.id);

  if (!user || (!user.isStaff && !user.isAdmin)) {
    return res.status(404).json({ message: 'Staff account not found' });
  }

  user.staffStatus = staffStatus === 'Suspended' ? 'Suspended' : 'Active';
  await user.save();
  await recordAuditLog(req, 'staff.status', 'User', user._id, { staffStatus: user.staffStatus });

  res.json({ message: 'Staff status updated', staffStatus: user.staffStatus });
};

const getAuditLogs = async (req, res) => {
  const { action = '', actor = '', resourceType = '', limit = 100 } = req.query;
  const filter = {
    ...(action ? { action } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(actor && mongoose.Types.ObjectId.isValid(actor) ? { actor } : {}),
  };
  const logs = await AuditLog.find(filter)
    .populate('actor', 'name email role')
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, 500));

  res.json(logs);
};

const importProducts = async (req, res) => {
  const sourceProducts = Array.isArray(req.body.products)
    ? req.body.products
    : parseCsvProducts(req.body.csv || '');

  if (sourceProducts.length === 0) {
    return res.status(400).json({ message: 'Provide products array or CSV text' });
  }

  const results = [];

  for (const source of sourceProducts) {
    try {
      const payload = {
        ...source,
        price: Number(source.price || 0),
        compareAtPrice: Number(source.compareAtPrice || 0),
        countInStock: Number(source.countInStock || 0),
        lowStockThreshold: Number(source.lowStockThreshold || 10),
        isActive: parseBoolean(source.isActive, true),
        isBestSeller: parseBoolean(source.isBestSeller, false),
        isFeatured: parseBoolean(source.isFeatured, false),
      };
      const { errors, normalized } = await validateProductPayload(payload, {
        productId: source._id && mongoose.Types.ObjectId.isValid(source._id) ? source._id : null,
      });

      if (errors.length > 0) {
        results.push({ ok: false, name: source.name, error: errors[0] });
        continue;
      }

      const product = source._id && mongoose.Types.ObjectId.isValid(source._id)
        ? await Product.findById(source._id)
        : null;
      const target = product || new Product({ user: req.user._id, rating: 0, numReviews: 0 });

      Object.assign(target, {
        user: target.user || req.user._id,
        name: normalized.name,
        slug: normalized.slug,
        image: normalized.image || target.image || DEFAULT_PRODUCT_IMAGE,
        images: normalized.images.length > 0 ? normalized.images : [normalized.image || DEFAULT_PRODUCT_IMAGE],
        description: normalized.description,
        shortDescription: normalized.shortDescription || normalized.description.slice(0, 160).trim(),
        brand: normalized.brand,
        category: normalized.category,
        price: normalized.price,
        compareAtPrice: normalized.compareAtPrice,
        countInStock: normalized.countInStock,
        lowStockThreshold: normalized.lowStockThreshold,
        variants: normalized.variants,
        weight: normalized.weight,
        origin: normalized.origin,
        ingredients: normalized.ingredients,
        sku: normalized.sku,
        isFeatured: normalized.isFeatured,
        isActive: normalized.isActive,
        isBestSeller: normalized.isBestSeller,
        approvalStatus: normalized.approvalStatus || 'Approved',
      });

      const savedProduct = await target.save();
      results.push({ ok: true, productId: savedProduct._id, name: savedProduct.name });
    } catch (error) {
      results.push({ ok: false, name: source.name, error: error.message });
    }
  }

  await recordAuditLog(req, 'bulk.products.import', 'Product', '', {
    total: sourceProducts.length,
    imported: results.filter((result) => result.ok).length,
  });

  res.status(201).json({
    total: sourceProducts.length,
    imported: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  });
};

const exportProducts = async (req, res) => {
  const { format = 'json' } = req.query;
  const products = await Product.find({}).sort({ createdAt: -1 }).lean();

  await recordAuditLog(req, 'bulk.products.export', 'Product', '', { format, total: products.length });

  if (format === 'csv') {
    res.type('text/csv');
    return res.send(productsToCsv(products));
  }

  res.json(products);
};

const bulkOrderActions = async (req, res) => {
  const { orderIds = [], updates = {} } = req.body;
  const validOrderIds = orderIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (validOrderIds.length === 0) {
    return res.status(400).json({ message: 'Choose at least one valid order' });
  }

  const orders = await Order.find({ _id: { $in: validOrderIds } });
  const results = [];

  for (const order of orders) {
    if (updates.orderStatus) {
      order.orderStatus = updates.orderStatus;
      if (updates.orderStatus === 'Delivered') {
        order.isDelivered = true;
        order.deliveredAt = order.deliveredAt || new Date();
      }
      if (updates.orderStatus === 'Cancelled') {
        order.paymentStatus = order.isPaid ? order.paymentStatus : 'Cancelled';
      }
    }

    if (updates.paymentStatus) {
      order.paymentStatus = updates.paymentStatus;
      order.isPaid = updates.paymentStatus === 'Paid';
      order.paidAt = order.isPaid ? order.paidAt || new Date() : undefined;
    }

    if (updates.trackingNumber !== undefined) {
      order.trackingNumber = String(updates.trackingNumber || '').trim();
    }

    order.statusHistory.push({
      status: order.orderStatus,
      note: `Bulk admin action by ${req.user.name || req.user.email}.`,
      updatedAt: new Date(),
      updatedBy: req.user._id,
      updatedByName: req.user.name || req.user.email || '',
    });

    const savedOrder = await order.save();
    await syncVendorOrdersForOrder(savedOrder);
    results.push({ orderId: savedOrder._id, orderStatus: savedOrder.orderStatus, paymentStatus: savedOrder.paymentStatus });
  }

  await recordAuditLog(req, 'bulk.orders.update', 'Order', '', {
    orderIds: validOrderIds,
    updates,
  });

  res.json({ updated: results.length, results });
};

const getReports = async (_req, res) => {
  const now = new Date();
  const last30 = new Date(now);
  last30.setDate(now.getDate() - 30);

  const [salesSummary = {}] = await Order.aggregate([
    { $match: { createdAt: { $gte: last30 } } },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        paidOrders: { $sum: { $cond: ['$isPaid', 1, 0] } },
        revenue: { $sum: '$totalPrice' },
        tax: { $sum: '$taxPrice' },
        shipping: { $sum: '$shippingPrice' },
        discounts: { $sum: '$discountPrice' },
        refunds: { $sum: '$refundedAmount' },
      },
    },
  ]);

  const salesByDay = await Order.aggregate([
    { $match: { createdAt: { $gte: last30 } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: '$totalPrice' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const inventory = await Product.aggregate([
    {
      $group: {
        _id: null,
        products: { $sum: 1 },
        activeProducts: { $sum: { $cond: ['$isActive', 1, 0] } },
        stockUnits: { $sum: '$countInStock' },
        reservedUnits: { $sum: '$reservedStock' },
        inventoryValue: { $sum: { $multiply: ['$price', '$countInStock'] } },
      },
    },
  ]);

  const customers = await User.aggregate([
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        staffAccounts: { $sum: { $cond: ['$isStaff', 1, 0] } },
        vendorAccounts: { $sum: { $cond: ['$isVendor', 1, 0] } },
      },
    },
  ]);

  const topProducts = await Order.aggregate([
    { $unwind: '$orderItems' },
    {
      $group: {
        _id: '$orderItems.product',
        name: { $first: '$orderItems.name' },
        units: { $sum: '$orderItems.qty' },
        revenue: { $sum: { $multiply: ['$orderItems.qty', '$orderItems.price'] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  res.json({
    sales: {
      orders: salesSummary.orders || 0,
      paidOrders: salesSummary.paidOrders || 0,
      revenue: salesSummary.revenue || 0,
      tax: salesSummary.tax || 0,
      shipping: salesSummary.shipping || 0,
      discounts: salesSummary.discounts || 0,
      refunds: salesSummary.refunds || 0,
      salesByDay,
      topProducts,
    },
    inventory: inventory[0] || {
      products: 0,
      activeProducts: 0,
      stockUnits: 0,
      reservedUnits: 0,
      inventoryValue: 0,
    },
    customers: customers[0] || {
      totalCustomers: 0,
      staffAccounts: 0,
      vendorAccounts: 0,
    },
  });
};

const normalizeMediaPayload = (payload = {}, req) => ({
  title: String(payload.title || '').trim(),
  url: String(payload.url || '').trim(),
  altText: String(payload.altText || '').trim(),
  type: ['image', 'video', 'document', 'other'].includes(payload.type) ? payload.type : 'image',
  folder: String(payload.folder || 'general').trim() || 'general',
  tags: Array.isArray(payload.tags)
    ? payload.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : String(payload.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
  mimeType: String(payload.mimeType || '').trim(),
  sizeBytes: Number(payload.sizeBytes || 0),
  width: Number(payload.width || 0),
  height: Number(payload.height || 0),
  source: String(payload.source || 'url').trim(),
  uploadedBy: req.user?._id,
  uploadedByName: req.user?.name || req.user?.email || '',
});

const listMedia = async (req, res) => {
  const { folder = '', type = '', includeArchived = 'false' } = req.query;
  const filter = {
    ...(folder ? { folder } : {}),
    ...(type ? { type } : {}),
    ...(includeArchived === 'true' ? {} : { isArchived: false }),
  };
  const assets = await MediaAsset.find(filter).sort({ createdAt: -1 }).limit(300);
  res.json(assets);
};

const upsertMedia = async (req, res) => {
  const payload = normalizeMediaPayload(req.body, req);

  if (!payload.title || !payload.url) {
    return res.status(400).json({ message: 'Media title and URL are required' });
  }

  const asset = req.params.id && mongoose.Types.ObjectId.isValid(req.params.id)
    ? await MediaAsset.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    : await MediaAsset.create(payload);

  await recordAuditLog(req, 'media.upsert', 'MediaAsset', asset._id, { title: asset.title });
  res.status(201).json(asset);
};

const archiveMedia = async (req, res) => {
  const asset = await MediaAsset.findByIdAndUpdate(
    req.params.id,
    { isArchived: true },
    { new: true }
  );

  if (!asset) {
    return res.status(404).json({ message: 'Media asset not found' });
  }

  await recordAuditLog(req, 'media.archive', 'MediaAsset', asset._id, { title: asset.title });
  res.json(asset);
};

const listCms = async (_req, res) => {
  const [banners, homepageSections, faqs, policies] = await Promise.all([
    Banner.find({}).sort({ placement: 1, displayOrder: 1 }),
    HomepageSection.find({}).sort({ displayOrder: 1 }),
    FAQItem.find({}).sort({ category: 1, displayOrder: 1 }),
    PolicyPage.find({}).sort({ slug: 1 }),
  ]);

  res.json({ banners, homepageSections, faqs, policies });
};

const upsertBanner = async (req, res) => {
  const payload = {
    title: String(req.body.title || '').trim(),
    subtitle: String(req.body.subtitle || '').trim(),
    image: String(req.body.image || '').trim(),
    mobileImage: String(req.body.mobileImage || '').trim(),
    linkLabel: String(req.body.linkLabel || '').trim(),
    linkUrl: String(req.body.linkUrl || '').trim(),
    placement: String(req.body.placement || 'homepage').trim(),
    displayOrder: Number(req.body.displayOrder || 0),
    isActive: parseBoolean(req.body.isActive, true),
    startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined,
    endsAt: req.body.endsAt ? new Date(req.body.endsAt) : undefined,
  };

  if (!payload.title) {
    return res.status(400).json({ message: 'Banner title is required' });
  }

  const banner = req.params.id && mongoose.Types.ObjectId.isValid(req.params.id)
    ? await Banner.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    : await Banner.create(payload);

  await recordAuditLog(req, 'cms.banner.upsert', 'Banner', banner._id, { title: banner.title });
  res.status(201).json(banner);
};

const upsertHomepageSection = async (req, res) => {
  const key = slugify(req.body.key || req.body.title || '');
  const payload = {
    key,
    title: String(req.body.title || '').trim(),
    subtitle: String(req.body.subtitle || '').trim(),
    body: String(req.body.body || '').trim(),
    image: String(req.body.image || '').trim(),
    sectionType: ['hero', 'collection', 'editorial', 'featured-products', 'testimonials', 'custom'].includes(req.body.sectionType)
      ? req.body.sectionType
      : 'custom',
    displayOrder: Number(req.body.displayOrder || 0),
    isActive: parseBoolean(req.body.isActive, true),
    settings: req.body.settings || {},
  };

  if (!payload.key || !payload.title) {
    return res.status(400).json({ message: 'Homepage section key and title are required' });
  }

  const section = req.params.id && mongoose.Types.ObjectId.isValid(req.params.id)
    ? await HomepageSection.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    : await HomepageSection.findOneAndUpdate({ key }, payload, { new: true, upsert: true, runValidators: true });

  await recordAuditLog(req, 'cms.homepage.upsert', 'HomepageSection', section._id, { key: section.key });
  res.status(201).json(section);
};

const upsertFaq = async (req, res) => {
  const payload = {
    question: String(req.body.question || '').trim(),
    answer: String(req.body.answer || '').trim(),
    category: String(req.body.category || 'General').trim(),
    displayOrder: Number(req.body.displayOrder || 0),
    isActive: parseBoolean(req.body.isActive, true),
  };

  if (!payload.question || !payload.answer) {
    return res.status(400).json({ message: 'FAQ question and answer are required' });
  }

  const faq = req.params.id && mongoose.Types.ObjectId.isValid(req.params.id)
    ? await FAQItem.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    : await FAQItem.create(payload);

  await recordAuditLog(req, 'cms.faq.upsert', 'FAQItem', faq._id, { question: faq.question });
  res.status(201).json(faq);
};

const upsertPolicy = async (req, res) => {
  const slug = slugify(req.body.slug || req.body.title || '');
  const payload = {
    slug,
    title: String(req.body.title || '').trim(),
    body: String(req.body.body || '').trim(),
    summary: String(req.body.summary || '').trim(),
    isActive: parseBoolean(req.body.isActive, true),
    publishedAt: parseBoolean(req.body.isActive, true) ? new Date() : undefined,
  };

  if (!payload.slug || !payload.title || !payload.body) {
    return res.status(400).json({ message: 'Policy slug, title, and body are required' });
  }

  const policy = req.params.id && mongoose.Types.ObjectId.isValid(req.params.id)
    ? await PolicyPage.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    : await PolicyPage.findOneAndUpdate({ slug }, payload, { new: true, upsert: true, runValidators: true });

  await recordAuditLog(req, 'cms.policy.upsert', 'PolicyPage', policy._id, { slug: policy.slug });
  res.status(201).json(policy);
};

const getPublicCms = async (_req, res) => {
  const now = new Date();
  const [banners, homepageSections, faqs, policies] = await Promise.all([
    Banner.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    }).sort({ placement: 1, displayOrder: 1 }),
    HomepageSection.find({ isActive: true }).sort({ displayOrder: 1 }),
    FAQItem.find({ isActive: true }).sort({ category: 1, displayOrder: 1 }),
    PolicyPage.find({ isActive: true }).sort({ slug: 1 }).select('slug title summary publishedAt updatedAt'),
  ]);

  res.json({ banners, homepageSections, faqs, policies });
};

const getPublicPolicy = async (req, res) => {
  const policy = await PolicyPage.findOne({ slug: slugify(req.params.slug), isActive: true });

  if (!policy) {
    return res.status(404).json({ message: 'Policy not found' });
  }

  res.json(policy);
};

export {
  archiveMedia,
  bulkOrderActions,
  exportProducts,
  getAuditLogs,
  getPublicCms,
  getPublicPolicy,
  getReports,
  getStaffUsers,
  importProducts,
  listCms,
  listMedia,
  updateStaffStatus,
  upsertBanner,
  upsertFaq,
  upsertHomepageSection,
  upsertMedia,
  upsertPolicy,
  upsertStaffUser,
};
