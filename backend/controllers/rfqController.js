import mongoose from 'mongoose';
import RFQ from '../models/rfqModel.js';
import Vendor from '../models/vendorModel.js';

const getBuyerRfqs = async (req, res) => {
  const rfqs = await RFQ.find({ buyer: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json(rfqs);
};

const createRfq = async (req, res) => {
  const productInterest = String(req.body.productInterest || '').trim();

  if (!productInterest) {
    return res.status(400).json({ message: 'Product or requirement is required' });
  }

  const rfq = await RFQ.create({
    buyer: req.user._id,
    buyerName: String(req.body.buyerName || req.user.name || '').trim(),
    buyerEmail: String(req.body.buyerEmail || req.user.email || '').trim().toLowerCase(),
    company: String(req.body.company || '').trim(),
    phone: String(req.body.phone || req.user.phone || '').trim(),
    category: String(req.body.category || '').trim(),
    productInterest,
    quantity: Math.max(Number.parseInt(req.body.quantity, 10) || 1, 1),
    targetCurrency: String(req.body.targetCurrency || 'LKR').trim().toUpperCase(),
    targetBudget: Math.max(Number(req.body.targetBudget || 0), 0),
    deliveryCountry: String(req.body.deliveryCountry || '').trim(),
    deliveryCity: String(req.body.deliveryCity || '').trim(),
    message: String(req.body.message || '').trim(),
  });

  res.status(201).json(rfq);
};

const getAdminRfqs = async (_req, res) => {
  const rfqs = await RFQ.find({})
    .populate('buyer', 'name email phone')
    .populate('assignedVendors', 'businessName slug status')
    .populate('quotes.vendor', 'businessName slug status')
    .sort({ createdAt: -1 })
    .limit(200);

  res.json(rfqs);
};

const updateAdminRfq = async (req, res) => {
  const rfq = await RFQ.findById(req.params.id);

  if (!rfq) {
    return res.status(404).json({ message: 'RFQ not found' });
  }

  const { status, assignedVendorIds = [], adminNote = '' } = req.body;

  if (
    status !== undefined &&
    !['New', 'Sent to Vendors', 'Quoted', 'Negotiating', 'Accepted', 'Closed', 'Rejected'].includes(status)
  ) {
    return res.status(400).json({ message: 'Invalid RFQ status' });
  }

  if (Array.isArray(assignedVendorIds)) {
    const validVendorIds = assignedVendorIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const vendors = await Vendor.find({
      _id: { $in: validVendorIds },
      status: 'Verified',
    }).select('_id');
    rfq.assignedVendors = vendors.map((vendor) => vendor._id);

    if (vendors.length > 0 && (!status || rfq.status === 'New')) {
      rfq.status = 'Sent to Vendors';
    }
  }

  if (status !== undefined) {
    rfq.status = status;
  }

  if (adminNote !== undefined) {
    rfq.adminNote = String(adminNote || '').trim();
  }

  const savedRfq = await rfq.save();
  res.json(
    await savedRfq.populate([
      { path: 'buyer', select: 'name email phone' },
      { path: 'assignedVendors', select: 'businessName slug status' },
      { path: 'quotes.vendor', select: 'businessName slug status' },
    ])
  );
};

const getVendorRfqs = async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    return res.json([]);
  }

  const rfqs = await RFQ.find({
    assignedVendors: vendor._id,
    status: { $nin: ['Closed', 'Rejected'] },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json(rfqs);
};

const submitVendorQuote = async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor || vendor.status !== 'Verified') {
    return res.status(403).json({ message: 'Verified vendor access is required' });
  }

  const rfq = await RFQ.findOne({
    _id: req.params.id,
    assignedVendors: vendor._id,
  });

  if (!rfq) {
    return res.status(404).json({ message: 'RFQ not found for this vendor' });
  }

  const amount = Number(req.body.amount || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Quote amount must be greater than zero' });
  }

  const existingQuote = rfq.quotes.find(
    (quote) => quote.vendor.toString() === vendor._id.toString()
  );

  if (existingQuote) {
    existingQuote.amount = amount;
    existingQuote.currency = String(req.body.currency || rfq.targetCurrency || 'LKR').toUpperCase();
    existingQuote.leadTimeDays = Math.max(Number.parseInt(req.body.leadTimeDays, 10) || 0, 0);
    existingQuote.message = String(req.body.message || '').trim();
    existingQuote.status = 'Submitted';
    existingQuote.createdAt = new Date();
  } else {
    rfq.quotes.push({
      vendor: vendor._id,
      vendorName: vendor.businessName,
      amount,
      currency: String(req.body.currency || rfq.targetCurrency || 'LKR').toUpperCase(),
      leadTimeDays: Math.max(Number.parseInt(req.body.leadTimeDays, 10) || 0, 0),
      message: String(req.body.message || '').trim(),
    });
  }

  rfq.status = 'Quoted';
  await rfq.save();

  res.json(rfq);
};

const acceptRfqQuote = async (req, res) => {
  const rfq = await RFQ.findOne({ _id: req.params.id, buyer: req.user._id });

  if (!rfq) {
    return res.status(404).json({ message: 'RFQ not found' });
  }

  const quote = rfq.quotes.id(req.params.quoteId);

  if (!quote) {
    return res.status(404).json({ message: 'Quote not found' });
  }

  rfq.quotes.forEach((entry) => {
    entry.status = entry._id.toString() === quote._id.toString() ? 'Accepted' : 'Rejected';
  });
  rfq.status = 'Accepted';
  await rfq.save();

  res.json(rfq);
};

export {
  getBuyerRfqs,
  createRfq,
  getAdminRfqs,
  updateAdminRfq,
  getVendorRfqs,
  submitVendorQuote,
  acceptRfqQuote,
};
