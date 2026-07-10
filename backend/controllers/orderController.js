import crypto from 'crypto';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import { normalizeAddressPayload, saveAddressToUser } from '../utils/addressBook.js';
import {
  sendOrderConfirmationEmail,
} from '../utils/emailService.js';
import {
  buildSafePaymentResult,
  getStripeClient,
  isStripeConfigured,
  toStripeAmount,
} from '../utils/paymentService.js';
import {
  applySuccessfulPaymentToOrder,
  createStatusEmailKey,
  maybeSendStatusEmail,
} from '../utils/orderPaymentLifecycle.js';
import {
  calculateOrderPricing,
  commitPromotionsForOrder,
  getShippingOptions,
} from '../utils/commerceService.js';
import {
  applyReservation,
  deductReservedInventory,
  releaseReservedInventory,
} from '../utils/inventoryService.js';
import { syncVendorOrdersForOrder } from '../utils/vendorService.js';
import { hasPermission } from '../utils/permissions.js';
import { recordAuditLog } from '../utils/auditService.js';
import { awardOrderLoyaltyPoints } from '../utils/loyaltyService.js';
import { notifyOrderEvent } from '../utils/pushService.js';
import { emitWebhookEvent } from '../utils/webhookService.js';
import {
  assessOrderFraud,
  buildCheckoutIntegrity,
  recordFraudSignal,
} from '../utils/fraudService.js';

