import mongoose from 'mongoose';

const vendorProductSubmissionSchema = mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Changes Requested'],
      default: 'Submitted',
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedByName: { type: String, default: '', trim: true },
    reviewNote: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

vendorProductSubmissionSchema.index({ vendor: 1, createdAt: -1 });
vendorProductSubmissionSchema.index({ status: 1, createdAt: -1 });

const VendorProductSubmission = mongoose.model(
  'VendorProductSubmission',
  vendorProductSubmissionSchema
);

export default VendorProductSubmission;
