import ContactMessage, { CONTACT_STATUS_VALUES } from '../models/contactMessageModel.js';
import {
  sendContactAutoReply,
  sendContactMessageNotification,
} from '../utils/emailService.js';
import { recordAuditLog } from '../utils/auditService.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
const createContactMessage = async (req, res) => {
  const {
    name = '',
    email = '',
    phone = '',
    subject = '',
    message = '',
  } = req.body;

  try {
    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedSubject = String(subject).trim();
    const trimmedMessage = String(message).trim();

    if (!trimmedName) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (!trimmedSubject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    if (!trimmedMessage) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const createdMessage = await ContactMessage.create({
      name: trimmedName,
      email: normalizedEmail,
      phone: String(phone || '').trim(),
      subject: trimmedSubject,
      message: trimmedMessage,
    });

    await Promise.allSettled([
      sendContactMessageNotification(createdMessage),
      sendContactAutoReply(createdMessage),
    ]);

    res.status(201).json({
      message: 'Thank you for contacting Apex Link Group. Our team will get back to you shortly.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'We could not send your message right now. Please try again shortly.',
    });
  }
};

// @desc    Get all contact messages
// @route   GET /api/contact/admin/all
// @access  Private/Admin
const getContactMessages = async (req, res) => {
  try {
    const { status = '' } = req.query;

    if (status && !CONTACT_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: 'Invalid contact status filter' });
    }

    const filter = status ? { status } : {};
    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update contact message status
// @route   PUT /api/contact/admin/:id/status
// @access  Private/Admin
const updateContactMessageStatus = async (req, res) => {
  try {
    const { status = '' } = req.body;

    if (!CONTACT_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: 'Invalid message status' });
    }

    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Contact message not found' });
    }

    message.status = status;
    const updatedMessage = await message.save();
    await recordAuditLog(req, 'contact.status.update', 'ContactMessage', updatedMessage._id, {
      status,
      email: updatedMessage.email,
    });

    res.json(updatedMessage);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Contact message not found' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete contact message
// @route   DELETE /api/contact/admin/:id
// @access  Private/Admin
const deleteContactMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Contact message not found' });
    }

    await ContactMessage.deleteOne({ _id: message._id });
    await recordAuditLog(req, 'contact.delete', 'ContactMessage', message._id, {
      email: message.email,
      subject: message.subject,
    });
    res.json({ message: 'Contact message removed' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Contact message not found' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export {
  createContactMessage,
  getContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
};
