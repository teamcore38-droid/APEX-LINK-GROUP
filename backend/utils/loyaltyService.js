import { LoyaltyAccount, LoyaltyTransaction } from '../models/loyaltyModel.js';

const POINTS_PER_CURRENCY_UNIT = Number(process.env.LOYALTY_POINTS_PER_UNIT || 1);

const getTierForLifetimePoints = (points = 0) => {
  if (points >= 10000) return 'Platinum';
  if (points >= 5000) return 'Gold';
  if (points >= 1000) return 'Silver';
  return 'Bronze';
};

const getOrCreateLoyaltyAccount = async (userId) => {
  if (!userId) {
    return null;
  }

  return LoyaltyAccount.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const awardOrderLoyaltyPoints = async (order, actor = {}) => {
  if (!order?.user || order.loyaltyPointsAwardedAt || !order.isPaid) {
    return null;
  }

  const account = await getOrCreateLoyaltyAccount(order.user);
  const points = Math.max(Math.floor(Number(order.totalPrice || 0) * POINTS_PER_CURRENCY_UNIT), 0);

  if (points <= 0) {
    return account;
  }

  account.pointsBalance = Number(account.pointsBalance || 0) + points;
  account.lifetimePoints = Number(account.lifetimePoints || 0) + points;
  account.tier = getTierForLifetimePoints(account.lifetimePoints);
  account.lastActivityAt = new Date();
  await account.save();

  await LoyaltyTransaction.create({
    user: order.user,
    order: order._id,
    type: 'Earned',
    points,
    balanceAfter: account.pointsBalance,
    description: `Earned ${points} points for order ${order._id}.`,
    createdBy: actor?._id || null,
    createdByName: actor?.name || actor?.email || 'System',
  });

  order.loyaltyPointsAwarded = points;
  order.loyaltyPointsAwardedAt = new Date();
  return account;
};

export { awardOrderLoyaltyPoints, getOrCreateLoyaltyAccount, getTierForLifetimePoints };
