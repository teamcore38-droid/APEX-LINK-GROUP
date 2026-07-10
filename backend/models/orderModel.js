import mongoose from 'mongoose';

const ORDER_STATUS_VALUES = [
  'Processing',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const PAYMENT_STATUS_VALUES = [
  'Paid',
  'Unpaid',
  'Payment Pending',
  'Payment Failed',
  'Payment Cancelled',
  'Cancelled',
  'Refunded',
];

const REFUND_STATUS_VALUES = [
  'Not Refunded',
  'Partially Refunded',
  'Refunded',
  'Refund Failed',
];

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    guestCheckout: {
      type: Boolean,
      default: false,
    },
    guestCustomer: {
      name: { type: String, default: '', trim: true },
      email: { type: String, default: '', trim: true, lowercase: true },
      phone: { type: String, default: '', trim: true },
      accessToken: { type: String, default: '', select: false },
    },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
        vendor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vendor',
          default: null,
        },
        vendorName: { type: String, default: '' },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        variantLabel: { type: String, default: '' },
        sku: { type: String, default: '' },
        commissionRate: { type: Number, default: 0 },
        commissionAmount: { type: Number, default: 0 },
        vendorNetAmount: { type: Number, default: 0 },
      },
    ],
    shippingAddress: {
      fullName: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
      addressLine1: { type: String, default: '' },
      addressLine2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      default: 'LKR',
      uppercase: true,
      trim: true,
    },
    exchangeRate: {
      type: Number,
      default: 1,
      min: 0,
    },
    couponCode: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    giftCardCode: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    paymentProvider: {
      type: String,
      default: 'Manual',
    },
    paymentIntentId: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS_VALUES,
      default: 'Payment Pending',
    },
    checkoutIntegrity: {
      clientReportedTotal: { type: Number, default: null },
      serverCalculatedTotal: { type: Number, default: 0 },
      tamperDetected: { type: Boolean, default: false },
      tamperReasons: { type: [String], default: [] },
      checkedAt: { type: Date },
    },
    fraudRisk: {
      score: { type: Number, default: 0 },
      level: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low',
      },
      reasons: { type: [String], default: [] },
      checkedAt: { type: Date },
      paymentBlockedAt: { type: Date },
    },
    paymentResult: {
      id: { type: String, default: '' },
      status: { type: String, default: '' },
      amountReceived: { type: Number, default: 0 },
      currency: { type: String, default: '' },
      chargeId: { type: String, default: '' },
      paymentMethodType: { type: String, default: '' },
      receiptEmail: { type: String, default: '' },
      created: { type: Date },
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: REFUND_STATUS_VALUES,
      default: 'Not Refunded',
    },
    refundHistory: [
      {
        refundId: { type: String, default: '' },
        amount: { type: Number, default: 0 },
        currency: { type: String, default: '' },
        status: { type: String, default: '' },
        reason: { type: String, default: '' },
        receiptNumber: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
        processedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        processedByName: { type: String, default: '' },
        source: { type: String, default: 'system' },
      },
    ],
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    discountPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    giftCardAmount: {
      type: Number,
      required: true,
      default: 0.0,
    },
    promotionsCommittedAt: {
      type: Date,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    taxBreakdown: [
      {
        label: { type: String, default: 'Sales Tax' },
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],
    shippingRate: {
      carrier: { type: String, default: '' },
      service: { type: String, default: '' },
      estimatedDaysMin: { type: Number, default: 0 },
      estimatedDaysMax: { type: Number, default: 0 },
    },
    inventoryStatus: {
      type: String,
      enum: ['Not Reserved', 'Reserved', 'Deducted', 'Released'],
      default: 'Not Reserved',
    },
    inventoryEventsAppliedAt: {
      reservedAt: { type: Date },
      deductedAt: { type: Date },
      releasedAt: { type: Date },
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ORDER_STATUS_VALUES,
      default: 'Processing',
    },
    trackingNumber: {
      type: String,
      default: '',
    },
    courierName: {
      type: String,
      default: '',
      trim: true,
    },
    trackingUrl: {
      type: String,
      default: '',
      trim: true,
    },
    deliveryNote: {
      type: String,
      default: '',
    },
    shipmentUpdates: [
      {
        courier: { type: String, default: '', trim: true },
        trackingNumber: { type: String, default: '', trim: true },
        status: { type: String, default: '', trim: true },
        location: { type: String, default: '', trim: true },
        message: { type: String, default: '', trim: true },
        trackingUrl: { type: String, default: '', trim: true },
        occurredAt: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdByName: { type: String, default: '', trim: true },
      },
    ],
    cancellationRequests: [
      {
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        requesterName: { type: String, default: '', trim: true },
        requesterEmail: { type: String, default: '', trim: true, lowercase: true },
        reason: { type: String, required: true, trim: true },
        status: {
          type: String,
          enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
          default: 'Pending',
        },
        adminNote: { type: String, default: '', trim: true },
        reviewedAt: { type: Date },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedByName: { type: String, default: '', trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    loyaltyPointsAwarded: {
      type: Number,
      default: 0,
    },
    loyaltyPointsAwardedAt: {
      type: Date,
    },
    statusHistory: [
      {
        status: {
          type: String,
          default: 'Processing',
        },
        note: {
          type: String,
          default: '',
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        updatedByName: {
          type: String,
          default: '',
        },
      },
    ],
    notifications: {
      orderConfirmationSentAt: { type: Date },
      paymentFailedSentAt: { type: Date },
      invoiceSentAt: { type: Date },
      lastStatusEmailKey: { type: String, default: '' },
      refundEmailEventIds: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
