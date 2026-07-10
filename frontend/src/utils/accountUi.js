export const ACCOUNT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile Details' },
  { id: 'addresses', label: 'Addresses' },
  { id: 'orders', label: 'My Orders' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'returns', label: 'Returns' },
  { id: 'password', label: 'Change Password' },
];

export const createInitialAddressForm = () => ({
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  isDefault: false,
});

export const formatAddressLines = (address = {}) =>
  [
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state].filter(Boolean).join(', '),
    [address.postalCode, address.country].filter(Boolean).join(' '),
  ].filter(Boolean);
