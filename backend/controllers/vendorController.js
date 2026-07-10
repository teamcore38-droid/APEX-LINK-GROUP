import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import Vendor from '../models/vendorModel.js';
import VendorOrder from '../models/vendorOrderModel.js';
import VendorPayout from '../models/vendorPayoutModel.js';
import VendorProductSubmission from '../models/vendorProductSubmissionModel.js';
import RFQ from '../models/rfqModel.js';
import {
  DEFAULT_PRODUCT_IMAGE,
  validateProductPayload,
} from './productController.js';
import {
  DEFAULT_VENDOR_COMMISSION_RATE,
  getUniqueVendorSlug,
  getVendorPerformance,
  syncVendorMetrics,
} from '../utils/vendorService.js';
import { roundMoney } from '../utils/commerceService.js';

const normalizeVendorPayload = (payload = {}, fallbackUser = null) => {
  const businessName = String(payload.businessName || '').trim();

  return {
    businessName,
    contactName: String(payload.contactName || fallbackUser?.name || '').trim(),
    email: String(payload.email || fallbackUser?.email || '').trim().toLowerCase(),
    phone: String(payload.phone || fallbackUser?.phone || '').trim(),
    website: String(payload.website || '').trim(),
    businessType: String(payload.businessType || '').trim(),
    taxId: String(payload.taxId || '').trim(),
    registrationNumber: String(payload.registrationNumber || '').trim(),
    addressLine1: String(payload.addressLine1 || '').trim(),
    addressLine2: String(payload.addressLine2 || '').trim(),
    city: String(payload.city || '').trim(),
    state: String(payload.state || '').trim(),
    postalCode: String(payload.postalCode || '').trim(),
    country: String(payload.country || '').trim(),
    documents: Array.isArray(payload.documents)
      ? payload.documents
          .map((document) => ({
            label: String(document.label || '').trim(),
            url: String(document.url || '').trim(),
            status: ['Pending', 'Verified', 'Rejected'].includes(document.status)
              ? document.status
              : 'Pending',
            note: String(document.note || '').trim(),
          }))
          .filter((document) => document.label || document.url)
      : [],
    payoutMethod: String(payload.payoutMethod || '').trim(),
    payoutEmail: String(payload.payoutEmail || '').trim(),
    bankName: String(payload.bankName || '').trim(),
    accountLast4: String(payload.accountLast4 || '').trim().slice(-4),
  };
};

const getVendorProfile = async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  res.json(vendor || null);
};

const upsertVendorProfile = async (req, res) => {
  try {
    const normalized = normalizeVendorPayload(req.body, req.user);

    if (!normalized.businessName) {
      return res.status(400).json({ message: 'Business name is required' });
    }

    let vendor = await Vendor.findOne({ user: req.user._id });
    const slug = await getUniqueVendorSlug(normalized.businessName, vendor?._id);

    if (!vendor) {
      vendor = new Vendor({
        user: req.user._id,
        slug,
        commissionRate: DEFAULT_VENDOR_COMMISSION_RATE,
        ...normalized,
      });
    } else {
      Object.assign(vendor, normalized, { slug });
      if (vendor.status === 'Rejected') {
        vendor.status = 'Draft';
      }
    }

    const savedVendor = await vendor.save();
    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          isVendor: ['Verified', 'Submitted', 'Under Review'].includes(savedVendor.status),
          vendorStatus: savedVendor.status,
        },
      }
    );

    res.json(savedVendor);
  } catch (error) {
    console.error('[vendorController:upsertVendorProfile]', error);
    res.status(500).json({ message: 'Unable to save vendor profile right now' });
  }
};

const submitVendorProfile = async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    return res.status(404).json({ message: 'Create your vendor profile first' });
  }

  vendor.status = 'Submitted';
  vendor.submittedAt = new Date();
  vendor.reviewNote = '';
  const savedVendor = await vendor.save();

  await User.updateOne(
    { _id: req.user._id },
    { $set: { isVendor: true, vendorStatus: savedVendor.status } }
  );

  res.json(savedVendor);
};

