import mongoose from 'mongoose';
import Vendor from '../models/vendorModel.js';
import VendorOrder from '../models/vendorOrderModel.js';
import VendorPayout from '../models/vendorPayoutModel.js';
import { roundMoney } from './commerceService.js';

const DEFAULT_VENDOR_COMMISSION_RATE = Number(process.env.DEFAULT_VENDOR_COMMISSION_RATE || 10);

const slugifyVendor = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const getUniqueVendorSlug = async (businessName, vendorId = null) => {
  const baseSlug = slugifyVendor(businessName) || `vendor-${Date.now()}`;
  let slug = baseSlug;
  let counter = 1;

  while (
    await Vendor.findOne({
      slug,
      ...(vendorId ? { _id: { $ne: vendorId } } : {}),
    })
  ) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
};

const resolvePayoutStatus = (order) => {
  if (order.refundStatus === 'Refunded' || order.paymentStatus === 'Refunded') {
    return 'Refunded';
  }

  if (order.orderStatus === 'Cancelled') {
    return 'Cancelled';
  }

  return order.isPaid ? 'Eligible' : 'Pending';
};

const syncVendorMetrics = async (vendorId) => {
  if (!vendorId) {
    return null;
  }

  const [orderTotals = {}] = await VendorOrder.aggregate([
    {
      $match: {
        vendor: new mongoose.Types.ObjectId(vendorId),
        payoutStatus: { $nin: ['Cancelled', 'Refunded'] },
      },
    },
    {
      $group: {
        _id: '$vendor',
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$subtotal' },
        totalCommission: { $sum: '$commissionTotal' },
      },
    },
  ]);

  const [payoutTotals = {}] = await VendorPayout.aggregate([
    {
      $match: {
        vendor: new mongoose.Types.ObjectId(vendorId),
        status: 'Paid',
      },
    },
    {
      $group: {
        _id: '$vendor',
        totalPayouts: { $sum: '$amount' },
      },
    },
  ]);

  const totalOrders = Number(orderTotals.totalOrders || 0);
  const totalRevenue = roundMoney(orderTotals.totalRevenue || 0);
  const totalCommission = roundMoney(orderTotals.totalCommission || 0);
  const totalPayouts = roundMoney(payoutTotals.totalPayouts || 0);

  await Vendor.updateOne(
    { _id: vendorId },
    {
      $set: {
        metrics: {
          totalOrders,
          totalRevenue,
          totalCommission,
          totalPayouts,
          averageOrderValue: totalOrders > 0 ? roundMoney(totalRevenue / totalOrders) : 0,
        },
      },
    }
  );

  return {
    totalOrders,
    totalRevenue,
    totalCommission,
    totalPayouts,
    averageOrderValue: totalOrders > 0 ? roundMoney(totalRevenue / totalOrders) : 0,
  };
};

const syncVendorOrdersForOrder = async (order) => {
  if (!order?._id || !Array.isArray(order.orderItems)) {
    return [];
  }

  const groups = new Map();

  for (const item of order.orderItems) {
    if (!item.vendor) {
      continue;
    }

    const vendorId = item.vendor.toString();
    const lineTotal = roundMoney(Number(item.price || 0) * Number(item.qty || 0));
    const commissionRate = Number(item.commissionRate ?? DEFAULT_VENDOR_COMMISSION_RATE);
    const commissionAmount = roundMoney(
      Number(item.commissionAmount || lineTotal * (commissionRate / 100))
    );
    const netAmount = roundMoney(Number(item.vendorNetAmount || lineTotal - commissionAmount));

    if (!groups.has(vendorId)) {
      groups.set(vendorId, {
        vendor: item.vendor,
        items: [],
        subtotal: 0,
        commissionTotal: 0,
        netTotal: 0,
      });
    }

    const group = groups.get(vendorId);
    group.items.push({
      product: item.product,
      variantId: item.variantId || null,
      name: item.name,
      sku: item.sku || '',
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      lineTotal,
      commissionRate,
      commissionAmount,
      netAmount,
    });
    group.subtotal = roundMoney(group.subtotal + lineTotal);
    group.commissionTotal = roundMoney(group.commissionTotal + commissionAmount);
    group.netTotal = roundMoney(group.netTotal + netAmount);
  }

  const syncedVendorIds = [];
  const payoutStatus = resolvePayoutStatus(order);

  for (const [vendorId, group] of groups.entries()) {
    syncedVendorIds.push(vendorId);
    await VendorOrder.findOneAndUpdate(
      {
        order: order._id,
        vendor: group.vendor,
      },
      {
        order: order._id,
        vendor: group.vendor,
        customer: order.user,
        currency: order.currency || 'LKR',
        orderStatus: order.orderStatus || 'Processing',
        paymentStatus: order.paymentStatus || (order.isPaid ? 'Paid' : 'Payment Pending'),
        isPaid: Boolean(order.isPaid),
        paidAt: order.paidAt || null,
        items: group.items,
        subtotal: group.subtotal,
        commissionTotal: group.commissionTotal,
        netTotal: group.netTotal,
        payoutStatus,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  await VendorOrder.updateMany(
    {
      order: order._id,
      ...(syncedVendorIds.length > 0 ? { vendor: { $nin: syncedVendorIds } } : {}),
    },
    {
      $set: {
        payoutStatus: 'Cancelled',
        orderStatus: order.orderStatus || 'Cancelled',
      },
    }
  );

  await Promise.all(syncedVendorIds.map((vendorId) => syncVendorMetrics(vendorId)));

  return VendorOrder.find({ order: order._id }).populate('vendor', 'businessName slug status');
};

const getVendorPerformance = async (vendorId) => {
  const metrics = await syncVendorMetrics(vendorId);
  const recentOrders = await VendorOrder.find({ vendor: vendorId })
    .populate('order', '_id createdAt totalPrice')
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();
  const payouts = await VendorPayout.find({ vendor: vendorId })
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  return { metrics, recentOrders, payouts };
};

export {
  DEFAULT_VENDOR_COMMISSION_RATE,
  getUniqueVendorSlug,
  slugifyVendor,
  syncVendorMetrics,
  syncVendorOrdersForOrder,
  getVendorPerformance,
};
