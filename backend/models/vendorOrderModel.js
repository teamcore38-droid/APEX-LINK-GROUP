import mongoose from 'mongoose';

const vendorOrderItemSchema = mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: '', trim: true },
    qty: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, default: 0, min: 0, max: 100 },
    commissionAmount: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const vendorOrderSchema = mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    currency: { type: String, default: 'LKR', uppercase: true, trim: true },
    orderStatus: { type: String, default: 'Processing', trim: true },
    paymentStatus: { type: String, default: 'Payment Pending', trim: true },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    items: { type: [vendorOrderItemSchema], default: [] },
    subtotal: { type: Number, default: 0, min: 0 },
    commissionTotal: { type: Number, default: 0, min: 0 },
    netTotal: { type: Number, default: 0, min: 0 },
    payoutStatus: {
      type: String,
      enum: ['Pending', 'Eligible', 'Paid', 'On Hold', 'Cancelled', 'Refunded'],
      default: 'Pending',
    },
    payout: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorPayout', default: null },
  },
  { timestamps: true }
);

vendorOrderSchema.index({ order: 1, vendor: 1 }, { unique: true });
vendorOrderSchema.index({ vendor: 1, createdAt: -1 });
vendorOrderSchema.index({ payoutStatus: 1, isPaid: 1 });

const VendorOrder = mongoose.model('VendorOrder', vendorOrderSchema);

export default VendorOrder;
