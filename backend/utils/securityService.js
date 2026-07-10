import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import RefreshToken from '../models/refreshTokenModel.js';
import SecurityEvent from '../models/securityEventModel.js';
import TwoFactorChallenge from '../models/twoFactorChallengeModel.js';
import { sendAdminTwoFactorCodeEmail, sendSecurityAlertEmail } from './emailService.js';

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '1h';
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);
const REFRESH_COOKIE_NAME = 'apexRefreshToken';
const LOCKOUT_THRESHOLD = Number(process.env.LOGIN_LOCKOUT_THRESHOLD || 5);
const LOCKOUT_MINUTES = Number(process.env.LOGIN_LOCKOUT_MINUTES || 15);
const TWO_FACTOR_MINUTES = Number(process.env.ADMIN_2FA_MINUTES || 10);

const hashValue = (value = '') => crypto.createHash('sha256').update(String(value)).digest('hex');

const getRequestIp = (req) =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '')
    .split(',')[0]
    .trim();

const getUserAgent = (req) => String(req.headers['user-agent'] || '').slice(0, 500);

const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/users',
  maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
});

const parseCookieHeader = (cookieHeader = '') =>
  Object.fromEntries(
    String(cookieHeader || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split('=');
        return [decodeURIComponent(key), decodeURIComponent(rest.join('='))];
      })
  );

const getRefreshTokenFromRequest = (req) => {
  const cookies = parseCookieHeader(req.headers.cookie || '');
  return cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken || '';
};

const issueRefreshToken = async (user, req, family = crypto.randomUUID()) => {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashValue(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    family,
    userAgent: getUserAgent(req),
    ipAddress: getRequestIp(req),
    expiresAt,
  });

  return { token, tokenHash, family, expiresAt };
};

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, buildRefreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...buildRefreshCookieOptions(),
    maxAge: undefined,
  });
};

const recordSecurityEvent = async (req, eventType, user = null, metadata = {}, severity = 'info') => {
  try {
    await SecurityEvent.create({
      user: user?._id || null,
      email: String(user?.email || metadata.email || '').toLowerCase(),
      eventType,
      severity,
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
      metadata,
    });
  } catch (error) {
    console.error('[securityService:recordSecurityEvent]', error.message);
  }
};

const isAccountLocked = (user) =>
  Boolean(user?.security?.accountLockedUntil && new Date(user.security.accountLockedUntil).getTime() > Date.now());

const registerFailedLogin = async (req, user, email = '') => {
  if (!user) {
    await recordSecurityEvent(req, 'login.failed.unknown-account', null, { email }, 'warning');
    return;
  }

  const attempts = Number(user.security?.failedLoginAttempts || 0) + 1;
  user.security = {
    ...user.security,
    failedLoginAttempts: attempts,
    lastFailedLoginAt: new Date(),
  };

  if (attempts >= LOCKOUT_THRESHOLD) {
    user.security.accountLockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    await sendSecurityAlertEmail(user, {
      title: 'Account temporarily locked',
      message: `Your account was locked for ${LOCKOUT_MINUTES} minutes after repeated failed login attempts.`,
      ipAddress: getRequestIp(req),
    });
  }

  await user.save({ validateBeforeSave: false });
  await recordSecurityEvent(req, 'login.failed', user, { attempts }, attempts >= LOCKOUT_THRESHOLD ? 'critical' : 'warning');
};

const registerSuccessfulLogin = async (req, user) => {
  const previousIp = user.security?.lastLoginIp || '';
  const nextIp = getRequestIp(req);
  const suspicious = Boolean(previousIp && nextIp && previousIp !== nextIp);

  user.security = {
    ...user.security,
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    lastLoginAt: new Date(),
    lastLoginIp: nextIp,
    lastLoginUserAgent: getUserAgent(req),
  };
  await user.save({ validateBeforeSave: false });
  await recordSecurityEvent(req, suspicious ? 'login.suspicious' : 'login.success', user, { previousIp, nextIp }, suspicious ? 'warning' : 'info');

  if (suspicious) {
    await sendSecurityAlertEmail(user, {
      title: 'New login location detected',
      message: 'We noticed a login from a different network than your last sign-in.',
      ipAddress: nextIp,
    });
  }
};

const adminRequiresTwoFactor = (user) =>
  Boolean(user?.isAdmin || user?.isStaff || user?.role === 'owner' || user?.role === 'admin');

const createTwoFactorChallenge = async (req, user, purpose = 'admin-login') => {
  const code = `${crypto.randomInt(100000, 999999)}`;
  const challenge = await TwoFactorChallenge.create({
    user: user._id,
    codeHash: hashValue(code),
    purpose,
    expiresAt: new Date(Date.now() + TWO_FACTOR_MINUTES * 60 * 1000),
    ipAddress: getRequestIp(req),
    userAgent: getUserAgent(req),
  });

  await sendAdminTwoFactorCodeEmail(user, code, TWO_FACTOR_MINUTES);
  await recordSecurityEvent(req, '2fa.challenge.created', user, { purpose }, 'info');

  return {
    challengeId: challenge._id,
    expiresAt: challenge.expiresAt,
    developmentCode: process.env.NODE_ENV === 'production' ? undefined : code,
  };
};

const verifyTwoFactorChallenge = async (req, { challengeId = '', code = '', purpose = 'admin-login' }) => {
  const challenge = await TwoFactorChallenge.findOne({
    _id: challengeId,
    purpose,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate('user');

  if (!challenge) {
    return { ok: false, message: 'Two-factor challenge is invalid or expired' };
  }

  if (challenge.attempts >= 5) {
    return { ok: false, message: 'Too many two-factor attempts' };
  }

  if (challenge.codeHash !== hashValue(code)) {
    challenge.attempts += 1;
    await challenge.save();
    await recordSecurityEvent(req, '2fa.verify.failed', challenge.user, { challengeId }, 'warning');
    return { ok: false, message: 'Invalid two-factor code' };
  }

  challenge.consumedAt = new Date();
  await challenge.save();
  await recordSecurityEvent(req, '2fa.verify.success', challenge.user, { challengeId }, 'info');

  return { ok: true, user: challenge.user };
};

export {
  REFRESH_COOKIE_NAME,
  adminRequiresTwoFactor,
  clearRefreshCookie,
  generateAccessToken,
  getRefreshTokenFromRequest,
  getRequestIp,
  getUserAgent,
  hashValue,
  isAccountLocked,
  issueRefreshToken,
  recordSecurityEvent,
  registerFailedLogin,
  registerSuccessfulLogin,
  setRefreshCookie,
  verifyTwoFactorChallenge,
  createTwoFactorChallenge,
};
