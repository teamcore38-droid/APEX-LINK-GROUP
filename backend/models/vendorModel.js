import mongoose from 'mongoose';

const vendorDocumentSchema = mongoose.Schema(
  {
    label: { type: String, default: '', trim: true },
    url: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Pending',
    },
    note: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

const vendorSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    contactName: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    website: { type: String, default: '', trim: true },
    businessType: { type: String, default: '', trim: true },
    taxId: { type: String, default: '', trim: true },
    registrationNumber: { type: String, default: '', trim: true },
    addressLine1: { type: String, default: '', trim: true },
    addressLine2: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    postalCode: { type: String, default: '', trim: true },
    country: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Under Review', 'Verified', 'Rejected', 'Suspended'],
      default: 'Draft',
    },
    documents: { type: [vendorDocumentSchema], default: [] },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedByName: { type: String, default: '', trim: true },
    reviewNote: { type: String, default: '', trim: true },
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    payoutMethod: { type: String, default: '', trim: true },
    payoutEmail: { type: String, default: '', trim: true },
    bankName: { type: String, default: '', trim: true },
    accountLast4: { type: String, default: '', trim: true },
    metrics: {
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalCommission: { type: Number, default: 0 },
      totalPayouts: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

vendorSchema.index({ status: 1, businessName: 1 });

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;
