import crypto from 'crypto';
import ConsentRecord from '../models/consentRecordModel.js';
import Order from '../models/orderModel.js';
import PrivacyRequest from '../models/privacyRequestModel.js';
import ReturnRequest from '../models/returnRequestModel.js';
import Review from '../models/reviewModel.js';
import SupportTicket from '../models/supportTicketModel.js';
import User from '../models/userModel.js';
import WishlistItem from '../models/wishlistModel.js';
import RefreshToken from '../models/refreshTokenModel.js';
import { clearRefreshCookie, recordSecurityEvent } from '../utils/securityService.js';

const getSessionId = (req) =>
  String(req.body?.sessionId || req.query?.sessionId || req.headers['x-session-id'] || '').trim();

const getRequestIp = (req) =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '')
    .split(',')[0]
    .trim();

const getUserAgent = (req) => String(req.headers['user-agent'] || '').slice(0, 500);

const saveConsent = async (req, res) => {
  const sessionId = getSessionId(req);

  if (!req.user?._id && !sessionId) {
    return res.status(400).json({ message: 'Session ID is required for guest consent records' });
  }

  const filter = req.user?._id ? { user: req.user._id } : { sessionId };
  const consent = await ConsentRecord.findOneAndUpdate(
    filter,
    {
      ...filter,
      consentVersion: String(req.body.consentVersion || '2026-07-09'),
      necessary: true,
      analytics: Boolean(req.body.analytics),
      marketing: Boolean(req.body.marketing),
      personalization: Boolean(req.body.personalization),
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json(consent);
};

const getConsent = async (req, res) => {
  const sessionId = getSessionId(req);
  const filter = req.user?._id ? { user: req.user._id } : sessionId ? { sessionId } : null;

  if (!filter) {
    return res.json(null);
  }

  const consent = await ConsentRecord.findOne(filter).sort({ updatedAt: -1 });
  res.json(consent);
};

const createPrivacyRequest = async (req, res) => {
  const type = String(req.body.type || '').trim().toLowerCase();

  if (!['export', 'delete'].includes(type)) {
    return res.status(400).json({ message: 'Privacy request type must be export or delete' });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const request = await PrivacyRequest.create({
    user: user._id,
    type,
    status: type === 'export' ? 'Ready' : 'Pending',
    requestedEmail: user.email,
    reason: String(req.body.reason || '').trim(),
  });

  if (type === 'delete') {
    user.security = {
      ...user.security,
      privacyDeletionRequestedAt: new Date(),
    };
    await user.save({ validateBeforeSave: false });
  }

  await recordSecurityEvent(req, `privacy.${type}.requested`, user, { requestId: request._id }, 'warning');
  res.status(201).json(request);
};

const getMyPrivacyRequests = async (req, res) => {
  const requests = await PrivacyRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(requests);
};

const buildDataExport = async (userId) => {
  const [user, orders, wishlist, reviews, returns, supportTickets, consentRecords] = await Promise.all([
    User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpire').lean(),
    Order.find({ user: userId }).lean(),
    WishlistItem.find({ user: userId }).populate('product', 'name slug sku').lean(),
    Review.find({ user: userId }).lean(),
    ReturnRequest.find({ user: userId }).lean(),
    SupportTicket.find({ user: userId }).lean(),
    ConsentRecord.find({ user: userId }).lean(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    subject: {
      userId: user?._id,
      email: user?.email,
    },
    user,
    orders,
    wishlist,
    reviews,
    returns,
    supportTickets,
    consentRecords,
  };
};

const exportMyData = async (req, res) => {
  const data = await buildDataExport(req.user._id);
  await PrivacyRequest.findOneAndUpdate(
    { user: req.user._id, type: 'export', status: { $in: ['Pending', 'Ready'] } },
    { status: 'Completed', completedAt: new Date() },
    { sort: { createdAt: -1 } }
  );
  await recordSecurityEvent(req, 'privacy.export.downloaded', req.user);
  res.json(data);
};

const anonymizeUserData = async (user) => {
  const userId = user._id;
  const anonymizedEmail = `deleted-${userId.toString()}@privacy.local`;

  await Promise.all([
    Order.updateMany(
      { user: userId },
      {
        $set: {
          'shippingAddress.fullName': 'Deleted User',
          'shippingAddress.email': anonymizedEmail,
          'shippingAddress.phone': '',
          'shippingAddress.address': '',
          'shippingAddress.addressLine1': '',
          'shippingAddress.addressLine2': '',
        },
      }
    ),
    SupportTicket.updateMany(
      { user: userId },
      {
        $set: {
          guestEmail: anonymizedEmail,
          name: 'Deleted User',
          'messages.$[].authorName': 'Deleted User',
          'messages.$[].authorEmail': anonymizedEmail,
        },
      }
    ),
    Review.updateMany({ user: userId }, { $set: { name: 'Deleted User', comment: '[Deleted by user request]' } }),
    WishlistItem.deleteMany({ user: userId }),
    ConsentRecord.deleteMany({ user: userId }),
    RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } }),
  ]);

  user.name = 'Deleted User';
  user.email = anonymizedEmail;
  user.phone = '';
  user.addresses = [];
  user.password = crypto.randomBytes(32).toString('hex');
  user.notificationPreferences = {
    email: { orderUpdates: false, promotions: false, support: false },
    sms: { enabled: false, phone: '', orderUpdates: false },
    whatsapp: { enabled: false, phone: '', orderUpdates: false },
  };
  user.security = {
    ...user.security,
    anonymizedAt: new Date(),
    privacyDeletionRequestedAt: user.security?.privacyDeletionRequestedAt || new Date(),
  };
  await user.save({ validateBeforeSave: false });
};

const deleteMyData = async (req, res) => {
  const confirmation = String(req.body.confirmation || '').trim();

  if (confirmation !== 'DELETE MY DATA') {
    return res.status(400).json({ message: 'Confirmation must be DELETE MY DATA' });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const request = await PrivacyRequest.create({
    user: user._id,
    type: 'delete',
    status: 'Completed',
    requestedEmail: user.email,
    reason: String(req.body.reason || '').trim(),
    completedAt: new Date(),
  });

  await anonymizeUserData(user);
  clearRefreshCookie(res);
  await recordSecurityEvent(req, 'privacy.delete.completed', user, { requestId: request._id }, 'critical');
  res.json({ message: 'Account data has been anonymized and active sessions were revoked.' });
};

export {
  createPrivacyRequest,
  deleteMyData,
  exportMyData,
  getConsent,
  getMyPrivacyRequests,
  saveConsent,
};
