import mongoose from 'mongoose';

const paymentEventSchema = mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      default: 'PayHere',
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
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

const PaymentEvent = mongoose.model('PaymentEvent', paymentEventSchema);

export default PaymentEvent;
