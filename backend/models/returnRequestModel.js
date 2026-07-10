import mongoose from 'mongoose';

const returnItemSchema = mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Product',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const returnRequestSchema = mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Order',
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    items: {
      type: [returnItemSchema],
      default: [],
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    resolution: {
      type: String,
      enum: ['Refund', 'Replacement', 'Store Credit'],
      default: 'Refund',
    },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Rejected', 'Received', 'Refunded', 'Closed'],
      default: 'Requested',
      index: true,
    },
    adminNote: {
      type: String,
      default: '',
      trim: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedByName: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);

export default ReturnRequest;
