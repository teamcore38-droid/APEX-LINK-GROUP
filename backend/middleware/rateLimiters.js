import rateLimit from 'express-rate-limit';

const buildLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

const authRegisterLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many registration attempts. Please try again shortly.',
});

const authLoginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many login attempts. Please try again shortly.',
});

const forgotPasswordLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many password reset requests. Please wait before trying again.',
});

const resetPasswordLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many reset attempts. Please try again shortly.',
});

const contactSubmitLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many contact requests submitted. Please try again later.',
});

const orderTrackingLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: 'Too many tracking lookups. Please try again in a few minutes.',
});

export {
  authRegisterLimiter,
  authLoginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  contactSubmitLimiter,
  orderTrackingLimiter,
};
