import mongoose from 'mongoose';
import Product from '../models/productModel.js';
import ShippingRate from '../models/shippingRateModel.js';
import TaxRule from '../models/taxRuleModel.js';
import Vendor from '../models/vendorModel.js';
import { Coupon, GiftCard } from '../models/promotionModel.js';

const DEFAULT_CURRENCY = (process.env.DEFAULT_CURRENCY || 'LKR').toUpperCase();
const FALLBACK_SHIPPING_THRESHOLD = Number(process.env.FREE_SHIPPING_THRESHOLD || 50);
const FALLBACK_SHIPPING_PRICE = Number(process.env.DEFAULT_SHIPPING_PRICE || 10);
const FALLBACK_TAX_RATE = Number(process.env.DEFAULT_TAX_RATE || 0.15);

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizeCode = (value = '') => String(value || '').trim().toUpperCase();

const getExchangeRates = () => {
  try {
    const parsed = JSON.parse(process.env.CURRENCY_RATES || '{}');
    return Object.fromEntries(
      Object.entries(parsed).map(([currency, rate]) => [currency.toUpperCase(), Number(rate)])
    );
  } catch {
    return {};
  }
};

const getCurrencyRate = (currency = DEFAULT_CURRENCY) => {
  const normalizedCurrency = String(currency || DEFAULT_CURRENCY).toUpperCase();

  if (normalizedCurrency === DEFAULT_CURRENCY) {
    return 1;
  }

  const rates = getExchangeRates();
  return Number(rates[normalizedCurrency] || 0) > 0 ? Number(rates[normalizedCurrency]) : 1;
};

const toDisplayMoney = (value, exchangeRate) => roundMoney(Number(value || 0) * Number(exchangeRate || 1));

const getCountryCode = (shippingAddress = {}) =>
  String(shippingAddress.country || '').trim().slice(0, 2).toUpperCase();

const getStateCode = (shippingAddress = {}) =>
  String(shippingAddress.state || '').trim().toUpperCase();

const getVariant = (product, variantId) => {
  if (!variantId) {
    return null;
  }

  return product.variants?.find((variant) => variant._id.toString() === String(variantId)) || null;
};

const getAvailableStock = (product, variant = null) => {
  const stockHolder = variant || product;
  return Math.max(Number(stockHolder.countInStock || 0) - Number(stockHolder.reservedStock || 0), 0);
};

const normalizeCartItems = async (cartItems = []) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('No order items');
  }

  const normalizedItems = [];

  for (const item of cartItems) {
    const productId = item.product || item._id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product in cart');
    }

    const product = await Product.findById(productId);

    if (!product || product.isActive === false) {
      throw new Error(`${item.name || 'A product'} is no longer available`);
    }

    if (product.approvalStatus && product.approvalStatus !== 'Approved') {
      throw new Error(`${product.name} is awaiting marketplace approval`);
    }

    const variant = getVariant(product, item.variantId);

    if (item.variantId && (!variant || variant.isActive === false)) {
      throw new Error(`${product.name} variant is no longer available`);
    }

    const qty = Math.max(Number.parseInt(item.qty, 10) || 0, 0);

    if (qty <= 0) {
      throw new Error(`${product.name} quantity must be greater than zero`);
    }

    const availableStock = getAvailableStock(product, variant);

    if (qty > availableStock) {
      throw new Error(`${product.name} has only ${availableStock} available`);
    }

    const price = roundMoney(Number(product.price || 0) + Number(variant?.priceAdjustment || 0));
    const vendor = product.vendor ? await Vendor.findById(product.vendor).lean() : null;
    const commissionRate = vendor ? Number(vendor.commissionRate || 0) : 0;
    const commissionAmount = roundMoney(price * qty * (commissionRate / 100));

    normalizedItems.push({
      name: product.name,
      qty,
      image: product.image,
      price,
      product: product._id,
      vendor: vendor?._id || null,
      vendorName: vendor?.businessName || '',
      variantId: variant?._id || null,
      variantLabel: variant?.label || '',
      sku: variant?.sku || product.sku || '',
      commissionRate,
      commissionAmount,
      vendorNetAmount: roundMoney(price * qty - commissionAmount),
      availableStock,
    });
  }

  return normalizedItems;
};

