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
      required: true,
      ref: 'User',
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
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
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
    deliveryNote: {
      type: String,
      default: '',
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
