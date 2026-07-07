const normalizeAddressPayload = (payload = {}) => ({
  fullName: String(payload.fullName || '').trim(),
  phone: String(payload.phone || '').trim(),
  email: String(payload.email || '').trim().toLowerCase(),
  addressLine1: String(payload.addressLine1 || payload.address || '').trim(),
  addressLine2: String(payload.addressLine2 || '').trim(),
  city: String(payload.city || '').trim(),
  state: String(payload.state || '').trim(),
  postalCode: String(payload.postalCode || '').trim(),
  country: String(payload.country || '').trim(),
  isDefault: Boolean(payload.isDefault),
});

const validateAddressPayload = (address) => {
  if (!address.fullName) {
    return 'Full name is required';
  }

  if (!address.phone) {
    return 'Phone number is required';
  }

  if (!address.addressLine1) {
    return 'Address line 1 is required';
  }

  if (!address.city) {
    return 'City is required';
  }

  if (!address.state) {
    return 'State is required';
  }

  if (!address.postalCode) {
    return 'Postal code is required';
  }

  if (!address.country) {
    return 'Country is required';
  }

  return '';
};

const isSameAddress = (left = {}, right = {}) =>
  [
    'fullName',
    'phone',
    'addressLine1',
    'addressLine2',
    'city',
    'state',
    'postalCode',
    'country',
  ].every((field) => String(left[field] || '').trim() === String(right[field] || '').trim());

const markDefaultAddress = (addresses, addressId) => {
  addresses.forEach((address) => {
    address.isDefault = address._id.toString() === addressId.toString();
  });
};

const ensureSingleDefaultAddress = (addresses) => {
  if (!addresses?.length) {
    return;
  }

  const defaultAddress = addresses.find((address) => address.isDefault);

  if (!defaultAddress) {
    addresses[0].isDefault = true;
    return;
  }

  markDefaultAddress(addresses, defaultAddress._id);
};

const saveAddressToUser = async (user, incomingAddress, options = {}) => {
  const normalizedAddress = normalizeAddressPayload(incomingAddress);
  const validationError = validateAddressPayload(normalizedAddress);

  if (validationError) {
    return {
      error: validationError,
    };
  }

  const matchingAddress = user.addresses.find((address) =>
    isSameAddress(address.toObject ? address.toObject() : address, normalizedAddress)
  );

  if (matchingAddress) {
    if (options.setDefault || normalizedAddress.isDefault) {
      markDefaultAddress(user.addresses, matchingAddress._id);
      await user.save();
    }

    return {
      saved: false,
      address: matchingAddress,
      addresses: user.addresses,
    };
  }

  const shouldBeDefault =
    user.addresses.length === 0 || options.setDefault || normalizedAddress.isDefault;

  user.addresses.push({
    ...normalizedAddress,
    isDefault: shouldBeDefault,
  });

  if (shouldBeDefault) {
    const newAddress = user.addresses[user.addresses.length - 1];
    markDefaultAddress(user.addresses, newAddress._id);
  } else {
    ensureSingleDefaultAddress(user.addresses);
  }

  await user.save();

  return {
    saved: true,
    address: user.addresses[user.addresses.length - 1],
    addresses: user.addresses,
  };
};

export {
  normalizeAddressPayload,
  validateAddressPayload,
  isSameAddress,
  markDefaultAddress,
  ensureSingleDefaultAddress,
  saveAddressToUser,
};