const getShippingOptions = async ({ shippingAddress = {}, subtotal = 0, currency = DEFAULT_CURRENCY }) => {
  const exchangeRate = getCurrencyRate(currency);
  const country = getCountryCode(shippingAddress);
  const state = getStateCode(shippingAddress);
  const query = {
    isActive: true,
    $or: [
      { country: country || '' },
      { country: '' },
      ...(state ? [{ country, state }] : []),
    ],
  };

  const configuredRates = await ShippingRate.find(query).sort({ basePrice: 1, carrier: 1 }).lean();
  const sourceRates =
    configuredRates.length > 0
      ? configuredRates
      : [
          {
            _id: 'standard',
            carrier: 'Apex Logistics',
            service: 'Standard Delivery',
            basePrice: FALLBACK_SHIPPING_PRICE,
            freeShippingThreshold: FALLBACK_SHIPPING_THRESHOLD,
            estimatedDaysMin: 3,
            estimatedDaysMax: 5,
          },
        ];

  return sourceRates.map((rate) => {
    const basePrice = Number(rate.basePrice || 0);
    const freeThreshold = Number(rate.freeShippingThreshold || 0);
    const price = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : basePrice;

    return {
      id: rate._id?.toString?.() || `${rate.carrier}-${rate.service}`,
      carrier: rate.carrier,
      service: rate.service,
      price: toDisplayMoney(price, exchangeRate),
      basePrice: roundMoney(price),
      estimatedDaysMin: Number(rate.estimatedDaysMin || 0),
      estimatedDaysMax: Number(rate.estimatedDaysMax || 0),
    };
  });
};

const calculateTax = async ({ shippingAddress = {}, taxableAmount = 0, exchangeRate = 1 }) => {
  const country = getCountryCode(shippingAddress);
  const state = getStateCode(shippingAddress);
  const rule =
    (await TaxRule.findOne({ country, state, isActive: true }).lean()) ||
    (await TaxRule.findOne({ country, state: '', isActive: true }).lean());
  const rate = Number(rule?.rate ?? FALLBACK_TAX_RATE);
  const baseAmount = roundMoney(taxableAmount * rate);

  return {
    taxPrice: toDisplayMoney(baseAmount, exchangeRate),
    taxBreakdown: [
      {
        label: rule?.label || 'Sales Tax',
        rate,
        amount: toDisplayMoney(baseAmount, exchangeRate),
      },
    ],
  };
};

const calculateCouponDiscount = async ({ couponCode = '', subtotal = 0, exchangeRate = 1 }) => {
  const normalizedCode = normalizeCode(couponCode);

  if (!normalizedCode) {
    return { discountPrice: 0, coupon: null };
  }

  const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true });
  const now = new Date();

  if (
    !coupon ||
    (coupon.startsAt && coupon.startsAt > now) ||
    (coupon.expiresAt && coupon.expiresAt < now) ||
    (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) ||
    subtotal < Number(coupon.minSubtotal || 0)
  ) {
    throw new Error('Coupon is invalid, expired, or not applicable');
  }

  const rawDiscount =
    coupon.discountType === 'percent'
      ? subtotal * (Number(coupon.discountValue || 0) / 100)
      : Number(coupon.discountValue || 0);
  const cappedDiscount =
    Number(coupon.maxDiscount || 0) > 0 ? Math.min(rawDiscount, Number(coupon.maxDiscount)) : rawDiscount;

  return {
    discountPrice: toDisplayMoney(Math.min(cappedDiscount, subtotal), exchangeRate),
    coupon,
  };
};

const calculateGiftCardAmount = async ({ giftCardCode = '', balanceDue = 0, currency = DEFAULT_CURRENCY }) => {
  const normalizedCode = normalizeCode(giftCardCode);

  if (!normalizedCode) {
    return { giftCardAmount: 0, giftCard: null };
  }

  const giftCard = await GiftCard.findOne({ code: normalizedCode, isActive: true });

  if (!giftCard || (giftCard.expiresAt && giftCard.expiresAt < new Date()) || giftCard.balance <= 0) {
    throw new Error('Gift card is invalid, expired, or depleted');
  }

  if (giftCard.currency && giftCard.currency !== String(currency).toUpperCase()) {
    throw new Error(`Gift card currency must match ${currency}`);
  }

  return {
    giftCardAmount: roundMoney(Math.min(Number(giftCard.balance || 0), Number(balanceDue || 0))),
    giftCard,
  };
};

