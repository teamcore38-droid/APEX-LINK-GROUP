import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  CreditCard,
  Home,
  Loader2,
  LockKeyhole,
  LogIn,
  MapPin,
  ShieldCheck,
  Truck,
  UserRound,
  RotateCcw,
} from 'lucide-react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';
import { formatCurrency } from '../utils/productUi';
import { normalizeShippingAddress } from '../utils/orderUi';
import { getMarketingSessionId, trackEvent } from '../utils/analytics';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

const createInitialCheckoutForm = (shippingAddress = {}, userInfo = null) => {
  const normalized = normalizeShippingAddress(shippingAddress, {
    name: userInfo?.name || '',
    email: userInfo?.email || '',
    phone: userInfo?.phone || '',
  });

  return {
    fullName: normalized.fullName,
    phone: normalized.phone,
    email: normalized.email,
    addressLine1: normalized.addressLine1,
    addressLine2: normalized.addressLine2,
    city: normalized.city,
    state: normalized.state,
    postalCode: normalized.postalCode,
    country: normalized.country,
  };
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const validateCheckoutForm = (form) => {
  const requiredFields = [
    ['fullName', 'Full name'],
    ['phone', 'Phone number'],
    ['email', 'Email address'],
    ['addressLine1', 'Address line 1'],
    ['city', 'City'],
    ['state', 'State / Province'],
    ['postalCode', 'Postal code'],
    ['country', 'Country'],
  ];

  for (const [field, label] of requiredFields) {
    if (!String(form[field] || '').trim()) {
      return `${label} is required`;
    }
  }

  if (!isValidEmail(form.email)) {
    return 'Please enter a valid email address';
  }

  return '';
};

const cardElementOptions = {
  style: {
    base: {
      color: '#0b1f3a',
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      '::placeholder': {
        color: '#7b8aa1',
      },
    },
    invalid: {
      color: '#b91c1c',
    },
  },
};

const CheckoutInner = ({ stripeEnabled, stripe = null, elements = null }) => {
  const { cartItems, shippingAddress, saveShippingAddress, clearCart } = useCart();
  const { userInfo } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [form, setForm] = useState(() => createInitialCheckoutForm(shippingAddress, userInfo));
  const [saveAddressToBook, setSaveAddressToBook] = useState(false);
  const [setDefaultAddress, setSetDefaultAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [shippingRateId, setShippingRateId] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const guestCheckoutEnabled = true;

  useEffect(() => {
    if (cartItems.length === 0) {
      return;
    }

    trackEvent(
      'begin_checkout',
      {
        value: cartItems.reduce((total, item) => total + Number(item.price || 0) * Number(item.qty || 0), 0),
        currency,
        itemCount: cartItems.reduce((total, item) => total + Number(item.qty || 0), 0),
      },
      { token: userInfo?.token }
    );
  }, [cartItems, currency, userInfo?.token]);

  useEffect(() => {
    if (!userInfo?.token) {
      return;
    }

    const loadAddresses = async () => {
      setAddressesLoading(true);

      try {
        const { data } = await axios.get('/api/users/addresses', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });

        const sortedAddresses = [...data].sort((left, right) =>
          left.isDefault === right.isDefault ? 0 : left.isDefault ? -1 : 1
        );

        setAddresses(sortedAddresses);

        const defaultAddress = sortedAddresses.find((address) => address.isDefault);

        if (
          defaultAddress &&
          !shippingAddress?.addressLine1 &&
          !shippingAddress?.address &&
          !shippingAddress?.city
        ) {
          setSelectedAddressId(defaultAddress._id);
          setForm((currentForm) => ({
            ...currentForm,
            ...normalizeShippingAddress(defaultAddress, {
              email: userInfo.email || currentForm.email,
            }),
          }));
          setSaveAddressToBook(true);
          setSetDefaultAddress(Boolean(defaultAddress.isDefault));
        }
      } catch (loadError) {
        console.error(loadError);
      } finally {
        setAddressesLoading(false);
      }
    };

    loadAddresses();
  }, [shippingAddress, userInfo]);

  const itemsPrice = useMemo(
    () => cartItems.reduce((accumulator, item) => accumulator + item.price * item.qty, 0),
    [cartItems]
  );
  const shippingPrice = itemsPrice > 50 ? 0 : 10;
  const taxPrice = Number((itemsPrice * 0.15).toFixed(2));
  const totalPrice = itemsPrice + shippingPrice + taxPrice;
  const displayItemsPrice = quote?.itemsPrice ?? itemsPrice;
  const displayShippingPrice = quote?.shippingPrice ?? shippingPrice;
  const displayTaxPrice = quote?.taxPrice ?? taxPrice;
  const displayDiscountPrice = quote?.discountPrice ?? 0;
  const displayGiftCardAmount = quote?.giftCardAmount ?? 0;
  const displayTotalPrice = quote?.totalPrice ?? totalPrice;
  const displayCurrency = quote?.currency || currency;

  const requestQuote = async (nextShippingAddress = form) => {
    if (cartItems.length === 0) {
      return null;
    }

    setQuoteLoading(true);
    setError('');

    try {
      const { data } = await axios.post(
        '/api/orders/quote',
        {
          orderItems: cartItems,
          shippingAddress: {
            ...nextShippingAddress,
            address: nextShippingAddress.addressLine1,
          },
          couponCode,
          giftCardCode,
          shippingRateId,
          currency,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {}),
          },
        }
      );

      setQuote(data);
      trackEvent(
        'checkout_quote',
        {
          value: data.totalPrice,
          currency: data.currency || currency,
          itemCount: cartItems.reduce((total, item) => total + Number(item.qty || 0), 0),
        },
        { token: userInfo?.token }
      );

      if (!shippingRateId && data.shippingOptions?.[0]?.id) {
        setShippingRateId(data.shippingOptions[0].id);
      }

      return data;
    } catch (quoteError) {
      console.error(quoteError);
      setQuote(null);
      setError(quoteError.response?.data?.message || 'Unable to refresh pricing right now.');
      return null;
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setError('');
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSelectSavedAddress = (addressId) => {
    setSelectedAddressId(addressId);
    setError('');

    if (!addressId) {
      setForm(createInitialCheckoutForm(shippingAddress, userInfo));
      setSetDefaultAddress(false);
      return;
    }

    const nextAddress = addresses.find((address) => address._id === addressId);

    if (!nextAddress) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      ...normalizeShippingAddress(nextAddress, {
        email: userInfo?.email || currentForm.email,
      }),
    }));
    setSaveAddressToBook(true);
    setSetDefaultAddress(Boolean(nextAddress.isDefault));
  };

  const createOrder = async (nextShippingAddress) => {
    const { data } = await axios.post(
      userInfo?.token ? '/api/orders' : '/api/orders/guest',
      {
        orderItems: cartItems,
        shippingAddress: nextShippingAddress,
        paymentMethod: userInfo?.token && stripeEnabled ? 'Card' : 'Development Placeholder',
        paymentProvider: userInfo?.token && stripeEnabled ? 'Stripe' : 'Manual',
        couponCode,
        giftCardCode,
        shippingRateId,
        currency,
        saveAddress: Boolean(userInfo && saveAddressToBook),
        setDefaultAddress: Boolean(userInfo && saveAddressToBook && setDefaultAddress),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {}),
        },
      }
    );

    if (data.guestAccessToken) {
      localStorage.setItem(`apexGuestOrder:${data._id}`, data.guestAccessToken);
    }

    axios
      .post(
        '/api/marketing/abandoned-cart',
        {
          sessionId: getMarketingSessionId(),
          email: nextShippingAddress.email,
          name: nextShippingAddress.fullName,
          items: cartItems,
          subtotal: cartItems.reduce((total, item) => total + Number(item.price || 0) * Number(item.qty || 0), 0),
          currency,
          checkoutUrl: `${window.location.origin}/checkout`,
        },
        {
          headers: {
            'x-session-id': getMarketingSessionId(),
            ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {}),
          },
        }
      )
      .catch((abandonedCartError) => console.error(abandonedCartError));

    return data;
  };

  const finalizeSuccess = (order) => {
    trackEvent(
      'purchase',
      {
        orderId: order._id,
        value: order.totalPrice,
        currency: order.currency || currency,
        itemCount: order.orderItems?.reduce((total, item) => total + Number(item.qty || 0), 0) || 0,
      },
      { token: userInfo?.token }
    );
    axios
      .post(
        '/api/marketing/abandoned-cart/recovered',
        {
          sessionId: getMarketingSessionId(),
          email: order.shippingAddress?.email || form.email,
          orderId: order._id,
        },
        {
          headers: {
            'x-session-id': getMarketingSessionId(),
            ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {}),
          },
        }
      )
      .catch((recoverError) => console.error(recoverError));
    setSuccess(true);
    setPendingOrderId('');
    clearCart();

    setTimeout(() => {
      navigate(`/order/${order._id}/confirm`, { state: { order } });
    }, 900);
  };

  const placeOrderHandler = async (event) => {
    event.preventDefault();
    setError('');

    const validationError = validateCheckoutForm(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (stripeEnabled && (!stripe || !elements)) {
      setError('Secure payment is still loading. Please wait a moment and try again.');
      return;
    }

    const nextShippingAddress = {
      ...form,
      address: form.addressLine1,
    };

    saveShippingAddress(nextShippingAddress);
    setLoading(true);

    try {
      await requestQuote(nextShippingAddress);
      let order = null;

      if (pendingOrderId) {
        const { data } = await axios.get(`/api/orders/${pendingOrderId}`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });
        order = data;
      } else {
        order = await createOrder(nextShippingAddress);
        setPendingOrderId(order._id);
      }

      if (order.isPaid) {
        finalizeSuccess(order);
        return;
      }

      if (!stripeEnabled || !userInfo?.token) {
        finalizeSuccess(order);
        return;
      }

      const { data: paymentIntentData } = await axios.post(
        '/api/payments/create-payment-intent',
        { orderId: order._id },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error('Card details are not ready yet.');
      }

      const paymentConfirmation = await stripe.confirmCardPayment(
        paymentIntentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: form.fullName,
              email: form.email,
              phone: form.phone,
              address: {
                line1: form.addressLine1,
                line2: form.addressLine2,
                city: form.city,
                state: form.state,
                postal_code: form.postalCode,
                country: form.country,
              },
            },
          },
        }
      );

      if (paymentConfirmation.error) {
        setError(
          paymentConfirmation.error.message ||
            'Payment could not be completed. Please review your card details and try again.'
        );
        return;
      }

      const { data: paidOrder } = await axios.put(
        `/api/orders/${order._id}/pay`,
        {
          paymentIntentId:
            paymentConfirmation.paymentIntent?.id || paymentIntentData.paymentIntentId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      finalizeSuccess(paidOrder);
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError.response?.data?.message ||
          submitError.message ||
          'Unable to complete checkout right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0 && !success) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-20">
        <div className="rounded-[32px] border border-dashed border-brand-accent/30 bg-white px-6 py-14 text-center shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand-primary shadow-sm">
            <Home size={28} />
          </div>
          <h1 className="mt-6 font-serif text-4xl font-bold text-brand-dark">Your cart is empty</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-500">
            Add a few premium products to your cart before heading to checkout.
          </p>
          <Link
            to="/products"
            className="mt-8 inline-flex items-center rounded-md bg-brand-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-[32px] border border-green-200 bg-green-50 p-10 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-green-600 shadow-sm">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="mt-6 font-serif text-4xl font-bold text-brand-dark">Order Placed Successfully!</h2>
          <p className="mt-3 text-lg text-gray-600">
            Thank you for choosing Apex Link Group for your next order.
          </p>
          <p className="mt-2 text-sm text-green-700">
            You will be redirected to your order confirmation page shortly.
          </p>
        </div>
      </div>
    );
  }

  if (!userInfo && !guestCheckoutEnabled) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="rounded-[32px] bg-brand-dark px-6 py-12 text-white shadow-2xl sm:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Checkout</p>
            <h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">Sign in to continue checkout</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
              Your cart is ready. Sign in to use saved addresses, keep your order history in one place, and complete your purchase securely.
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                <LogIn size={24} />
              </div>
              <h2 className="mt-5 font-serif text-3xl font-bold text-brand-dark">Unlock a smoother checkout</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Sign in to reuse your address book, review future order updates from your account dashboard, and keep tracking details connected to your profile.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login?redirect=/checkout"
                  className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
                >
                  Sign In to Checkout
                </Link>
                <Link
                  to="/register?redirect=/checkout"
                  className="inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                >
                  Create Account
                </Link>
              </div>
            </section>

            <aside className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
              <h2 className="border-b border-gray-100 pb-4 font-serif text-2xl font-bold text-brand-dark">
                Order Summary
              </h2>
              <div className="mt-6 max-h-72 space-y-4 overflow-y-auto pr-2">
                {cartItems.map((item, index) => (
                  <div
                    key={`${item.product}-${index}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="h-14 w-14 rounded-2xl object-cover" />
                      <div>
                        <h4 className="text-sm font-bold text-brand-dark">{item.name}</h4>
                        <p className="text-xs text-gray-500">Qty: {item.qty}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-brand-dark">
                      {formatCurrency(item.qty * item.price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3 border-t border-gray-200 pt-4 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Items subtotal</span>
                  <span className="font-semibold text-brand-dark">{formatCurrency(displayItemsPrice, displayCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-brand-dark">{formatCurrency(displayShippingPrice, displayCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="font-semibold text-brand-dark">{formatCurrency(displayTaxPrice, displayCurrency)}</span>
                </div>
                {displayDiscountPrice > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Coupon discount</span>
                    <span className="font-semibold">-{formatCurrency(displayDiscountPrice, displayCurrency)}</span>
                  </div>
                )}
                {displayGiftCardAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Gift card</span>
                    <span className="font-semibold">-{formatCurrency(displayGiftCardAmount, displayCurrency)}</span>
                  </div>
                )}
                {quote?.shippingRate?.service && (
                  <div className="text-xs text-gray-500">
                    {quote.shippingRate.carrier} - {quote.shippingRate.service}
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed pt-4 font-serif text-xl font-bold text-brand-dark">
                  <span>Total</span>
                  <span className="text-brand-primary">{formatCurrency(displayTotalPrice, displayCurrency)}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-12">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="rounded-[32px] bg-brand-dark px-6 py-12 text-white shadow-2xl sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Checkout</p>
          <h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">Complete your premium order</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
            Confirm your contact details, choose the right delivery address, and complete payment with a secure, polished flow.
          </p>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {pendingOrderId && !success && (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            Your order has already been created and is waiting for payment confirmation. You can safely retry payment without losing your cart.
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <form onSubmit={placeOrderHandler} className="space-y-8">
            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Saved Addresses</p>
                  <h2 className="font-serif text-2xl font-bold text-brand-dark">Choose a delivery destination</h2>
                </div>
              </div>

              {addressesLoading ? (
                <div className="mt-6 flex items-center text-sm text-gray-500">
                  <Loader2 size={16} className="mr-2 animate-spin" /> Loading your saved addresses...
                </div>
              ) : addresses.length === 0 ? (
                <p className="mt-6 text-sm leading-7 text-gray-600">
                  You don&apos;t have a saved delivery address yet. Fill in the form below and save it to your address book if you&apos;d like.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  <label htmlFor="saved-address-select" className="block">
                    <span className="mb-2 block text-sm font-semibold text-brand-dark">Saved address</span>
                    <CustomSelect
                      id="saved-address-select"
                      value={selectedAddressId}
                      onChange={(nextValue) => handleSelectSavedAddress(nextValue)}
                      options={[
                        { value: '', label: 'Enter a new address manually' },
                        ...addresses.map((address) => ({
                          value: address._id,
                          label: `${address.fullName} - ${address.addressLine1}${address.isDefault ? ' (Default)' : ''}`,
                        })),
                      ]}
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    {addresses.map((address) => (
                      <article
                        key={address._id}
                        className={`rounded-[24px] border p-4 transition ${
                          selectedAddressId === address._id
                            ? 'border-brand-primary bg-brand-light'
                            : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-serif text-xl font-bold text-brand-dark">{address.fullName}</p>
                            <p className="text-sm text-gray-500">{address.phone}</p>
                          </div>
                          {address.isDefault && (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-green-700">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm leading-7 text-gray-600">
                          {[
                            address.addressLine1,
                            address.addressLine2,
                            [address.city, address.state].filter(Boolean).join(', '),
                            [address.postalCode, address.country].filter(Boolean).join(' '),
                          ]
                            .filter(Boolean)
                            .join(' | ')}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Pricing Options</p>
                  <h2 className="font-serif text-2xl font-bold text-brand-dark">Promos, currency, and shipping</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-brand-dark">Currency</label>
                  <CustomSelect
                    value={currency}
                    onChange={(nextValue) => {
                      setCurrency(nextValue);
                      setQuote(null);
                    }}
                    options={[
                      { value: 'LKR', label: 'LKR' },
                      { value: 'USD', label: 'USD' },
                      { value: 'EUR', label: 'EUR' },
                      { value: 'GBP', label: 'GBP' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-brand-dark">Shipping Service</label>
                  <CustomSelect
                    value={shippingRateId}
                    onChange={(nextValue) => {
                      setShippingRateId(nextValue);
                      setQuote(null);
                    }}
                    options={[
                      { value: '', label: 'Best available rate' },
                      ...(quote?.shippingOptions || []).map((option) => ({
                        value: option.id,
                        label: `${option.carrier} - ${option.service} (${formatCurrency(option.price, quote.currency)})`,
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-brand-dark">Coupon Code</label>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(event) => {
                      setCouponCode(event.target.value.toUpperCase());
                      setQuote(null);
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-brand-dark">Gift Card Code</label>
                  <input
                    type="text"
                    value={giftCardCode}
                    onChange={(event) => {
                      setGiftCardCode(event.target.value.toUpperCase());
                      setQuote(null);
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => requestQuote(form)}
                disabled={quoteLoading}
                className="mt-5 inline-flex items-center rounded-xl border border-brand-primary/20 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {quoteLoading && <Loader2 size={16} className="mr-2 animate-spin" />}
                Refresh Pricing
              </button>
            </section>

            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                  <UserRound size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Contact Information</p>
                  <h2 className="font-serif text-2xl font-bold text-brand-dark">How should we reach you?</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="checkout-full-name" className="mb-2 block text-sm font-semibold text-brand-dark">Full Name</label>
                  <input
                    id="checkout-full-name"
                    name="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-phone" className="mb-2 block text-sm font-semibold text-brand-dark">Phone</label>
                  <input
                    id="checkout-phone"
                    name="phone"
                    type="text"
                    value={form.phone}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="checkout-email" className="mb-2 block text-sm font-semibold text-brand-dark">Email Address</label>
                  <input
                    id="checkout-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                  <Home size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Delivery Address</p>
                  <h2 className="font-serif text-2xl font-bold text-brand-dark">Where should we deliver?</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="checkout-address-line1" className="mb-2 block text-sm font-semibold text-brand-dark">Address Line 1</label>
                  <input
                    id="checkout-address-line1"
                    name="addressLine1"
                    type="text"
                    value={form.addressLine1}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="checkout-address-line2" className="mb-2 block text-sm font-semibold text-brand-dark">Address Line 2</label>
                  <input
                    id="checkout-address-line2"
                    name="addressLine2"
                    type="text"
                    value={form.addressLine2}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-city" className="mb-2 block text-sm font-semibold text-brand-dark">City</label>
                  <input
                    id="checkout-city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-state" className="mb-2 block text-sm font-semibold text-brand-dark">State / Province</label>
                  <input
                    id="checkout-state"
                    name="state"
                    type="text"
                    value={form.state}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-postal-code" className="mb-2 block text-sm font-semibold text-brand-dark">Postal Code</label>
                  <input
                    id="checkout-postal-code"
                    name="postalCode"
                    type="text"
                    value={form.postalCode}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-country" className="mb-2 block text-sm font-semibold text-brand-dark">Country</label>
                  <input
                    id="checkout-country"
                    name="country"
                    type="text"
                    value={form.country}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-brand-dark">
                  <input
                    type="checkbox"
                    checked={saveAddressToBook}
                    onChange={(event) => setSaveAddressToBook(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
                  />
                  Save this address to my address book
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-brand-dark">
                  <input
                    type="checkbox"
                    checked={setDefaultAddress}
                    onChange={(event) => setSetDefaultAddress(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
                    disabled={!saveAddressToBook}
                  />
                  Set as default address
                </label>
              </div>
            </section>

            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Payment Method</p>
                  <h2 className="font-serif text-2xl font-bold text-brand-dark">
                    {stripeEnabled ? 'Secure card payment' : 'Development payment mode'}
                  </h2>
                </div>
              </div>

              {stripeEnabled ? (
                <div className="mt-6 rounded-[24px] border border-brand-accent/15 bg-[#f5f8fc] p-5">
                  <div className="mb-4 flex items-center gap-2 text-brand-dark">
                    <LockKeyhole size={16} />
                    <p className="text-sm font-semibold">Secure payment powered by Stripe</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                    <CardElement options={cardElementOptions} />
                  </div>
                  <p className="mt-4 text-sm leading-7 text-gray-600">
                    Your card is confirmed securely through Stripe. Apex Link Group never stores your raw card details.
                  </p>
                </div>
              ) : (
                <div className="mt-6 rounded-[24px] border border-brand-accent/15 bg-[#f5f8fc] p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-accent">
                    Development mode
                  </p>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    Stripe keys are not configured, so checkout will place the order in safe manual-payment mode. This keeps development moving without blocking checkout.
                  </p>
                  <label className="mt-4 inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-dark shadow-sm">
                    <input type="radio" checked readOnly className="mr-2" />
                    Manual / Development Placeholder
                  </label>
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-brand-accent/20 bg-[#f5f8fc] p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-primary shadow-sm">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-brand-dark">Trust & Security</h2>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    We use your checkout details to fulfill your order, support delivery, and connect updates to your account history. If Stripe is enabled, payment is confirmed before we clear your cart.
                  </p>
                </div>
              </div>
            </section>
          </form>

          <aside className="space-y-6">
            <div className="sticky top-24 rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
              <h2 className="border-b border-gray-100 pb-4 font-serif text-2xl font-bold text-brand-dark">
                Order Summary
              </h2>

              <div className="mt-6 max-h-72 space-y-4 overflow-y-auto pr-2">
                {cartItems.map((item, index) => (
                  <div
                    key={`${item.product}-${index}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="h-14 w-14 rounded-2xl object-cover" />
                      <div>
                        <h4 className="text-sm font-bold text-brand-dark">{item.name}</h4>
                        <p className="text-xs text-gray-500">Qty: {item.qty}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-brand-dark">
                      {formatCurrency(item.qty * item.price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3 border-t border-gray-200 pt-4 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Items subtotal</span>
                  <span className="font-semibold text-brand-dark">{formatCurrency(displayItemsPrice, displayCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-brand-dark">{formatCurrency(displayShippingPrice, displayCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="font-semibold text-brand-dark">{formatCurrency(displayTaxPrice, displayCurrency)}</span>
                </div>
                {displayDiscountPrice > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Coupon discount</span>
                    <span className="font-semibold">-{formatCurrency(displayDiscountPrice, displayCurrency)}</span>
                  </div>
                )}
                {displayGiftCardAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Gift card</span>
                    <span className="font-semibold">-{formatCurrency(displayGiftCardAmount, displayCurrency)}</span>
                  </div>
                )}
                {quote?.shippingRate?.service && (
                  <div className="text-xs text-gray-500">
                    {quote.shippingRate.carrier} - {quote.shippingRate.service}
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed pt-4 font-serif text-xl font-bold text-brand-dark">
                  <span>Total</span>
                  <span className="text-brand-primary">{formatCurrency(displayTotalPrice, displayCurrency)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={placeOrderHandler}
                disabled={loading || (stripeEnabled && (!stripe || !elements))}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand-primary px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark ${
                  loading || (stripeEnabled && (!stripe || !elements))
                    ? 'cursor-not-allowed opacity-70'
                    : ''
                }`}
              >
                {loading ? (
                  <Loader2 size={18} className="mr-2 animate-spin" />
                ) : (
                  <Truck size={18} className="mr-2" />
                )}
                {loading
                  ? stripeEnabled
                    ? 'Processing Payment...'
                    : 'Placing Order...'
                  : stripeEnabled
                    ? 'Pay & Place Order'
                    : 'Place Order'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const StripeCheckoutContent = () => {
  const stripe = useStripe();
  const elements = useElements();

  return <CheckoutInner stripeEnabled stripe={stripe} elements={elements} />;
};

const ManualCheckoutContent = () => <CheckoutInner stripeEnabled={false} />;

const CheckoutPage = () => {
  if (stripePromise) {
    return (
      <Elements stripe={stripePromise}>
        <StripeCheckoutContent />
      </Elements>
    );
  }

  return <ManualCheckoutContent />;
};

export default CheckoutPage;
