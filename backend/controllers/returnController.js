import Order from '../models/orderModel.js';
import ReturnRequest from '../models/returnRequestModel.js';

const getMyReturns = async (req, res) => {
  try {
    const returns = await ReturnRequest.find({ user: req.user._id })
      .populate('order', '_id totalPrice orderStatus createdAt')
      .sort({ createdAt: -1 });

    res.json(returns);
  } catch (error) {
    console.error('[returnController:getMyReturns]', error);
    res.status(500).json({ message: 'Unable to load return requests right now' });
  }
};

const createReturnRequest = async (req, res) => {
  const { orderId = '', items = [], reason = '', resolution = 'Refund' } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!req.user.isAdmin && order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to return this order' });
    }

    if (!String(reason).trim()) {
      return res.status(400).json({ message: 'Return reason is required' });
    }

    const requestedItems = Array.isArray(items) && items.length > 0 ? items : order.orderItems;
    const normalizedItems = requestedItems.map((item) => ({
      product: item.product,
      name: item.name,
      qty: Math.max(Number.parseInt(item.qty, 10) || 1, 1),
      reason: item.reason || reason,
    }));

    const returnRequest = await ReturnRequest.create({
      order: order._id,
      user: order.user,
      items: normalizedItems,
      reason: String(reason).trim(),
      resolution,
    });

    res.status(201).json(returnRequest);
  } catch (error) {
    console.error('[returnController:createReturnRequest]', error);
    res.status(500).json({ message: 'Unable to create return request right now' });
  }
};

const getReturns = async (_req, res) => {
  try {
    const returns = await ReturnRequest.find({})
      .populate('order', '_id totalPrice orderStatus createdAt')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(returns);
  } catch (error) {
    console.error('[returnController:getReturns]', error);
    res.status(500).json({ message: 'Unable to load return requests right now' });
  }
};

const updateReturnRequest = async (req, res) => {
  const { status = '', adminNote = '' } = req.body;

  try {
    if (!['Requested', 'Approved', 'Rejected', 'Received', 'Refunded', 'Closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid return status' });
    }

    const returnRequest = await ReturnRequest.findById(req.params.id);

    if (!returnRequest) {
      return res.status(404).json({ message: 'Return request not found' });
    }

    returnRequest.status = status;
    returnRequest.adminNote = String(adminNote || '').trim();
    returnRequest.updatedBy = req.user._id;
    returnRequest.updatedByName = req.user.name || req.user.email || '';
    await returnRequest.save();

    res.json(returnRequest);
  } catch (error) {
    console.error('[returnController:updateReturnRequest]', error);
    res.status(500).json({ message: 'Unable to update return request right now' });
  }
};

export { getMyReturns, createReturnRequest, getReturns, updateReturnRequest };