const calculateOrderPricing = async ({
  cartItems = [],
  shippingAddress = {},
  couponCode = '',
  giftCardCode = '',
  shippingRateId = '',
  currency = DEFAULT_CURRENCY,
}) => {
  const normalizedCurrency = String(currency || DEFAULT_CURRENCY).toUpperCase();
  const exchangeRate = getCurrencyRate(normalizedCurrency);
  const normalizedItems = await normalizeCartItems(cartItems);
  const baseItemsPrice = roundMoney(
    normalizedItems.reduce((total, item) => total + Number(item.price || 0) * Number(item.qty || 0), 0)
  );
  const displayItemsPrice = toDisplayMoney(baseItemsPrice, exchangeRate);
  const shippingOptions = await getShippingOptions({
    shippingAddress,
    subtotal: baseItemsPrice,
    currency: normalizedCurrency,
  });
  const selectedShipping =
    shippingOptions.find((option) => option.id === String(shippingRateId || '')) || shippingOptions[0];
  const couponResult = await calculateCouponDiscount({
    couponCode,
    subtotal: baseItemsPrice,
    exchangeRate,
  });
  const discountPrice = couponResult.discountPrice;
  const taxableAmount = Math.max(displayItemsPrice - discountPrice, 0);
  const taxResult = await calculateTax({
    shippingAddress,
    taxableAmount: Math.max(baseItemsPrice - discountPrice / exchangeRate, 0),
    exchangeRate,
  });
  const preGiftTotal = roundMoney(taxableAmount + Number(selectedShipping?.price || 0) + taxResult.taxPrice);
  const giftCardResult = await calculateGiftCardAmount({
    giftCardCode,
    balanceDue: preGiftTotal,
    currency: normalizedCurrency,
  });
  const totalPrice = roundMoney(Math.max(preGiftTotal - giftCardResult.giftCardAmount, 0));

  return {
    orderItems: normalizedItems.map(({ availableStock, ...item }) => ({
      ...item,
      price: toDisplayMoney(item.price, exchangeRate),
      commissionAmount: toDisplayMoney(item.commissionAmount, exchangeRate),
      vendorNetAmount: toDisplayMoney(item.vendorNetAmount, exchangeRate),
    })),
    itemsPrice: displayItemsPrice,
    shippingPrice: Number(selectedShipping?.price || 0),
    taxPrice: taxResult.taxPrice,
    discountPrice,
    giftCardAmount: giftCardResult.giftCardAmount,
    totalPrice,
    currency: normalizedCurrency,
    exchangeRate,
    couponCode: couponResult.coupon?.code || '',
    giftCardCode: giftCardResult.giftCard?.code || '',
    shippingRate: selectedShipping
      ? {
          carrier: selectedShipping.carrier,
          service: selectedShipping.service,
          estimatedDaysMin: selectedShipping.estimatedDaysMin,
          estimatedDaysMax: selectedShipping.estimatedDaysMax,
        }
      : {},
    taxBreakdown: taxResult.taxBreakdown,
    shippingOptions,
    appliedPromotions: {
      coupon: couponResult.coupon
        ? {
            code: couponResult.coupon.code,
            discountType: couponResult.coupon.discountType,
            discountValue: couponResult.coupon.discountValue,
          }
        : null,
      giftCard: giftCardResult.giftCard
        ? {
            code: giftCardResult.giftCard.code,
            appliedAmount: giftCardResult.giftCardAmount,
          }
        : null,
    },
  };
};

const commitPromotionsForOrder = async (order) => {
  if (!order || order.promotionsCommittedAt) {
    return false;
  }

  if (order.couponCode) {
    await Coupon.updateOne({ code: order.couponCode }, { $inc: { usedCount: 1 } });
  }

  if (order.giftCardCode && Number(order.giftCardAmount || 0) > 0) {
    await GiftCard.updateOne(
      { code: order.giftCardCode, balance: { $gte: Number(order.giftCardAmount || 0) } },
      { $inc: { balance: -Number(order.giftCardAmount || 0) } }
    );
  }

  order.promotionsCommittedAt = new Date();
  return true;
};

export {
  DEFAULT_CURRENCY,
  calculateOrderPricing,
  commitPromotionsForOrder,
  getShippingOptions,
  getCurrencyRate,
  normalizeCode,
  roundMoney,
};
