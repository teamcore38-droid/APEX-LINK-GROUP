import Product from '../models/productModel.js';
import InventoryEvent from '../models/inventoryEventModel.js';

const getActorName = (actor = {}) => actor.name || actor.email || '';

const getStockHolder = (product, variantId = null) => {
  if (!variantId) {
    return product;
  }

  return product.variants.id(variantId) || null;
};

const getAvailableStock = (holder) =>
  Math.max(Number(holder.countInStock || 0) - Number(holder.reservedStock || 0), 0);

const createInventoryEvent = async ({
  product,
  holder,
  variantId = null,
  order,
  type,
  quantity,
  previousStock,
  nextStock,
  note = '',
  actor = {},
}) => {
  await InventoryEvent.create({
    product: product._id,
    variantId,
    order: order?._id,
    type,
    quantity,
    previousStock,
    nextStock,
    note,
    createdBy: actor._id,
    createdByName: getActorName(actor),
  });

  const threshold = Number(holder.lowStockThreshold ?? product.lowStockThreshold ?? 0);

  if (type !== 'low-stock-alert' && threshold >= 0 && getAvailableStock(holder) <= threshold) {
    await InventoryEvent.create({
      product: product._id,
      variantId,
      order: order?._id,
      type: 'low-stock-alert',
      quantity: 0,
      previousStock: nextStock,
      nextStock,
      note: `${product.name} is at or below low-stock threshold (${threshold}).`,
      createdBy: actor._id,
      createdByName: getActorName(actor),
    });
  }
};

const applyReservation = async ({ order, actor = {} }) => {
  if (!order || order.inventoryStatus !== 'Not Reserved') {
    return false;
  }

  for (const item of order.orderItems) {
    const product = await Product.findById(item.product);
    const holder = product ? getStockHolder(product, item.variantId) : null;

    if (!product || !holder) {
      throw new Error(`${item.name} is no longer available`);
    }

    const qty = Number(item.qty || 0);
    const availableStock = getAvailableStock(holder);

    if (qty > availableStock) {
      throw new Error(`${item.name} has only ${availableStock} available`);
    }

    const previousStock = Number(holder.countInStock || 0);
    holder.reservedStock = Number(holder.reservedStock || 0) + qty;
    await product.save();
    await createInventoryEvent({
      product,
      holder,
      variantId: item.variantId || null,
      order,
      type: 'reserved',
      quantity: qty,
      previousStock,
      nextStock: Number(holder.countInStock || 0),
      note: `Reserved for order ${order._id}.`,
      actor,
    });
  }

  order.inventoryStatus = 'Reserved';
  order.inventoryEventsAppliedAt = {
    ...order.inventoryEventsAppliedAt,
    reservedAt: new Date(),
  };
  return true;
};

const deductReservedInventory = async ({ order, actor = {} }) => {
  if (!order || order.inventoryStatus === 'Deducted') {
    return false;
  }

  if (order.inventoryStatus === 'Not Reserved') {
    await applyReservation({ order, actor });
  }

  for (const item of order.orderItems) {
    const product = await Product.findById(item.product);
    const holder = product ? getStockHolder(product, item.variantId) : null;

    if (!product || !holder) {
      throw new Error(`${item.name} is no longer available`);
    }

    const qty = Number(item.qty || 0);
    const previousStock = Number(holder.countInStock || 0);
    holder.countInStock = Math.max(previousStock - qty, 0);
    holder.reservedStock = Math.max(Number(holder.reservedStock || 0) - qty, 0);
    await product.save();
    await createInventoryEvent({
      product,
      holder,
      variantId: item.variantId || null,
      order,
      type: 'deducted',
      quantity: qty,
      previousStock,
      nextStock: Number(holder.countInStock || 0),
      note: `Deducted after payment for order ${order._id}.`,
      actor,
    });
  }

  order.inventoryStatus = 'Deducted';
  order.inventoryEventsAppliedAt = {
    ...order.inventoryEventsAppliedAt,
    deductedAt: new Date(),
  };
  return true;
};

const releaseReservedInventory = async ({ order, actor = {}, note = '' }) => {
  if (!order || order.inventoryStatus !== 'Reserved') {
    return false;
  }

  for (const item of order.orderItems) {
    const product = await Product.findById(item.product);
    const holder = product ? getStockHolder(product, item.variantId) : null;

    if (!product || !holder) {
      continue;
    }

    const qty = Number(item.qty || 0);
    const previousStock = Number(holder.countInStock || 0);
    holder.reservedStock = Math.max(Number(holder.reservedStock || 0) - qty, 0);
    await product.save();
    await createInventoryEvent({
      product,
      holder,
      variantId: item.variantId || null,
      order,
      type: 'released',
      quantity: qty,
      previousStock,
      nextStock: Number(holder.countInStock || 0),
      note: note || `Released reservation for order ${order._id}.`,
      actor,
    });
  }

  order.inventoryStatus = 'Released';
  order.inventoryEventsAppliedAt = {
    ...order.inventoryEventsAppliedAt,
    releasedAt: new Date(),
  };
  return true;
};

export { applyReservation, deductReservedInventory, releaseReservedInventory };
