import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import commerceAdminRoutes from './routes/commerceAdminRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import rfqRoutes from './routes/rfqRoutes.js';
import proAdminRoutes from './routes/proAdminRoutes.js';
import cmsRoutes from './routes/cmsRoutes.js';
import customerExperienceRoutes from './routes/customerExperienceRoutes.js';
import v1Routes from './routes/v1Routes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import privacyRoutes from './routes/privacyRoutes.js';
import opsRoutes from './routes/opsRoutes.js';
import marketingRoutes from './routes/marketingRoutes.js';
import seoRoutes from './routes/seoRoutes.js';
import { sanitizeRequest } from './middleware/sanitizeMiddleware.js';
import { requestContext } from './middleware/requestContextMiddleware.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

dotenv.config();

connectDB();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  app.set('trust proxy', 1);
}

const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
].map((origin) => (origin ? origin.trim().replace(/\/+$/, '') : ''));
const allowedOrigins = [...new Set(configuredOrigins.filter(Boolean))];

const corsOptions = {
  origin(origin, callback) {
    // Allow direct server-to-server calls without an Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
};

app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(requestContext);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  })
);
app.use(cors(corsOptions));
// Stripe webhook signature verification needs raw body on this path.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeRequest);

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.get('/api/health', (req, res) => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    database: {
      state: stateMap[mongoose.connection.readyState] || 'unknown',
    },
  });
});

app.get('/sitemap.xml', (req, res, next) => seoRoutes(req, res, next));
app.get('/robots.txt', (req, res, next) => seoRoutes(req, res, next));

app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/admin/commerce', commerceAdminRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/admin/pro', proAdminRoutes);
app.use('/api/admin/webhooks', webhookRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/customer', customerExperienceRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/analytics', marketingRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/ops', opsRoutes);
app.use('/api/docs', opsRoutes);
app.use('/api/v1', v1Routes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only start listening if not running in a serverless environment (Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, console.log(`Server running on port ${PORT}`));
}

export default app;
