import crypto from 'crypto';
import User from '../models/userModel.js';
import { getPermissionsForUser } from '../utils/permissions.js';
import RefreshToken from '../models/refreshTokenModel.js';
import SecurityEvent from '../models/securityEventModel.js';
import {
  normalizeAddressPayload,
  validateAddressPayload,
  markDefaultAddress,
  ensureSingleDefaultAddress,
  saveAddressToUser,
} from '../utils/addressBook.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import {
  adminRequiresTwoFactor,
  clearRefreshCookie,
  createTwoFactorChallenge,
  generateAccessToken,
  getRefreshTokenFromRequest,
  hashValue,
  isAccountLocked,
  issueRefreshToken,
  recordSecurityEvent,
  registerFailedLogin,
  registerSuccessfulLogin,
  setRefreshCookie,
  verifyTwoFactorChallenge,
} from '../utils/securityService.js';

const MIN_PASSWORD_LENGTH = 6;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizePhone = (value = '') => value.toString().trim();

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  isAdmin: user.isAdmin,
  isStaff: Boolean(user.isStaff),
  role: user.role || (user.isAdmin ? 'admin' : 'customer'),
  staffStatus: user.staffStatus || 'Active',
  permissions: getPermissionsForUser(user),
  isVendor: Boolean(user.isVendor),
  vendorStatus: user.vendorStatus || 'None',
  security: {
    adminTwoFactorEnabled: user.security?.adminTwoFactorEnabled !== false,
    lastLoginAt: user.security?.lastLoginAt || null,
    accountLockedUntil: user.security?.accountLockedUntil || null,
  },
  createdAt: user.createdAt,
  addresses: user.addresses || [],
  token: generateAccessToken(user._id),
});

const findUserByEmail = async (email) =>
  User.findOne({ email: String(email || '').trim().toLowerCase() });

