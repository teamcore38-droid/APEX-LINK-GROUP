import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine2: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    isStaff: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: [
        'customer',
        'owner',
        'admin',
        'catalog_manager',
        'order_manager',
        'commerce_manager',
        'content_manager',
        'analyst',
        'vendor_manager',
        'custom',
      ],
      default: 'customer',
    },
    staffPermissions: {
      type: [String],
      default: [],
    },
    staffStatus: {
      type: String,
      enum: ['Active', 'Suspended'],
      default: 'Active',
    },
    isVendor: {
      type: Boolean,
      default: false,
    },
    vendorStatus: {
      type: String,
      enum: ['None', 'Draft', 'Submitted', 'Under Review', 'Verified', 'Rejected', 'Suspended'],
      default: 'None',
    },
    addresses: {
      type: [addressSchema],
      default: [],
    },
    notificationPreferences: {
      email: {
        orderUpdates: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
        support: { type: Boolean, default: true },
      },
      sms: {
        enabled: { type: Boolean, default: false },
        phone: { type: String, default: '', trim: true },
        orderUpdates: { type: Boolean, default: false },
      },
      whatsapp: {
        enabled: { type: Boolean, default: false },
        phone: { type: String, default: '', trim: true },
        orderUpdates: { type: Boolean, default: false },
      },
    },
    security: {
      failedLoginAttempts: { type: Number, default: 0 },
      accountLockedUntil: { type: Date, default: null },
      lastFailedLoginAt: { type: Date, default: null },
      lastLoginAt: { type: Date, default: null },
      lastLoginIp: { type: String, default: '', trim: true },
      lastLoginUserAgent: { type: String, default: '', trim: true },
      adminTwoFactorEnabled: { type: Boolean, default: true },
      privacyDeletionRequestedAt: { type: Date, default: null },
      anonymizedAt: { type: Date, default: null },
    },
    resetPasswordToken: {
      type: String,
      default: '',
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

  return resetToken;
};

userSchema.pre('save', async function (_options) {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

export default User;