const VALID_ORDER_STATUSES = [
  'Processing',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const VALID_PAYMENT_STATUSES = [
  'Paid',
  'Unpaid',
  'Payment Pending',
  'Payment Failed',
  'Payment Cancelled',
  'Cancelled',
  'Refunded',
];

const VALID_SORT_OPTIONS = ['newest', 'oldest', 'total-high', 'total-low'];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sanitizePhone = (value = '') => value.toString().replace(/\s+/g, '');

const getEstimatedDelivery = (createdAt) => {
  const orderDate = new Date(createdAt);
  const start = new Date(orderDate);
  start.setDate(orderDate.getDate() + 3);
  const end = new Date(orderDate);
  end.setDate(orderDate.getDate() + 5);

  return {
    start,
    end,
  };
};

const getNormalizedPaymentStatus = (paymentStatus, isPaid) => {
  if (paymentStatus && VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    return paymentStatus;
  }

  return isPaid ? 'Paid' : 'Unpaid';
};

const buildNormalizedShippingAddress = (payload = {}, fallbackUser = null) => {
  const normalized = normalizeAddressPayload(payload);
  const fallbackEmail = String(payload.email || fallbackUser?.email || '')
    .trim()
    .toLowerCase();
  const fullName = normalized.fullName || fallbackUser?.name || '';
  const phone = normalized.phone || fallbackUser?.phone || '';

  return {
    fullName,
    phone,
    email: fallbackEmail,
    address: normalized.addressLine1,
    addressLine1: normalized.addressLine1,
    addressLine2: normalized.addressLine2,
    city: normalized.city,
    state: normalized.state,
    postalCode: normalized.postalCode,
    country: normalized.country,
  };
};

const buildGuestCustomer = (shippingAddress = {}) => ({
  name: shippingAddress.fullName || '',
  email: String(shippingAddress.email || '').trim().toLowerCase(),
  phone: shippingAddress.phone || '',
  accessToken: crypto.randomBytes(24).toString('hex'),
});

const validateShippingAddress = (address) => {
  if (!address.fullName) {
    return 'Shipping full name is required';
  }

  if (!address.phone) {
    return 'Shipping phone number is required';
  }

  if (!address.email) {
    return 'Shipping email is required';
  }

  if (!address.addressLine1) {
    return 'Shipping address line 1 is required';
  }

  if (!address.city) {
    return 'Shipping city is required';
  }

  if (!address.state) {
    return 'Shipping state is required';
  }

  if (!address.postalCode) {
    return 'Shipping postal code is required';
  }

  if (!address.country) {
    return 'Shipping country is required';
  }

  return '';
};

const createHistoryEntry = ({ order, status, note, user }) => ({
  status: status || order.orderStatus || 'Processing',
  note,
  updatedAt: new Date(),
  updatedBy: user?._id,
  updatedByName: user?.name || user?.email || '',
});

const appendStatusHistory = (order, { status, note, user }) => {
  if (!note) {
    return;
  }

  const resolvedStatus = status || order.orderStatus || 'Processing';
  const resolvedUpdater = user?.name || user?.email || '';
  const lastEntry = order.statusHistory?.[order.statusHistory.length - 1];

  if (
    lastEntry &&
    String(lastEntry.status || '') === String(resolvedStatus) &&
    String(lastEntry.note || '') === String(note) &&
    String(lastEntry.updatedByName || '') === String(resolvedUpdater)
  ) {
    return;
  }

  order.statusHistory.push(createHistoryEntry({ order, status: resolvedStatus, note, user }));
};

const mapStatusHistory = (statusHistory = []) =>
  statusHistory.map((entry) => ({
    status: entry.status || 'Processing',
    note: entry.note || '',
    updatedAt: entry.updatedAt,
    updatedBy: entry.updatedBy || null,
    updatedByName: entry.updatedByName || '',
  }));

const getBusinessInfoForDocuments = () => ({
  name: process.env.BUSINESS_NAME || 'APEX LINK GROUP',
  email: process.env.BUSINESS_EMAIL || 'support@apexlinkgroup.com',
  phone: process.env.BUSINESS_PHONE || '+1 (555) 123-4567',
  address:
    process.env.BUSINESS_ADDRESS ||
    'One Apex Plaza, Suite 400, Global Trade District, San Francisco, CA 94110',
  website: process.env.BUSINESS_WEBSITE || process.env.FRONTEND_URL || 'http://localhost:5173',
});

const buildInvoicePayload = (order) => ({
  orderId: order._id,
  createdAt: order.createdAt,
  paidAt: order.paidAt || null,
  customer: {
    id: order.user?._id || order.user,
    name: order.user?.name || order.shippingAddress?.fullName || 'Valued Customer',
    email: order.user?.email || order.shippingAddress?.email || '',
    phone: order.user?.phone || order.shippingAddress?.phone || '',
  },
  shippingAddress: {
    fullName: order.shippingAddress?.fullName || order.user?.name || '',
    phone: order.shippingAddress?.phone || order.user?.phone || '',
    email: order.shippingAddress?.email || order.user?.email || '',
    addressLine1: order.shippingAddress?.addressLine1 || order.shippingAddress?.address || '',
    addressLine2: order.shippingAddress?.addressLine2 || '',
    city: order.shippingAddress?.city || '',
    state: order.shippingAddress?.state || '',
    postalCode: order.shippingAddress?.postalCode || '',
    country: order.shippingAddress?.country || '',
  },
  items: (order.orderItems || []).map((item) => ({
    name: item.name,
    qty: item.qty,
    price: item.price,
    image: item.image,
    product: item.product,
    lineTotal: Number(item.qty || 0) * Number(item.price || 0),
  })),
  totals: {
    subtotal: Number(order.itemsPrice || 0),
    shipping: Number(order.shippingPrice || 0),
    tax: Number(order.taxPrice || 0),
    discount: Number(order.discountPrice || 0),
    giftCard: Number(order.giftCardAmount || 0),
    total: Number(order.totalPrice || 0),
    currency: order.currency || 'LKR',
    taxBreakdown: order.taxBreakdown || [],
  },
  promotions: {
    couponCode: order.couponCode || '',
    giftCardCode: order.giftCardCode || '',
  },
  shippingRate: order.shippingRate || {},
  payment: {
    method: order.paymentMethod || '',
    provider: order.paymentProvider || 'Manual',
    status: getNormalizedPaymentStatus(order.paymentStatus, order.isPaid),
    paymentIntentId: order.paymentIntentId || '',
    paidAt: order.paidAt || null,
  },
  refund: {
    status: order.refundStatus || 'Not Refunded',
    refundedAmount: Number(order.refundedAmount || 0),
    history: order.refundHistory || [],
  },
  orderStatus: order.orderStatus || 'Processing',
  delivery: {
    isDelivered: Boolean(order.isDelivered),
    deliveredAt: order.deliveredAt || null,
    trackingNumber: order.trackingNumber || '',
    note: order.deliveryNote || '',
  },
  statusHistory: mapStatusHistory(order.statusHistory || []),
  business: getBusinessInfoForDocuments(),
});

const getOrderRecipient = (order) => order?.shippingAddress?.email || order?.user?.email || '';

const isOrderOwnerOrAdmin = (order, user) =>
  Boolean(
    user?.isAdmin ||
      hasPermission(user, 'orders:read') ||
      order.user?.toString?.() === user?._id?.toString?.()
  );

const isGuestOrderAccessor = (order, payload = {}) => {
  const email = String(payload.email || payload.guestEmail || '').trim().toLowerCase();
  const accessToken = String(payload.accessToken || payload.guestAccessToken || '').trim();
  const orderEmail = String(order?.guestCustomer?.email || order?.shippingAddress?.email || '').toLowerCase();

  return Boolean(
    order?.guestCheckout &&
      email &&
      email === orderEmail &&
      (!order.guestCustomer?.accessToken || accessToken === order.guestCustomer.accessToken)
  );
};

const buildOrderNotificationChanges = (previousOrder, nextOrder) => {
  const changes = [];

  if (previousOrder.orderStatus !== nextOrder.orderStatus) {
    changes.push(
      `Order status changed from ${previousOrder.orderStatus} to ${nextOrder.orderStatus}.`
    );
  }

  if (previousOrder.isDelivered !== nextOrder.isDelivered) {
    changes.push(
      nextOrder.isDelivered
        ? 'Order was marked as delivered.'
        : 'Delivery status was moved back to not delivered.'
    );
  }

  if ((previousOrder.trackingNumber || '') !== (nextOrder.trackingNumber || '')) {
    changes.push(
      nextOrder.trackingNumber
        ? `Tracking number updated to ${nextOrder.trackingNumber}.`
        : 'Tracking number was cleared.'
    );
  }

  if (previousOrder.isPaid !== nextOrder.isPaid) {
    changes.push(
      nextOrder.isPaid ? 'Payment was marked as paid.' : 'Payment was marked as unpaid.'
    );
  }

  return changes;
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    paymentProvider,
    couponCode = '',
    giftCardCode = '',
    shippingRateId = '',
    currency = '',
    saveAddress = false,
    setDefaultAddress = false,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({ message: 'No order items' });
  }

  try {
    const normalizedShippingAddress = buildNormalizedShippingAddress(
      shippingAddress,
      req.user
    );
    const shippingValidationError = validateShippingAddress(normalizedShippingAddress);

    if (shippingValidationError) {
      return res.status(400).json({ message: shippingValidationError });
    }

    const normalizedPaymentProvider =
      paymentProvider === 'Stripe' && isStripeConfigured() ? 'Stripe' : 'Manual';
    const normalizedPaymentMethod = String(
      paymentMethod || (normalizedPaymentProvider === 'Stripe' ? 'Card' : 'Development Placeholder')
    ).trim();
    const initialPaymentStatus =
      normalizedPaymentProvider === 'Stripe' ? 'Payment Pending' : 'Payment Pending';
    const pricing = await calculateOrderPricing({
      cartItems: orderItems,
      shippingAddress: normalizedShippingAddress,
      couponCode,
      giftCardCode,
      shippingRateId,
      currency,
    });
    const checkoutIntegrity = buildCheckoutIntegrity(pricing, req.body);

    const order = new Order({
      orderItems: pricing.orderItems,
      user: req.user._id,
      shippingAddress: normalizedShippingAddress,
      paymentMethod: normalizedPaymentMethod,
      paymentProvider: normalizedPaymentProvider,
      paymentStatus: initialPaymentStatus,
      currency: pricing.currency,
      exchangeRate: pricing.exchangeRate,
      couponCode: pricing.couponCode,
      giftCardCode: pricing.giftCardCode,
      itemsPrice: pricing.itemsPrice,
      taxPrice: pricing.taxPrice,
      shippingPrice: pricing.shippingPrice,
      discountPrice: pricing.discountPrice,
      giftCardAmount: pricing.giftCardAmount,
      totalPrice: pricing.totalPrice,
      taxBreakdown: pricing.taxBreakdown,
      shippingRate: pricing.shippingRate,
      checkoutIntegrity,
      statusHistory: [
        createHistoryEntry({
          order: { orderStatus: 'Processing' },
          status: 'Processing',
          note:
            normalizedPaymentProvider === 'Stripe'
              ? 'Order created and awaiting Stripe payment confirmation.'
              : 'Order created in development/manual payment mode.',
          user: req.user,
        }),
      ],
    });
    order.fraudRisk = await assessOrderFraud(order, req);

    await applyReservation({ order, actor: req.user });
    const createdOrder = await order.save();
    if (checkoutIntegrity.tamperDetected) {
      await recordFraudSignal(req, createdOrder, 'checkout.tamper.detected', order.fraudRisk);
    }
    await syncVendorOrdersForOrder(createdOrder);
    const populatedOrder = await Order.findById(createdOrder._id).populate(
      'user',
      'name email phone'
    );

    if (saveAddress) {
      const user = await User.findById(req.user._id);

      if (user) {
        await saveAddressToUser(
          user,
          {
            ...normalizedShippingAddress,
            isDefault: Boolean(setDefaultAddress),
          },
          {
            setDefault: Boolean(setDefaultAddress),
          }
        );
      }
    }

    if (normalizedPaymentProvider !== 'Stripe') {
      await sendOrderConfirmationEmail(populatedOrder);
    }

    await notifyOrderEvent(populatedOrder, 'order.created');
    await emitWebhookEvent('order.created', populatedOrder.toObject(), {
      resourceType: 'Order',
      resourceId: populatedOrder._id.toString(),
    });

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Unable to create order' });
  }
};

