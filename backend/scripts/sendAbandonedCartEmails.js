import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import { sendDueAbandonedCartEmails } from '../utils/marketingService.js';

dotenv.config();

try {
  await connectDB({ strict: true });
  const results = await sendDueAbandonedCartEmails({
    limit: Number(process.env.ABANDONED_CART_SEND_LIMIT || 50),
    minAgeMinutes: Number(process.env.ABANDONED_CART_MIN_AGE_MINUTES || 60),
  });
  console.log(`Abandoned cart emails processed: ${results.length}`);
  process.exit(0);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
