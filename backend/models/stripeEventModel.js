import mongoose from 'mongoose';

const stripeEventSchema = mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    paymentIntentId: {
      type: String,
      default: '',
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    processed: {
      type: Boolean,
      default: false,
    },
    processingError: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

const StripeEvent = mongoose.model('StripeEvent', stripeEventSchema);

export default StripeEvent;
