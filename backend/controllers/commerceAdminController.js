import InventoryEvent from '../models/inventoryEventModel.js';
import Product from '../models/productModel.js';
import ShippingRate from '../models/shippingRateModel.js';
import TaxRule from '../models/taxRuleModel.js';
import { Coupon, GiftCard } from '../models/promotionModel.js';

const getInventoryEvents = async (req, res) => {
  try {
    const { productId = '', type = '' } = req.query;
    const filter = {
      ...(productId ? { product: productId } : {}),
      ...(type ? { type } : {}),
    };
    const events = await InventoryEvent.find(filter)
      .populate('product', 'name sku countInStock reservedStock lowStockThreshold')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(events);
  } catch (error) {
    console.error('[commerceAdminController:getInventoryEvents]', error);
    res.status(500).json({ message: 'Unable to load inventory events right now' });
  }
};

const getLowStockProducts = async (_req, res) => {
  try {
    const products = await Product.find({ isActive: { $ne: false } }).sort({ countInStock: 1 });
    const lowStockProducts = products.filter((product) => {
      const available = Number(product.countInStock || 0) - Number(product.reservedStock || 0);
      return available <= Number(product.lowStockThreshold ?? 10);
    });

    res.json(lowStockProducts);
  } catch (error) {
    console.error('[commerceAdminController:getLowStockProducts]', error);
    res.status(500).json({ message: 'Unable to load low-stock products right now' });
  }
};

const listCoupons = async (_req, res) => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 });
  res.json(coupons);
};

const upsertCoupon = async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();

  if (!code) {
    return res.status(400).json({ message: 'Coupon code is required' });
  }

  const coupon = await Coupon.findOneAndUpdate(
    { code },
    { ...req.body, code },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json(coupon);
};

const listGiftCards = async (_req, res) => {
  const giftCards = await GiftCard.find({}).sort({ createdAt: -1 });
  res.json(giftCards);
};

const upsertGiftCard = async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();

  if (!code) {
    return res.status(400).json({ message: 'Gift card code is required' });
  }

  const initialBalance = Number(req.body.initialBalance ?? req.body.balance ?? 0);
  const giftCard = await GiftCard.findOneAndUpdate(
    { code },
    {
      ...req.body,
      code,
      initialBalance,
      balance: Number(req.body.balance ?? initialBalance),
    },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json(giftCard);
};

const listTaxRules = async (_req, res) => {
  const rules = await TaxRule.find({}).sort({ country: 1, state: 1 });
  res.json(rules);
};

const upsertTaxRule = async (req, res) => {
  const country = String(req.body.country || '').trim().toUpperCase();
  const state = String(req.body.state || '').trim().toUpperCase();

  if (!country) {
    return res.status(400).json({ message: 'Country is required' });
  }

  const rule = await TaxRule.findOneAndUpdate(
    { country, state },
    { ...req.body, country, state },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json(rule);
};

const listShippingRates = async (_req, res) => {
  const rates = await ShippingRate.find({}).sort({ country: 1, state: 1, basePrice: 1 });
  res.json(rates);
};

const upsertShippingRate = async (req, res) => {
  const carrier = String(req.body.carrier || '').trim();
  const service = String(req.body.service || '').trim();
  const country = String(req.body.country || '').trim().toUpperCase();
  const state = String(req.body.state || '').trim().toUpperCase();

  if (!carrier || !service) {
    return res.status(400).json({ message: 'Carrier and service are required' });
  }

  const rate = await ShippingRate.findOneAndUpdate(
    { carrier, service, country, state },
    { ...req.body, carrier, service, country, state },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json(rate);
};

export {
  getInventoryEvents,
  getLowStockProducts,
  listCoupons,
  upsertCoupon,
  listGiftCards,
  upsertGiftCard,
  listTaxRules,
  upsertTaxRule,
  listShippingRates,
  upsertShippingRate,
};