const getVendorDashboard = async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    return res.status(404).json({ message: 'Vendor profile not found' });
  }

  const performance = await getVendorPerformance(vendor._id);
  const submissions = await VendorProductSubmission.find({ vendor: vendor._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const rfqs = await RFQ.find({
    assignedVendors: vendor._id,
    status: { $nin: ['Closed', 'Rejected'] },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json({
    vendor,
    ...performance,
    submissions,
    rfqs,
  });
};

const createProductSubmission = async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    return res.status(404).json({ message: 'Vendor profile not found' });
  }

  if (vendor.status !== 'Verified') {
    return res.status(403).json({ message: 'Vendor verification is required before submitting products' });
  }

  const { errors } = await validateProductPayload(req.body || {});

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0] });
  }

  const submission = await VendorProductSubmission.create({
    vendor: vendor._id,
    submittedBy: req.user._id,
    status: 'Submitted',
    payload: req.body || {},
    submittedAt: new Date(),
  });

  res.status(201).json(submission);
};

const getMyProductSubmissions = async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    return res.json([]);
  }

  const submissions = await VendorProductSubmission.find({ vendor: vendor._id })
    .populate('product', 'name slug image approvalStatus isActive')
    .sort({ createdAt: -1 });

  res.json(submissions);
};

const getAdminVendors = async (_req, res) => {
  const vendors = await Vendor.find({})
    .populate('user', 'name email phone isVendor vendorStatus')
    .sort({ createdAt: -1 });

  res.json(vendors);
};

const reviewVendor = async (req, res) => {
  const { status = '', reviewNote = '', commissionRate } = req.body;

  if (!['Under Review', 'Verified', 'Rejected', 'Suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid vendor review status' });
  }

  const vendor = await Vendor.findById(req.params.id);

  if (!vendor) {
    return res.status(404).json({ message: 'Vendor not found' });
  }

  vendor.status = status;
  vendor.reviewNote = String(reviewNote || '').trim();
  vendor.reviewedAt = new Date();
  vendor.reviewedBy = req.user._id;
  vendor.reviewedByName = req.user.name || req.user.email || 'Admin';

  if (commissionRate !== undefined) {
    const nextCommissionRate = Number(commissionRate);

    if (!Number.isFinite(nextCommissionRate) || nextCommissionRate < 0 || nextCommissionRate > 100) {
      return res.status(400).json({ message: 'Commission rate must be between 0 and 100' });
    }

    vendor.commissionRate = nextCommissionRate;
  }

  const savedVendor = await vendor.save();
  await User.updateOne(
    { _id: vendor.user },
    {
      $set: {
        isVendor: ['Verified', 'Submitted', 'Under Review'].includes(savedVendor.status),
        vendorStatus: savedVendor.status,
      },
    }
  );

  res.json(savedVendor);
};

const getAdminProductSubmissions = async (_req, res) => {
  const submissions = await VendorProductSubmission.find({})
    .populate('vendor', 'businessName slug status commissionRate')
    .populate('product', 'name slug image approvalStatus')
    .sort({ createdAt: -1 });

  res.json(submissions);
};

