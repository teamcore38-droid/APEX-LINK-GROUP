export const normalizeShippingAddress = (shippingAddress = {}, fallbackCustomer = {}) => ({
  fullName: shippingAddress.fullName || fallbackCustomer.name || '',
  phone: shippingAddress.phone || fallbackCustomer.phone || '',
  email: shippingAddress.email || fallbackCustomer.email || '',
  addressLine1: shippingAddress.addressLine1 || shippingAddress.address || '',
  addressLine2: shippingAddress.addressLine2 || '',
  city: shippingAddress.city || '',
  state: shippingAddress.state || '',
  postalCode: shippingAddress.postalCode || '',
  country: shippingAddress.country || '',
});

export const getCustomerContactDetails = (order = {}, fallbackCustomer = {}) => {
  const normalizedAddress = normalizeShippingAddress(
    order.shippingAddress,
    order.user || fallbackCustomer
  );

  return {
    fullName: normalizedAddress.fullName || order.user?.name || fallbackCustomer.name || 'Valued Customer',
    email: normalizedAddress.email || order.user?.email || fallbackCustomer.email || 'Not available',
    phone: normalizedAddress.phone || order.user?.phone || fallbackCustomer.phone || 'Not available',
  };
};

export const getShippingAddressLines = (shippingAddress = {}, fallbackCustomer = {}) => {
  const normalized = normalizeShippingAddress(shippingAddress, fallbackCustomer);

  return [
    normalized.addressLine1,
    normalized.addressLine2,
    [normalized.city, normalized.state].filter(Boolean).join(', '),
    [normalized.postalCode, normalized.country].filter(Boolean).join(' '),
  ].filter(Boolean);
};

export const getEstimatedDeliveryLabel = (createdAt) => {
  const orderDate = new Date(createdAt);
  const estStart = new Date(orderDate);
  estStart.setDate(orderDate.getDate() + 3);
  const estEnd = new Date(orderDate);
  estEnd.setDate(orderDate.getDate() + 5);

  return `${estStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} - ${estEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

export const buildOrderTimeline = (order = {}) => {
  if (Array.isArray(order.statusHistory) && order.statusHistory.length > 0) {
    return order.statusHistory.map((entry, index) => ({
      id: `${entry.updatedAt || index}-${entry.status || 'status'}`,
      status: entry.status || 'Processing',
      note: entry.note || '',
      updatedAt: entry.updatedAt,
      updatedByName: entry.updatedByName || '',
    }));
  }

  const fallbackTimeline = [
    {
      id: `created-${order._id || 'order'}`,
      status: order.orderStatus || 'Processing',
      note: 'Order created.',
      updatedAt: order.createdAt,
      updatedByName: '',
    },
  ];

  if (order.paidAt || order.isPaid) {
    fallbackTimeline.push({
      id: `paid-${order._id || 'order'}`,
      status: order.orderStatus || 'Processing',
      note: 'Payment completed.',
      updatedAt: order.paidAt || order.updatedAt || order.createdAt,
      updatedByName: '',
    });
  }

  if (order.deliveredAt || order.isDelivered) {
    fallbackTimeline.push({
      id: `delivered-${order._id || 'order'}`,
      status: 'Delivered',
      note: 'Order marked as delivered.',
      updatedAt: order.deliveredAt || order.updatedAt || order.createdAt,
      updatedByName: '',
    });
  }

  return fallbackTimeline;
};