const issueLoginResponse = async (req, res, user, statusCode = 200) => {
  await registerSuccessfulLogin(req, user);
  const refreshToken = await issueRefreshToken(user, req);
  setRefreshCookie(res, refreshToken.token);
  return res.status(statusCode).json(serializeUser(user));
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  const {
    name = '',
    email = '',
    password = '',
    confirmPassword = '',
    phone = '',
  } = req.body;

  try {
    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!trimmedName) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(400).json({ message: 'An account already exists with that email' });
    }

    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      phone: sanitizePhone(phone),
      password,
    });

    await recordSecurityEvent(req, 'account.registered', user);
    await issueLoginResponse(req, res, user, 201);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
  const { email = '', password = '' } = req.body;

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && isAccountLocked(user)) {
      await recordSecurityEvent(req, 'login.blocked.locked', user, {}, 'critical');
      return res.status(423).json({
        message: 'Account is temporarily locked after repeated failed login attempts.',
        accountLockedUntil: user.security.accountLockedUntil,
      });
    }

    if (!user || !(await user.matchPassword(password))) {
      await registerFailedLogin(req, user, normalizedEmail);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (adminRequiresTwoFactor(user) && user.security?.adminTwoFactorEnabled !== false) {
      const challenge = await createTwoFactorChallenge(req, user, 'admin-login');
      return res.json({
        requiresTwoFactor: true,
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        developmentCode: challenge.developmentCode,
        message: 'Admin verification code required',
      });
    }

    return issueLoginResponse(req, res, user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const verifyAdminTwoFactorLogin = async (req, res) => {
  const { challengeId = '', code = '' } = req.body;

  try {
    const result = await verifyTwoFactorChallenge(req, {
      challengeId,
      code,
      purpose: 'admin-login',
    });

    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }

    return issueLoginResponse(req, res, result.user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (!refreshToken) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Refresh token is required' });
    }

    const tokenHash = hashValue(refreshToken);
    const tokenRecord = await RefreshToken.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).populate('user');

    if (!tokenRecord?.user) {
      clearRefreshCookie(res);
      await recordSecurityEvent(req, 'session.refresh.invalid', null, {}, 'warning');
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }

    const nextRefresh = await issueRefreshToken(tokenRecord.user, req, tokenRecord.family);
    tokenRecord.revokedAt = new Date();
    tokenRecord.replacedByTokenHash = nextRefresh.tokenHash;
    await tokenRecord.save();
    setRefreshCookie(res, nextRefresh.token);
    await recordSecurityEvent(req, 'session.refresh', tokenRecord.user);
    res.json(serializeUser(tokenRecord.user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const logoutUser = async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (refreshToken) {
      await RefreshToken.findOneAndUpdate(
        { tokenHash: hashValue(refreshToken), revokedAt: null },
        { revokedAt: new Date() }
      );
    }

    clearRefreshCookie(res);
    await recordSecurityEvent(req, 'session.logout', req.user || null);
    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getSecurityEvents = async (req, res) => {
  try {
    const events = await SecurityEvent.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const updateAdminTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!adminRequiresTwoFactor(user)) {
      return res.status(400).json({ message: 'Two-factor controls apply to admin and staff accounts only' });
    }

    user.security = {
      ...user.security,
      adminTwoFactorEnabled: req.body.enabled !== false,
    };
    await user.save({ validateBeforeSave: false });
    await recordSecurityEvent(req, user.security.adminTwoFactorEnabled ? '2fa.enabled' : '2fa.disabled', user, {}, 'warning');

    res.json({
      adminTwoFactorEnabled: user.security.adminTwoFactorEnabled,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get logged in user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      ...user.toObject(),
      permissions: getPermissionsForUser(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update logged in user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const nextName = String(req.body.name ?? user.name).trim();
    const nextEmail = String(req.body.email ?? user.email).trim().toLowerCase();
    const nextPhone = sanitizePhone(req.body.phone ?? user.phone);

    if (!nextName) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!emailPattern.test(nextEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (nextEmail !== user.email) {
      const existingUser = await findUserByEmail(nextEmail);

      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'That email address is already in use' });
      }
    }

    user.name = nextName;
    user.email = nextEmail;
    user.phone = nextPhone;

    const updatedUser = await user.save();
    res.json(serializeUser(updatedUser));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get logged in user addresses
// @route   GET /api/users/addresses
// @access  Private
const getUserAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    ensureSingleDefaultAddress(user.addresses);
    res.json(user.addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add a user address
// @route   POST /api/users/addresses
// @access  Private
const createUserAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await saveAddressToUser(user, req.body, {
      setDefault: Boolean(req.body.isDefault),
    });

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    res.status(201).json(result.addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a user address
// @route   PUT /api/users/addresses/:addressId
// @access  Private
const updateUserAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const address = user.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const nextAddress = normalizeAddressPayload({
      ...address.toObject(),
      ...req.body,
    });
    const validationError = validateAddressPayload(nextAddress);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    address.fullName = nextAddress.fullName;
    address.phone = nextAddress.phone;
    address.addressLine1 = nextAddress.addressLine1;
    address.addressLine2 = nextAddress.addressLine2;
    address.city = nextAddress.city;
    address.state = nextAddress.state;
    address.postalCode = nextAddress.postalCode;
    address.country = nextAddress.country;
    address.isDefault = nextAddress.isDefault;

    if (address.isDefault) {
      markDefaultAddress(user.addresses, address._id);
    } else {
      ensureSingleDefaultAddress(user.addresses);
    }

    await user.save();
    res.json(user.addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a user address
// @route   DELETE /api/users/addresses/:addressId
// @access  Private
const deleteUserAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const address = user.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const addressId = address._id;
    user.addresses.pull(addressId);
    ensureSingleDefaultAddress(user.addresses);
    await user.save();

    res.json(user.addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Set default user address
// @route   PUT /api/users/addresses/:addressId/default
// @access  Private
const setDefaultUserAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const address = user.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    markDefaultAddress(user.addresses, address._id);
    await user.save();

    res.json(user.addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Change current user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  const {
    currentPassword = '',
    newPassword = '',
    confirmPassword = '',
  } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long` });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirmation do not match' });
    }

    user.password = newPassword;
    user.resetPasswordToken = '';
    user.resetPasswordExpire = null;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Forgot password
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email = '' } = req.body;

  try {
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.json({
        message: 'If an account exists for that email, a reset link has been prepared.',
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    await sendPasswordResetEmail(user, resetUrl);
    const response = {
      message: 'Password reset instructions are ready.',
    };

    // Development only: expose reset URL for local testing until email delivery is configured.
    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = resetToken;
      response.resetUrl = resetUrl;
    }

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Reset password
// @route   POST /api/users/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword = '', confirmPassword = '' } = req.body;

  try {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    user.password = newPassword;
    user.resetPasswordToken = '';
    user.resetPasswordExpire = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export {
  authUser,
  verifyAdminTwoFactorLogin,
  refreshAccessToken,
  logoutUser,
  registerUser,
  getUserProfile,
  getSecurityEvents,
  updateAdminTwoFactor,
  updateUserProfile,
  getUserAddresses,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultUserAddress,
  changePassword,
  forgotPassword,
  resetPassword,
};
