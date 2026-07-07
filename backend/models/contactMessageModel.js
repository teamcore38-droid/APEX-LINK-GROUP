import mongoose from 'mongoose';

const CONTACT_STATUS_VALUES = ['New', 'Read', 'Replied', 'Archived'];

const contactMessageSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: CONTACT_STATUS_VALUES,
      default: 'New',
    },
  },
  {
    timestamps: true,
  }
);

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

export { CONTACT_STATUS_VALUES };
export default ContactMessage;
