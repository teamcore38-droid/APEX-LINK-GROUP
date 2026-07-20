import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { calculateOrderPricing, getShippingOptions } from './utils/commerceService.js';
import { normalizeAddressPayload } from './utils/addressBook.js';

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

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  const payload = { state: 'Ampara', country: 'Sri Lanka' };
  const normalizedShippingAddress = buildNormalizedShippingAddress(payload, null);
  console.log('normalizedShippingAddress:', normalizedShippingAddress);
  
  const cartItems = [
    {
      _id: "669931b2691764eb8329b350",
      product: "669931b2691764eb8329b350",
      name: "Test",
      qty: 1,
      price: 1999,
      countInStock: 10,
    }
  ];
  
  const quote = await calculateOrderPricing({
    cartItems: cartItems,
    shippingAddress: normalizedShippingAddress,
    currency: 'LKR',
  });
  
  console.log('quote itemsPrice:', quote.itemsPrice);
  console.log('quote exchangeRate:', quote.exchangeRate);
  
  const rates = await getShippingOptions({
    shippingAddress: normalizedShippingAddress,
    subtotal: quote.itemsPrice / (quote.exchangeRate || 1),
    currency: quote.currency,
  });
  
  console.log('Rates returned:', rates);
  
  mongoose.connection.close();
};

run().catch(console.error);
