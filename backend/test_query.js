import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const shippingRateSchema = mongoose.Schema(
  {
    carrier: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    country: { type: String, default: '', uppercase: true, trim: true },
    state: { type: String, default: '', uppercase: true, trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    freeShippingThreshold: { type: Number, default: 0, min: 0 },
    estimatedDaysMin: { type: Number, default: 3, min: 0 },
    estimatedDaysMax: { type: Number, default: 5, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ShippingRate = mongoose.model('ShippingRate', shippingRateSchema);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  const state = 'Ampara';
  const query = {
    isActive: true,
    country: { $regex: /^sri lanka$/i },
    ...(state ? { state: { $regex: new RegExp(`^${state}$`, 'i') } } : {}),
  };
  
  console.log('Query:', query);
  const rates = await ShippingRate.find(query).lean();
  console.log('Rates found:', rates);
  
  const allRates = await ShippingRate.find({}).lean();
  console.log('All rates:', allRates);
  
  mongoose.connection.close();
};

run().catch(console.error);
