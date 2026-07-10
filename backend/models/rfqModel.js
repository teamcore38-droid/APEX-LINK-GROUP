import mongoose from 'mongoose';

const rfqQuoteSchema = mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    vendorName: { type: String, default: '', trim: true },
    amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'LKR', uppercase: true, trim: true },
    leadTimeDays: { type: Number, default: 0, min: 0 },
    message: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['Submitted', 'Accepted', 'Rejected'],
      default: 'Submitted',
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const rfqSchema = mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    buyerName: { type: String, default: '', trim: true },
    buyerEmail: { type: String, default: '', trim: true, lowercase: true },
    company: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    category: { type: String, default: '', trim: true },
    productInterest: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    targetCurrency: { type: String, default: 'LKR', uppercase: true, trim: true },
    targetBudget: { type: Number, default: 0, min: 0 },
    deliveryCountry: { type: String, default: '', trim: true },
    deliveryCity: { type: String, default: '', trim: true },
    message: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['New', 'Sent to Vendors', 'Quoted', 'Negotiating', 'Accepted', 'Closed', 'Rejected'],
      default: 'New',
    },
    assignedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    quotes: { type: [rfqQuoteSchema], default: [] },
    adminNote: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

rfqSchema.index({ buyer: 1, createdAt: -1 });
rfqSchema.index({ assignedVendors: 1, status: 1 });
rfqSchema.index({ status: 1, createdAt: -1 });

const RFQ = mongoose.model('RFQ', rfqSchema);

export default RFQ;
