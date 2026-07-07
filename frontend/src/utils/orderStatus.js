export const ORDER_STATUS_OPTIONS = [
  'Processing',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export const PAYMENT_STATUS_OPTIONS = [
  'Paid',
  'Unpaid',
  'Payment Pending',
  'Payment Failed',
  'Payment Cancelled',
  'Cancelled',
  'Refunded',
];

export const REFUND_STATUS_OPTIONS = [
  'Not Refunded',
  'Partially Refunded',
  'Refunded',
  'Refund Failed',
];

export const ORDER_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'total-high', label: 'Highest Total' },
  { value: 'total-low', label: 'Lowest Total' },
];

export const ORDER_PAYMENT_FILTER_OPTIONS = [
  { value: '', label: 'All Payment States' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
];

export const ORDER_DELIVERY_FILTER_OPTIONS = [
  { value: '', label: 'All Delivery States' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'not-delivered', label: 'Not Delivered' },
];

export const ORDER_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Order Statuses' },
  ...ORDER_STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
];

export const ORDER_QUICK_ACTIONS = [
  {
    status: 'Confirmed',
    label: 'Confirm',
    className: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
  {
    status: 'Packed',
    label: 'Pack',
    className: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
  {
    status: 'Shipped',
    label: 'Ship',
    className: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
  },
  {
    status: 'Delivered',
    label: 'Deliver',
    className: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
  },
  {
    status: 'Cancelled',
    label: 'Cancel',
    className: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  },
];

export const getNormalizedPaymentStatus = (paymentStatusOrValue, isPaid) => {
  if (paymentStatusOrValue && typeof paymentStatusOrValue === 'object') {
    return getNormalizedPaymentStatus(
      paymentStatusOrValue.paymentStatus,
      paymentStatusOrValue.isPaid
    );
  }

  if (
    typeof paymentStatusOrValue === 'string' &&
    PAYMENT_STATUS_OPTIONS.includes(paymentStatusOrValue)
  ) {
    return paymentStatusOrValue;
  }

  if (typeof paymentStatusOrValue === 'boolean') {
    return paymentStatusOrValue ? 'Paid' : 'Unpaid';
  }

  if (typeof isPaid === 'boolean') {
    return isPaid ? 'Paid' : 'Unpaid';
  }

  return 'Payment Pending';
};

export const getOrderStatusBadgeClass = (status) => {
  switch (status) {
    case 'Shipped':
    case 'Out for Delivery':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Delivered':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'Cancelled':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Processing':
    case 'Confirmed':
    case 'Packed':
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};

export const getPaymentBadgeClass = (paymentStatusOrValue, isPaid) => {
  switch (getNormalizedPaymentStatus(paymentStatusOrValue, isPaid)) {
    case 'Paid':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'Payment Failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Payment Cancelled':
    case 'Cancelled':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'Refunded':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'Payment Pending':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Unpaid':
    default:
      return 'bg-red-50 text-red-700 border-red-200';
  }
};

export const getDeliveryBadgeClass = (isDelivered, orderStatus) => {
  if (isDelivered) {
    return 'bg-green-50 text-green-700 border-green-200';
  }

  if (orderStatus === 'Cancelled') {
    return 'bg-gray-100 text-gray-600 border-gray-200';
  }

  return 'bg-amber-50 text-amber-700 border-amber-200';
};

export const getPaymentLabel = (paymentStatusOrValue, isPaid) =>
  getNormalizedPaymentStatus(paymentStatusOrValue, isPaid);

export const getDeliveryLabel = (isDelivered, orderStatus) => {
  if (isDelivered) {
    return 'Delivered';
  }

  if (orderStatus === 'Cancelled') {
    return 'Cancelled';
  }

  return 'Not Delivered';
};

export const getRefundBadgeClass = (refundStatus) => {
  switch (refundStatus) {
    case 'Refunded':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'Partially Refunded':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Refund Failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Not Refunded':
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};