const approveProductSubmission = async (submission, actor, reviewNote = '') => {
  const vendor = await Vendor.findById(submission.vendor);

  if (!vendor || vendor.status !== 'Verified') {
    throw new Error('Only verified vendors can have products approved');
  }

  const { errors, normalized } = await validateProductPayload(submission.payload || {});

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  const product = submission.product
    ? await Product.findById(submission.product)
    : new Product({
        user: actor._id,
        vendor: vendor._id,
        rating: 0,
        numReviews: 0,
      });

  product.user = actor._id;
  product.vendor = vendor._id;
  product.name = normalized.name;
  product.slug = normalized.slug;
  product.image = normalized.image || product.image || DEFAULT_PRODUCT_IMAGE;
  product.images =
    normalized.images.length > 0
      ? normalized.images
      : [normalized.image || product.image || DEFAULT_PRODUCT_IMAGE];
  product.brand = normalized.brand;
  product.category = normalized.category;
  product.price = normalized.price;
  product.compareAtPrice = normalized.compareAtPrice;
  product.countInStock = normalized.countInStock;
  product.lowStockThreshold = normalized.lowStockThreshold;
  product.variants = normalized.variants;
  product.shortDescription =
    normalized.shortDescription || normalized.description.slice(0, 160).trim();
  product.description = normalized.description;
  product.weight = normalized.weight;
  product.origin = normalized.origin;
  product.ingredients = normalized.ingredients;
  product.sku = normalized.sku;
  product.isFeatured = normalized.isFeatured;
  product.isActive = normalized.isActive;
  product.isBestSeller = normalized.isBestSeller;
  product.approvalStatus = 'Approved';

  const savedProduct = await product.save();

  submission.product = savedProduct._id;
  submission.status = 'Approved';
  submission.reviewedAt = new Date();
  submission.reviewedBy = actor._id;
  submission.reviewedByName = actor.name || actor.email || 'Admin';
  submission.reviewNote = reviewNote;
  await submission.save();

  return submission.populate([
    { path: 'vendor', select: 'businessName slug status commissionRate' },
    { path: 'product', select: 'name slug image approvalStatus' },
  ]);
};

const reviewProductSubmission = async (req, res) => {
  try {
    const { status = '', reviewNote = '' } = req.body;

    if (!['Approved', 'Rejected', 'Changes Requested'].includes(status)) {
      return res.status(400).json({ message: 'Invalid submission review status' });
    }

    const submission = await VendorProductSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Product submission not found' });
    }

    if (status === 'Approved') {
      const approvedSubmission = await approveProductSubmission(
        submission,
        req.user,
        String(reviewNote || '').trim()
      );
      return res.json(approvedSubmission);
    }

    submission.status = status;
    submission.reviewedAt = new Date();
    submission.reviewedBy = req.user._id;
    submission.reviewedByName = req.user.name || req.user.email || 'Admin';
    submission.reviewNote = String(reviewNote || '').trim();
    await submission.save();

    res.json(submission);
  } catch (error) {
    console.error('[vendorController:reviewProductSubmission]', error);
    res.status(400).json({ message: error.message || 'Unable to review product submission' });
  }
};

const getAdminVendorOrders = async (req, res) => {
  const { vendorId = '', status = '' } = req.query;
  const filter = {};

  if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
    filter.vendor = vendorId;
  }

  if (status) {
    filter.payoutStatus = status;
  }

  const vendorOrders = await VendorOrder.find(filter)
    .populate('vendor', 'businessName slug')
    .populate('order', '_id createdAt totalPrice orderStatus')
    .populate('customer', 'name email')
    .sort({ createdAt: -1 })
    .limit(200);

  res.json(vendorOrders);
};

const getAdminPayouts = async (_req, res) => {
  const payouts = await VendorPayout.find({})
    .populate('vendor', 'businessName slug')
    .populate('vendorOrders', '_id order subtotal commissionTotal netTotal payoutStatus')
    .sort({ createdAt: -1 })
    .limit(200);

  res.json(payouts);
};