// @desc    Create new guest order
// @route   POST /api/orders/guest
// @access  Public
const addGuestOrderItems = async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod = 'Development Placeholder',
    couponCode = '',
    giftCardCode = '',
    shippingRateId = '',
    currency = '',
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({ message: 'No order items' });
  }

  try {
    const normalizedShippingAddress = buildNormalizedShippingAddress(shippingAddress, null);
    const shippingValidationError = validateShippingAddress(normalizedShippingAddress);

    if (shippingValidationError) {
      return res.status(400).json({ message: shippingValidationError });
    }

    const guestCustomer = buildGuestCustomer(normalizedShippingAddress);
    const pricing = await calculateOrderPricing({
      cartItems: orderItems,
      shippingAddress: normalizedShippingAddress,
      couponCode,
      giftCardCode,
      shippingRateId,
      currency,
    });
    const checkoutIntegrity = buildCheckoutIntegrity(pricing, req.body);

    const order = new Order({
      orderItems: pricing.orderItems,
      user: null,
      guestCheckout: true,
      guestCustomer,
      shippingAddress: normalizedShippingAddress,
      paymentMethod,
      paymentProvider: 'Manual',
      paymentStatus: 'Payment Pending',
      currency: pricing.currency,
      exchangeRate: pricing.exchangeRate,
      couponCode: pricing.couponCode,
      giftCardCode: pricing.giftCardCode,
      itemsPrice: pricing.itemsPrice,
      taxPrice: pricing.taxPrice,
      shippingPrice: pricing.shippingPrice,
      discountPrice: pricing.discountPrice,
      giftCardAmount: pricing.giftCardAmount,
      totalPrice: pricing.totalPrice,
      taxBreakdown: pricing.taxBreakdown,
      shippingRate: pricing.shippingRate,
      checkoutIntegrity,
      statusHistory: [
        createHistoryEntry({
          order: { orderStatus: 'Processing' },
          status: 'Processing',
          note: 'Guest order created and awaiting payment confirmation.',
          user: { name: guestCustomer.name, email: guestCustomer.email },
        }),
      ],
    });
    order.fraudRisk = await assessOrderFraud(order, req);

    await applyReservation({
      order,
      actor: { name: guestCustomer.name, email: guestCustomer.email },
    });
    const createdOrder = await order.save();
    if (checkoutIntegrity.tamperDetected) {
      await recordFraudSignal(req, createdOrder, 'checkout.tamper.detected', order.fraudRisk);
    }
    await syncVendorOrdersForOrder(createdOrder);
    await sendOrderConfirmationEmail(createdOrder);
    await notifyOrderEvent(createdOrder, 'order.created');
    await emitWebhookEvent('order.created', createdOrder.toObject(), {
      resourceType: 'Order',
      resourceId: createdOrder._id.toString(),
    });

    res.status(201).json({
      ...createdOrder.toObject(),
      guestAccessToken: guestCustomer.accessToken,
    });
  } catch (error) {
    console.error('[orderController:addGuestOrderItems]', error);
    res.status(400).json({ message: error.message || 'Unable to create guest order' });
  }
};

