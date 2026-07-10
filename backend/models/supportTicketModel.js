import mongoose from 'mongoose';

const ticketMessageSchema = mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '', trim: true },
    authorEmail: { type: String, default: '', trim: true, lowercase: true },
    body: { type: String, required: true, trim: true },
    isStaff: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const supportTicketSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    guestEmail: { type: String, default: '', trim: true, lowercase: true },
    name: { type: String, default: '', trim: true },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['General', 'Order', 'Shipping', 'Return', 'Product', 'Payment', 'B2B'],
      default: 'General',
    },
    priority: {
      type: String,
      enum: ['Low', 'Normal', 'High', 'Urgent'],
      default: 'Normal',
    },
    channel: {
      type: String,
      enum: ['Live Chat', 'Support Ticket', 'Email', 'WhatsApp'],
      default: 'Support Ticket',
    },
    status: {
      type: String,
      enum: ['Open', 'Pending Customer', 'Pending Staff', 'Resolved', 'Closed'],
      default: 'Open',
    },
    messages: { type: [ticketMessageSchema], default: [] },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedToName: { type: String, default: '', trim: true },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ guestEmail: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

export default SupportTicket;