const createPayout = async (req, res) => {
  const {
    vendorId = '',
    vendorOrderIds = [],
    status = 'Pending',
    method = '',
    reference = '',
    note = '',
    periodStart,
    periodEnd,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return res.status(400).json({ message: 'Valid vendor is required' });
  }

  const vendor = await Vendor.findById(vendorId);

  if (!vendor) {
    return res.status(404).json({ message: 'Vendor not found' });
  }

  const orderFilter = {
    vendor: vendorId,
    payoutStatus: 'Eligible',
    isPaid: true,
    ...(Array.isArray(vendorOrderIds) && vendorOrderIds.length > 0
      ? { _id: { $in: vendorOrderIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) } }
      : {}),
  };
  const eligibleOrders = await VendorOrder.find(orderFilter);

  if (eligibleOrders.length === 0) {
    return res.status(400).json({ message: 'No eligible vendor orders found for payout' });
  }

  const grossAmount = roundMoney(eligibleOrders.reduce((total, order) => total + order.subtotal, 0));
  const commissionTotal = roundMoney(
    eligibleOrders.reduce((total, order) => total + order.commissionTotal, 0)
  );
  const amount = roundMoney(eligibleOrders.reduce((total, order) => total + order.netTotal, 0));
  const normalizedStatus = ['Pending', 'Approved', 'Paid', 'Failed', 'Cancelled'].includes(status)
    ? status
    : 'Pending';

  const payout = await VendorPayout.create({
    vendor: vendor._id,
    vendorOrders: eligibleOrders.map((order) => order._id),
    currency: eligibleOrders[0]?.currency || 'LKR',
    amount,
    grossAmount,
    commissionTotal,
    status: normalizedStatus,
    method: String(method || vendor.payoutMethod || '').trim(),
    reference: String(reference || '').trim(),
    periodStart: periodStart ? new Date(periodStart) : undefined,
    periodEnd: periodEnd ? new Date(periodEnd) : undefined,
    paidAt: normalizedStatus === 'Paid' ? new Date() : undefined,
    note: String(note || '').trim(),
    processedBy: req.user._id,
    processedByName: req.user.name || req.user.email || 'Admin',
  });

  await VendorOrder.updateMany(
    { _id: { $in: payout.vendorOrders } },
    {
      $set: {
        payout: payout._id,
        payoutStatus: normalizedStatus === 'Paid' ? 'Paid' : 'On Hold',
      },
    }
  );
  await syncVendorMetrics(vendor._id);

  res.status(201).json(await payout.populate('vendor', 'businessName slug'));
};

const updatePayout = async (req, res) => {
  const { status, method, reference, note } = req.body;
  const payout = await VendorPayout.findById(req.params.id);

  if (!payout) {
    return res.status(404).json({ message: 'Payout not found' });
  }

  if (status !== undefined) {
    if (!['Pending', 'Approved', 'Paid', 'Failed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid payout status' });
    }

    payout.status = status;
    payout.paidAt = status === 'Paid' ? payout.paidAt || new Date() : undefined;
  }

  if (method !== undefined) {
    payout.method = String(method || '').trim();
  }

  if (reference !== undefined) {
    payout.reference = String(reference || '').trim();
  }

  if (note !== undefined) {
    payout.note = String(note || '').trim();
  }

  payout.processedBy = req.user._id;
  payout.processedByName = req.user.name || req.user.email || 'Admin';
  const savedPayout = await payout.save();

  await VendorOrder.updateMany(
    { _id: { $in: savedPayout.vendorOrders } },
    {
      $set: {
        payoutStatus:
          savedPayout.status === 'Paid'
            ? 'Paid'
            : savedPayout.status === 'Cancelled' || savedPayout.status === 'Failed'
              ? 'Eligible'
              : 'On Hold',
      },
    }
  );
  await syncVendorMetrics(savedPayout.vendor);

  res.json(await savedPayout.populate('vendor', 'businessName slug'));
};

export {
  getVendorProfile,
  upsertVendorProfile,
  submitVendorProfile,
  getVendorDashboard,
  createProductSubmission,
  getMyProductSubmissions,
  getAdminVendors,
  reviewVendor,
  getAdminProductSubmissions,
  reviewProductSubmission,
  getAdminVendorOrders,
  getAdminPayouts,
  createPayout,
  updatePayout,
};
