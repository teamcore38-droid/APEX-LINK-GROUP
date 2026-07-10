import mongoose from 'mongoose';

const taxRuleSchema = mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    state: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    label: {
      type: String,
      default: 'Sales Tax',
      trim: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

taxRuleSchema.index({ country: 1, state: 1, isActive: 1 });

const TaxRule = mongoose.model('TaxRule', taxRuleSchema);

export default TaxRule;
