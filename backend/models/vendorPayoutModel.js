import mongoose from 'mongoose';

const vendorPayoutSchema = mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    vendorOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' }],
    currency: { type: String, default: 'LKR', uppercase: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    grossAmount: { type: Number, default: 0, min: 0 },
    commissionTotal: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Paid', 'Failed', 'Cancelled'],
      default: 'Pending',
    },
    method: { type: String, default: '', trim: true },
    reference: { type: String, default: '', trim: true },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    requestedAt: { type: Date, default: Date.now },
    paidAt: { type: Date },
    note: { type: String, default: '', trim: true },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedByName: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

vendorPayoutSchema.index({ vendor: 1, createdAt: -1 });
vendorPayoutSchema.index({ status: 1, createdAt: -1 });

const VendorPayout = mongoose.model('VendorPayout', vendorPayoutSchema);

export default VendorPayout;