// @desc    Get all orders
// @route   GET /api/orders/admin/all
// @access  Private/Admin
const getOrders = async (req, res) => {
  try {
    const {
      search = '',
      status = '',
      payment = '',
      delivery = '',
      sort = 'newest',
      page = 1,
      limit = 10,
    } = req.query;

    if (status && !VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status filter' });
    }

    if (payment && !['paid', 'unpaid'].includes(payment)) {
      return res.status(400).json({ message: 'Invalid payment filter' });
    }

    if (delivery && !['delivered', 'not-delivered'].includes(delivery)) {
      return res.status(400).json({ message: 'Invalid delivery filter' });
    }

    if (sort && !VALID_SORT_OPTIONS.includes(sort)) {
      return res.status(400).json({ message: 'Invalid sort option' });
    }

    const requestedPage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 50);

    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const filters = [];

    if (status) {
      filters.push({ orderStatus: status });
    }

    if (payment) {
      filters.push({ isPaid: payment === 'paid' });
    }

    if (delivery) {
      filters.push({ isDelivered: delivery === 'delivered' });
    }

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      const safeSearch = escapeRegex(trimmedSearch);
      const searchRegex = new RegExp(safeSearch, 'i');

      filters.push({
        $or: [
          { 'user.name': searchRegex },
          { 'user.email': searchRegex },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: '$_id' },
                regex: safeSearch,
                options: 'i',
              },
            },
          },
        ],
      });
    }

    if (filters.length > 0) {
      pipeline.push({
        $match: {
          $and: filters,
        },
      });
    }

    const sortStage =
      sort === 'oldest'
        ? { createdAt: 1 }
        : sort === 'total-high'
          ? { totalPrice: -1, createdAt: -1 }
          : sort === 'total-low'
            ? { totalPrice: 1, createdAt: -1 }
            : { createdAt: -1 };

    const countPipeline = [...pipeline, { $count: 'totalOrders' }];
    const [{ totalOrders = 0 } = {}] = await Order.aggregate(countPipeline);

    const totalPages = Math.max(Math.ceil(totalOrders / perPage), 1);
    const currentPage = Math.min(requestedPage, totalPages);

    const orders = await Order.aggregate([
      ...pipeline,
      { $sort: sortStage },
      { $skip: (currentPage - 1) * perPage },
      { $limit: perPage },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          updatedAt: 1,
          orderItems: 1,
          shippingAddress: 1,
          paymentMethod: 1,
          paymentProvider: 1,
          paymentIntentId: 1,
          paymentStatus: {
            $ifNull: ['$paymentStatus', { $cond: ['$isPaid', 'Paid', 'Unpaid'] }],
          },
          itemsPrice: 1,
          taxPrice: 1,
          shippingPrice: 1,
          totalPrice: 1,
          isPaid: 1,
          paidAt: 1,
          isDelivered: 1,
          deliveredAt: 1,
          orderStatus: 1,
          trackingNumber: 1,
          deliveryNote: 1,
          user: {
            _id: '$user._id',
            id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            phone: '$user.phone',
          },
        },
      },
    ]);

    res.json({
      orders,
      currentPage,
      totalPages,
      totalOrders,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!isOrderOwnerOrAdmin(order, req.user)) {
      return res.status(401).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Mark order as paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const markOrderAsPaid = async (req, res) => {
  const { paymentIntentId = '' } = req.body;

  try {
    if (!isStripeConfigured()) {
      return res.status(400).json({ message: 'Stripe payment is not configured for this environment' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!isOrderOwnerOrAdmin(order, req.user)) {
      return res.status(401).json({ message: 'Not authorized to pay for this order' });
    }

    if (order.isPaid) {
      const populatedOrder = await Order.findById(order._id).populate('user', 'name email phone');
      return res.json(populatedOrder);
    }

    const intentId = String(paymentIntentId || order.paymentIntentId || '').trim();

    if (!intentId) {
      return res.status(400).json({ message: 'Payment intent ID is required' });
    }

    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(intentId, {
      expand: ['latest_charge'],
    });

    if (!paymentIntent || paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment has not been completed successfully' });
    }

    if (paymentIntent.metadata?.orderId !== order._id.toString()) {
      return res.status(400).json({ message: 'Payment intent does not match this order' });
    }

    if (Number(paymentIntent.amount || 0) !== toStripeAmount(order.totalPrice)) {
      return res.status(400).json({ message: 'Payment amount does not match this order total' });
    }

    await applySuccessfulPaymentToOrder({
      order,
      paymentIntent,
      actor: req.user,
      source: 'confirmation',
    });

    order.paymentResult = {
      ...order.paymentResult,
      ...buildSafePaymentResult(paymentIntent),
    };
    order.paymentProvider = 'Stripe';
    order.paymentIntentId = paymentIntent.id;
    await deductReservedInventory({ order, actor: req.user });
    await commitPromotionsForOrder(order);
    await awardOrderLoyaltyPoints(order, req.user);

    const updatedOrder = await order.save();
    await syncVendorOrdersForOrder(updatedOrder);
    const populatedOrder = await Order.findById(updatedOrder._id).populate(
      'user',
      'name email phone'
    );
    await notifyOrderEvent(populatedOrder, 'order.paid');
    await emitWebhookEvent('order.paid', populatedOrder.toObject(), {
      resourceType: 'Order',
      resourceId: populatedOrder._id.toString(),
    });

    res.json(populatedOrder);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error('[orderController:markOrderAsPaid]', error);
    res.status(500).json({ message: 'Unable to confirm payment right now' });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const previousState = {
      orderStatus: order.orderStatus,
      isPaid: order.isPaid,
      isDelivered: order.isDelivered,
      trackingNumber: order.trackingNumber || '',
    };

    const {
      orderStatus,
      isPaid,
      paidAt,
      isDelivered,
      deliveredAt,
      trackingNumber,
      courierName,
      trackingUrl,
      deliveryNote,
      paymentStatus,
    } = req.body;

    if (orderStatus !== undefined) {
      if (!VALID_ORDER_STATUSES.includes(orderStatus)) {
        return res.status(400).json({ message: 'Invalid order status' });
      }

      order.orderStatus = orderStatus;

      if (orderStatus === 'Cancelled') {
        await releaseReservedInventory({
          order,
          actor: req.user,
          note: `Released reservation after order was cancelled by ${req.user.name || req.user.email}.`,
        });
      }
    }

    if (trackingNumber !== undefined) {
      order.trackingNumber = String(trackingNumber).trim();
    }

    if (courierName !== undefined) {
      order.courierName = String(courierName).trim();
    }

    if (trackingUrl !== undefined) {
      order.trackingUrl = String(trackingUrl).trim();
    }

    if (deliveryNote !== undefined) {
      order.deliveryNote = String(deliveryNote).trim();
    }

    if (paymentStatus !== undefined) {
      if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }

      order.paymentStatus = paymentStatus;
    }

    if (isPaid !== undefined) {
      if (typeof isPaid !== 'boolean') {
        return res.status(400).json({ message: 'Invalid payment status value' });
      }

      order.isPaid = isPaid;

      if (isPaid) {
        if (paidAt !== undefined && paidAt !== null && Number.isNaN(new Date(paidAt).getTime())) {
          return res.status(400).json({ message: 'Invalid paid date' });
        }

        order.paidAt = paidAt ? new Date(paidAt) : order.paidAt || new Date();
        order.paymentStatus = 'Paid';
        if (!previousState.isPaid) {
          await deductReservedInventory({ order, actor: req.user });
          await commitPromotionsForOrder(order);
          await awardOrderLoyaltyPoints(order, req.user);
        }
      } else {
        order.paidAt = undefined;
        order.paymentStatus =
          order.paymentStatus === 'Refunded' ? 'Refunded' : 'Unpaid';
      }
    } else if (paidAt !== undefined) {
      if (paidAt !== null && Number.isNaN(new Date(paidAt).getTime())) {
        return res.status(400).json({ message: 'Invalid paid date' });
      }

      order.paidAt = paidAt ? new Date(paidAt) : undefined;
    }

    if (isDelivered !== undefined) {
      if (typeof isDelivered !== 'boolean') {
        return res.status(400).json({ message: 'Invalid delivery status value' });
      }

      order.isDelivered = isDelivered;

      if (isDelivered) {
        if (
          deliveredAt !== undefined &&
          deliveredAt !== null &&
          Number.isNaN(new Date(deliveredAt).getTime())
        ) {
          return res.status(400).json({ message: 'Invalid delivery date' });
        }

        order.deliveredAt = deliveredAt ? new Date(deliveredAt) : order.deliveredAt || new Date();

        if (orderStatus === undefined) {
          order.orderStatus = 'Delivered';
        }
      } else {
        order.deliveredAt = undefined;

        if (orderStatus === undefined && order.orderStatus === 'Delivered') {
          order.orderStatus = 'Processing';
        }
      }
    } else if (deliveredAt !== undefined) {
      if (deliveredAt !== null && Number.isNaN(new Date(deliveredAt).getTime())) {
        return res.status(400).json({ message: 'Invalid delivery date' });
      }

      order.deliveredAt = deliveredAt ? new Date(deliveredAt) : undefined;
    }

    const changes = buildOrderNotificationChanges(previousState, order);

    if (changes.length > 0) {
      appendStatusHistory(order, {
        status: order.orderStatus,
        note: changes.join(' '),
        user: req.user,
      });
    }

    const updatedOrder = await order.save();
    await syncVendorOrdersForOrder(updatedOrder);
    await recordAuditLog(req, 'orders.status.update', 'Order', updatedOrder._id, {
      previousState,
      orderStatus: updatedOrder.orderStatus,
      paymentStatus: updatedOrder.paymentStatus,
      isDelivered: updatedOrder.isDelivered,
      isPaid: updatedOrder.isPaid,
    });
    const populatedOrder = await Order.findById(updatedOrder._id).populate('user', 'name email phone');

    if (
      previousState.orderStatus !== updatedOrder.orderStatus ||
      previousState.isDelivered !== updatedOrder.isDelivered ||
      previousState.trackingNumber !== (updatedOrder.trackingNumber || '') ||
      previousState.isPaid !== updatedOrder.isPaid
    ) {
      await maybeSendStatusEmail(populatedOrder, createStatusEmailKey(populatedOrder));
    }
    await notifyOrderEvent(populatedOrder, 'order.status.updated');
    await emitWebhookEvent('order.status.updated', populatedOrder.toObject(), {
      resourceType: 'Order',
      resourceId: populatedOrder._id.toString(),
    });

    res.json(populatedOrder);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ message: Object.values(error.errors)[0]?.message || 'Invalid order update' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Track order with limited public details
// @route   POST /api/orders/track
// @access  Public/Auth optional
const trackOrder = async (req, res) => {
  const { orderId = '', email = '', phone = '' } = req.body;

  try {
    const trimmedOrderId = String(orderId).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = sanitizePhone(phone);

    if (!trimmedOrderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    if (!normalizedEmail && !normalizedPhone) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    const order = await Order.findById(trimmedOrderId).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Tracking details not found' });
    }

    const ownerEmail = order.user?.email?.toLowerCase?.() || '';
    const ownerPhone = sanitizePhone(order.user?.phone || '');
    const matchesEmail = normalizedEmail && normalizedEmail === ownerEmail;
    const matchesPhone = normalizedPhone && normalizedPhone === ownerPhone;
    const isAuthorizedUser =
      req.user?.isAdmin ||
      hasPermission(req.user, 'orders:read') ||
      req.user?._id?.toString?.() === order.user?._id?.toString?.() ||
      matchesEmail ||
      matchesPhone;

    if (!isAuthorizedUser) {
      return res.status(404).json({ message: 'Tracking details not found' });
    }

    const estimatedDelivery = getEstimatedDelivery(order.createdAt);

    res.json({
      _id: order._id,
      orderStatus: order.orderStatus || 'Processing',
      paymentStatus: getNormalizedPaymentStatus(order.paymentStatus, order.isPaid),
      paymentMethod: order.paymentMethod || '',
      paymentProvider: order.paymentProvider || '',
      refundedAmount: Number(order.refundedAmount || 0),
      refundStatus: order.refundStatus || 'Not Refunded',
      isPaid: order.isPaid,
      isDelivered: order.isDelivered,
      trackingNumber: order.trackingNumber || '',
      courierName: order.courierName || '',
      trackingUrl: order.trackingUrl || '',
      deliveryNote: order.deliveryNote || '',
      shippingAddress: {
        fullName: order.shippingAddress?.fullName || order.user?.name || '',
        phone: order.shippingAddress?.phone || order.user?.phone || '',
        email: order.shippingAddress?.email || order.user?.email || '',
        addressLine1:
          order.shippingAddress?.addressLine1 || order.shippingAddress?.address || '',
        addressLine2: order.shippingAddress?.addressLine2 || '',
        city: order.shippingAddress?.city || '',
        state: order.shippingAddress?.state || '',
        postalCode: order.shippingAddress?.postalCode || '',
        country: order.shippingAddress?.country || '',
      },
      estimatedDelivery,
      createdAt: order.createdAt,
      currency: order.currency || 'LKR',
      totalPrice: order.totalPrice,
      itemsPrice: order.itemsPrice,
      shippingPrice: order.shippingPrice,
      taxPrice: order.taxPrice,
      discountPrice: order.discountPrice || 0,
      giftCardAmount: order.giftCardAmount || 0,
      shippingRate: order.shippingRate || {},
      statusHistory: mapStatusHistory(order.statusHistory || []),
      shipmentUpdates: order.shipmentUpdates || [],
      cancellationRequests: order.cancellationRequests || [],
      items: order.orderItems.map((item) => ({
        name: item.name,
        qty: item.qty,
        image: item.image,
        price: item.price,
      })),
      canViewFullDetails:
        Boolean(req.user) &&
        (req.user.isAdmin ||
          hasPermission(req.user, 'orders:read') ||
          req.user._id.toString() === order.user?._id?.toString?.()),
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Tracking details not found' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get invoice JSON payload
// @route   GET /api/orders/:id/invoice
// @access  Private (Owner/Admin)
const getOrderInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!isOrderOwnerOrAdmin(order, req.user)) {
      return res.status(401).json({ message: 'Not authorized to access this invoice' });
    }

    res.json(buildInvoicePayload(order));
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error('[orderController:getOrderInvoice]', error);
    res.status(500).json({ message: 'Unable to build invoice right now' });
  }
};

// @desc    Get admin packing slip payload
// @route   GET /api/orders/:id/packing-slip
// @access  Private/Admin
const getOrderPackingSlip = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const invoicePayload = buildInvoicePayload(order);

    res.json({
      orderId: invoicePayload.orderId,
      createdAt: invoicePayload.createdAt,
      orderStatus: invoicePayload.orderStatus,
      trackingNumber: invoicePayload.delivery.trackingNumber,
      deliveryNote: invoicePayload.delivery.note,
      customer: invoicePayload.customer,
      shippingAddress: invoicePayload.shippingAddress,
      items: invoicePayload.items.map((item) => ({
        name: item.name,
        qty: item.qty,
        image: item.image,
        product: item.product,
      })),
      business: invoicePayload.business,
      statusHistory: invoicePayload.statusHistory,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error('[orderController:getOrderPackingSlip]', error);
    res.status(500).json({ message: 'Unable to build packing slip right now' });
  }
};

// @desc    Quote server-side totals before creating an order
// @route   POST /api/orders/quote
// @access  Private
const quoteOrder = async (req, res) => {
  const {
    orderItems = [],
    shippingAddress = {},
    couponCode = '',
    giftCardCode = '',
    shippingRateId = '',
    currency = '',
  } = req.body;

  try {
    const normalizedShippingAddress = buildNormalizedShippingAddress(shippingAddress, req.user);
    const shippingValidationError = validateShippingAddress(normalizedShippingAddress);

    if (shippingValidationError) {
      return res.status(400).json({ message: shippingValidationError });
    }

    const quote = await calculateOrderPricing({
      cartItems: orderItems,
      shippingAddress: normalizedShippingAddress,
      couponCode,
      giftCardCode,
      shippingRateId,
      currency,
    });

    res.json(quote);
  } catch (error) {
    console.error('[orderController:quoteOrder]', error);
    res.status(400).json({ message: error.message || 'Unable to quote order right now' });
  }
};

// @desc    Get real-time configured shipping rates for a cart/address
// @route   POST /api/orders/shipping-rates
// @access  Private
const getOrderShippingRates = async (req, res) => {
  const { orderItems = [], shippingAddress = {}, currency = '' } = req.body;

  try {
    const normalizedShippingAddress = buildNormalizedShippingAddress(shippingAddress, req.user);
    const quote = await calculateOrderPricing({
      cartItems: orderItems,
      shippingAddress: normalizedShippingAddress,
      currency,
    });
    const rates = await getShippingOptions({
      shippingAddress: normalizedShippingAddress,
      subtotal: quote.itemsPrice / (quote.exchangeRate || 1),
      currency: quote.currency,
    });

    res.json(rates);
  } catch (error) {
    console.error('[orderController:getOrderShippingRates]', error);
    res.status(400).json({ message: error.message || 'Unable to load shipping rates right now' });
  }
};

// @desc    Request order cancellation
// @route   POST /api/orders/:id/cancellation-requests
// @access  Private or guest token/email
const createCancellationRequest = async (req, res) => {
  const reason = String(req.body.reason || '').trim();

  if (!reason) {
    return res.status(400).json({ message: 'Cancellation reason is required' });
  }

  try {
    const order = await Order.findById(req.params.id).select('+guestCustomer.accessToken');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const authorized =
      isOrderOwnerOrAdmin(order, req.user) ||
      isGuestOrderAccessor(order, {
        email: req.body.email,
        guestAccessToken: req.body.guestAccessToken,
      });

    if (!authorized) {
      return res.status(401).json({ message: 'Not authorized to request cancellation for this order' });
    }

    if (['Delivered', 'Cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({ message: 'This order cannot be cancelled from its current status' });
    }

    order.cancellationRequests.push({
      requestedBy: req.user?._id || null,
      requesterName: req.user?.name || order.guestCustomer?.name || order.shippingAddress?.fullName || '',
      requesterEmail: req.user?.email || order.guestCustomer?.email || order.shippingAddress?.email || '',
      reason,
      status: 'Pending',
    });
    const savedOrder = await order.save();

    res.status(201).json(savedOrder.cancellationRequests[savedOrder.cancellationRequests.length - 1]);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error('[orderController:createCancellationRequest]', error);
    res.status(500).json({ message: 'Unable to create cancellation request' });
  }
};

// @desc    Review cancellation request
// @route   PUT /api/orders/:id/cancellation-requests/:requestId
// @access  Private/Admin staff
const reviewCancellationRequest = async (req, res) => {
  const { status = '', adminNote = '' } = req.body;

  if (!['Approved', 'Rejected', 'Cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid cancellation review status' });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const cancellationRequest = order.cancellationRequests.id(req.params.requestId);

  if (!cancellationRequest) {
    return res.status(404).json({ message: 'Cancellation request not found' });
  }

  cancellationRequest.status = status;
  cancellationRequest.adminNote = String(adminNote || '').trim();
  cancellationRequest.reviewedAt = new Date();
  cancellationRequest.reviewedBy = req.user._id;
  cancellationRequest.reviewedByName = req.user.name || req.user.email || 'Admin';

  if (status === 'Approved') {
    order.orderStatus = 'Cancelled';
    order.paymentStatus = order.isPaid ? order.paymentStatus : 'Cancelled';
    await releaseReservedInventory({
      order,
      actor: req.user,
      note: `Released reservation after cancellation request was approved by ${req.user.name || req.user.email}.`,
    });
  }

  const savedOrder = await order.save();
  await syncVendorOrdersForOrder(savedOrder);
  await recordAuditLog(req, 'orders.cancellation.review', 'Order', savedOrder._id, {
    cancellationRequestId: req.params.requestId,
    status,
  });
  await notifyOrderEvent(savedOrder, 'order.cancellation.reviewed', {
    message: `Your cancellation request was ${status.toLowerCase()}.`,
  });
  await emitWebhookEvent('order.cancellation.reviewed', savedOrder.toObject(), {
    resourceType: 'Order',
    resourceId: savedOrder._id.toString(),
  });

  res.json(savedOrder);
};

// @desc    Add courier shipment update
// @route   POST /api/orders/:id/shipment-updates
// @access  Private/Admin staff
const addShipmentUpdate = async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const update = {
    courier: String(req.body.courier || req.body.courierName || order.courierName || '').trim(),
    trackingNumber: String(req.body.trackingNumber || order.trackingNumber || '').trim(),
    status: String(req.body.status || order.orderStatus || '').trim(),
    location: String(req.body.location || '').trim(),
    message: String(req.body.message || '').trim(),
    trackingUrl: String(req.body.trackingUrl || order.trackingUrl || '').trim(),
    occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
    createdBy: req.user._id,
    createdByName: req.user.name || req.user.email || 'Admin',
  };

  order.courierName = update.courier || order.courierName;
  order.trackingNumber = update.trackingNumber || order.trackingNumber;
  order.trackingUrl = update.trackingUrl || order.trackingUrl;
  order.shipmentUpdates.push(update);

  if (update.status && VALID_ORDER_STATUSES.includes(update.status)) {
    order.orderStatus = update.status;
  }

  const savedOrder = await order.save();
  await syncVendorOrdersForOrder(savedOrder);
  await recordAuditLog(req, 'orders.shipment.update', 'Order', savedOrder._id, update);
  await notifyOrderEvent(savedOrder, 'order.shipment.updated', {
    message: update.message || `Shipment status updated to ${update.status || savedOrder.orderStatus}.`,
  });
  await emitWebhookEvent(
    'order.shipment.updated',
    { order: savedOrder.toObject(), shipmentUpdate: update },
    {
      resourceType: 'Order',
      resourceId: savedOrder._id.toString(),
    }
  );

  res.status(201).json(savedOrder);
};

export {
  addOrderItems,
  addGuestOrderItems,
  addShipmentUpdate,
  createCancellationRequest,
  getOrders,
  getOrderById,
  getMyOrders,
  markOrderAsPaid,
  updateOrderStatus,
  trackOrder,
  getOrderInvoice,
  getOrderPackingSlip,
  quoteOrder,
  reviewCancellationRequest,
  getOrderShippingRates,
};
