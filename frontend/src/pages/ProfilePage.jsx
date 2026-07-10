import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight,
  Heart,
  Home,
  Loader2,
  LockKeyhole,
  MapPin,
  Package,
  Pencil,
  RotateCcw,
  ShoppingBag,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';
import { ACCOUNT_TABS, createInitialAddressForm, formatAddressLines } from '../utils/accountUi';
import {
  getDeliveryBadgeClass,
  getDeliveryLabel,
  getOrderStatusBadgeClass,
  getPaymentBadgeClass,
  getPaymentLabel,
} from '../utils/orderStatus';

const EmptyStateCard = ({ icon: Icon, title, body, actionLabel, onAction }) => (
  <div className="rounded-[28px] border border-dashed border-brand-accent/30 bg-brand-light px-6 py-12 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-primary shadow-sm">
      <Icon size={24} />
    </div>
    <p className="mt-5 font-serif text-2xl font-bold text-brand-dark">{title}</p>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-gray-500">{body}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-6 inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

const AddressFormFields = ({ form, onChange }) => (
  <div className="grid gap-5 md:grid-cols-2">
    <div>
      <label className="mb-2 block text-sm font-semibold text-brand-dark">Full Name</label>
      <input
        name="fullName"
        type="text"
        value={form.fullName}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
      />
    </div>
    <div>
      <label className="mb-2 block text-sm font-semibold text-brand-dark">Phone</label>
      <input
        name="phone"
        type="text"
        value={form.phone}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
      />
    </div>
    <div className="md:col-span-2">
      <label className="mb-2 block text-sm font-semibold text-brand-dark">Address Line 1</label>
      <input
        name="addressLine1"
        type="text"
        value={form.addressLine1}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
      />
    </div>
    <div className="md:col-span-2">
      <label className="mb-2 block text-sm font-semibold text-brand-dark">Address Line 2</label>
      <input
        name="addressLine2"
        type="text"
        value={form.addressLine2}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
      />
    </div>
    <div>
      <label className="mb-2 block text-sm font-semibold text-brand-dark">City</label>
      <input
        name="city"
        type="text"
        value={form.city}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
      />
    </div>
    <div>
      <label className="mb-2 block text-sm font-semibold text-brand-dark">State / Province</label>
      <input
        name="state"
        type="text"
        value={form.state}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
      />
    </div>
    <div>
      <label className="mb-2 block text-sm font-semibold text-brand-dark">Postal Code</label>
      <input
        name="postalCode"
        type="text"
        value={form.postalCode}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
      />
    </div>
    <div>
      <label className="mb-2 block text-sm font-semibold text-brand-dark">Country</label>
      <input
        name="country"
        type="text"
        value={form.country}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
      />
    </div>
    <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-brand-dark">
      <input
        name="isDefault"
        type="checkbox"
        checked={form.isDefault}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
      />
      Set as default delivery address
    </label>
  </div>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userInfo, logout, syncUserInfo } = useAuth();

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const [addressForm, setAddressForm] = useState(createInitialAddressForm());
  const [editingAddressId, setEditingAddressId] = useState('');
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressMessage, setAddressMessage] = useState('');
  const [addressError, setAddressError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const activeTab = useMemo(() => {
    const nextTab = searchParams.get('tab') || 'overview';
    return ACCOUNT_TABS.some((tab) => tab.id === nextTab) ? nextTab : 'overview';
  }, [searchParams]);

  useEffect(() => {
    if (!userInfo?.token) {
      navigate('/login?redirect=/profile');
      return;
    }

    const loadAccount = async () => {
      setLoading(true);
      setError('');

      try {
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        const [profileResponse, ordersResponse, wishlistResponse, returnsResponse] = await Promise.all([
          axios.get('/api/users/profile', config),
          axios.get('/api/orders/myorders', config),
          axios.get('/api/wishlist', config),
          axios.get('/api/returns/my', config),
        ]);

        setProfile(profileResponse.data);
        setOrders(ordersResponse.data);
        setWishlist(wishlistResponse.data);
        setReturnRequests(returnsResponse.data);
        setProfileForm({
          name: profileResponse.data.name || '',
          email: profileResponse.data.email || '',
          phone: profileResponse.data.phone || '',
        });
      } catch (loadError) {
        console.error(loadError);
        setError(loadError.response?.data?.message || 'Unable to load your account right now.');
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, [navigate, userInfo]);

  const defaultAddress = useMemo(
    () => profile?.addresses?.find((address) => address.isDefault) || null,
    [profile]
  );
  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);
  const totalSpent = useMemo(
    () => orders.reduce((total, order) => total + (order.totalPrice || 0), 0),
    [orders]
  );

  const updateTab = (nextTab) => {
    setSearchParams({ tab: nextTab });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileMessage('');
    setProfileError('');
    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const submitProfileUpdate = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');
    setProfileError('');

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      };

      const { data } = await axios.put('/api/users/profile', profileForm, config);
      syncUserInfo(data);
      setProfile((currentProfile) => ({
        ...currentProfile,
        ...data,
      }));
      setProfileMessage('Profile updated successfully.');
    } catch (saveError) {
      console.error(saveError);
      setProfileError(saveError.response?.data?.message || 'Unable to update your profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddressChange = (event) => {
    const { checked, name, type, value } = event.target;
    setAddressMessage('');
    setAddressError('');
    setAddressForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const startAddressEdit = (address) => {
    setEditingAddressId(address._id);
    setAddressError('');
    setAddressMessage('');
    setAddressForm({
      fullName: address.fullName || '',
      phone: address.phone || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || '',
      isDefault: Boolean(address.isDefault),
    });
  };

  const resetAddressForm = () => {
    setEditingAddressId('');
    setAddressForm(createInitialAddressForm());
  };

  const syncAddresses = (addresses) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      addresses,
    }));
  };

  const submitAddress = async (event) => {
    event.preventDefault();
    setAddressSaving(true);
    setAddressError('');
    setAddressMessage('');

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      };

      const { data } = editingAddressId
        ? await axios.put(`/api/users/addresses/${editingAddressId}`, addressForm, config)
        : await axios.post('/api/users/addresses', addressForm, config);

      syncAddresses(data);
      setAddressMessage(editingAddressId ? 'Address updated successfully.' : 'Address added successfully.');
      resetAddressForm();
    } catch (saveError) {
      console.error(saveError);
      setAddressError(saveError.response?.data?.message || 'Unable to save this address.');
    } finally {
      setAddressSaving(false);
    }
  };

  const deleteAddress = async (addressId) => {
    const confirmed = window.confirm('Delete this saved address?');

    if (!confirmed) {
      return;
    }

    setAddressError('');
    setAddressMessage('');

    try {
      const { data } = await axios.delete(`/api/users/addresses/${addressId}`, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      });

      syncAddresses(data);
      setAddressMessage('Address deleted successfully.');

      if (editingAddressId === addressId) {
        resetAddressForm();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setAddressError(deleteError.response?.data?.message || 'Unable to delete this address.');
    }
  };

  const makeDefaultAddress = async (addressId) => {
    setAddressError('');
    setAddressMessage('');

    try {
      const { data } = await axios.put(
        `/api/users/addresses/${addressId}/default`,
        {},
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      syncAddresses(data);
      setAddressMessage('Default address updated.');
    } catch (defaultError) {
      console.error(defaultError);
      setAddressError(defaultError.response?.data?.message || 'Unable to update default address.');
    }
  };

  const removeWishlistItem = async (productId) => {
    try {
      const { data } = await axios.delete(`/api/wishlist/${productId}`, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      });

      setWishlist(data);
    } catch (wishlistError) {
      console.error(wishlistError);
      setError(wishlistError.response?.data?.message || 'Unable to update wishlist.');
    }
  };

  const requestReturn = async (order) => {
    const reason = window.prompt('Why would you like to return this order?');

    if (!reason) {
      return;
    }

    try {
      const { data } = await axios.post(
        '/api/returns',
        {
          orderId: order._id,
          reason,
          resolution: 'Refund',
          items: order.orderItems,
        },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setReturnRequests((current) => [data, ...current]);
      setSearchParams({ tab: 'returns' });
    } catch (returnError) {
      console.error(returnError);
      setError(returnError.response?.data?.message || 'Unable to create return request.');
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordMessage('');
    setPasswordError('');
    setPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const submitPasswordChange = async (event) => {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordMessage('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      setPasswordSaving(false);
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      };

      const { data } = await axios.put('/api/users/change-password', passwordForm, config);
      setPasswordMessage(data.message || 'Password updated successfully.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (saveError) {
      console.error(saveError);
      setPasswordError(saveError.response?.data?.message || 'Unable to update your password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#f7f9fc]">
        <div className="h-14 w-14 animate-spin rounded-full border-b-2 border-t-2 border-brand-accent" />
        <p className="mt-4 font-serif text-xl text-brand-dark">Preparing your account dashboard...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-3xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="font-serif text-3xl font-bold text-brand-dark">Unable to load your account</p>
          <p className="mt-3 text-sm text-red-700">{error || 'Please try again shortly.'}</p>
          <Link
            to="/products"
            className="mt-8 inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-12">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="rounded-[32px] bg-brand-dark px-6 py-12 text-white shadow-2xl sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Customer Account</p>
              <h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">Welcome back, {profile.name}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
                Manage profile details, delivery addresses, orders, and password settings from one polished dashboard.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Account Summary</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-serif font-bold">{orders.length}</p>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/65">Orders</p>
                </div>
                <div>
                  <p className="text-2xl font-serif font-bold">{formatCurrency(totalSpent)}</p>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/65">Spent</p>
                </div>
                <div>
                  <p className="text-2xl font-serif font-bold">{profile.addresses?.length || 0}</p>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/65">Addresses</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
              <div className="text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#f7f9fc] bg-brand-primary text-4xl font-serif font-bold text-white shadow-md">
                  {profile.name?.charAt(0).toUpperCase()}
                </div>
                <h2 className="mt-4 font-serif text-2xl font-bold text-brand-dark">{profile.name}</h2>
                <p className="mt-1 text-sm text-gray-500">{profile.email}</p>
                {profile.phone && <p className="mt-1 text-sm text-gray-500">{profile.phone}</p>}
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">
                  Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="mt-6 space-y-2">
                {ACCOUNT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => updateTab(tab.id)}
                    className={`flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'bg-brand-primary text-white'
                        : 'text-brand-dark hover:bg-brand-light'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-brand-primary/20 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
              >
                Sign Out
              </button>
            </section>

            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Quick Actions</p>
              <div className="mt-5 grid gap-3">
                {[
                  ['Edit Profile', 'profile', Pencil],
                  ['Manage Addresses', 'addresses', MapPin],
                  ['View Orders', 'orders', Package],
                  ['Change Password', 'password', LockKeyhole],
                ].map(([label, tabId, Icon]) => (
                  <button
                    key={tabId}
                    type="button"
                    onClick={() => updateTab(tabId)}
                    className="inline-flex items-center justify-between rounded-2xl border border-gray-100 bg-brand-light px-4 py-4 text-left transition-colors duration-200 hover:bg-[#eaeef6]"
                  >
                    <span className="inline-flex items-center text-sm font-semibold text-brand-dark">
                      <Icon size={16} className="mr-3 text-brand-accent" /> {label}
                    </span>
                    <ArrowRight size={16} className="text-gray-400" />
                  </button>
                ))}
                <Link
                  to="/products"
                  className="inline-flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm font-semibold text-brand-dark transition-colors duration-200 hover:bg-brand-light"
                >
                  <span className="inline-flex items-center">
                    <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Continue Shopping
                  </span>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>
              </div>
            </section>
          </aside>

          <section className="space-y-8">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                      <User size={20} />
                    </div>
                    <h3 className="mt-4 font-serif text-2xl font-bold text-brand-dark">Profile</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-600">
                      Keep your contact information up to date for smoother ordering and delivery.
                    </p>
                    <button
                      type="button"
                      onClick={() => updateTab('profile')}
                      className="mt-5 inline-flex items-center text-sm font-bold uppercase tracking-[0.18em] text-brand-primary"
                    >
                      Edit Profile <ArrowRight size={14} className="ml-2" />
                    </button>
                  </div>

                  <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                      <Home size={20} />
                    </div>
                    <h3 className="mt-4 font-serif text-2xl font-bold text-brand-dark">Default Address</h3>
                    {defaultAddress ? (
                      <div className="mt-3 text-sm leading-7 text-gray-600">
                        <p className="font-semibold text-brand-dark">{defaultAddress.fullName}</p>
                        {formatAddressLines(defaultAddress).map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm leading-7 text-gray-600">
                        You have not added a delivery address yet.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => updateTab('addresses')}
                      className="mt-5 inline-flex items-center text-sm font-bold uppercase tracking-[0.18em] text-brand-primary"
                    >
                      Manage Addresses <ArrowRight size={14} className="ml-2" />
                    </button>
                  </div>

                  <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                      <Package size={20} />
                    </div>
                    <h3 className="mt-4 font-serif text-2xl font-bold text-brand-dark">Recent Orders</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-600">
                      Track current deliveries and revisit your latest product selections.
                    </p>
                    <button
                      type="button"
                      onClick={() => updateTab('orders')}
                      className="mt-5 inline-flex items-center text-sm font-bold uppercase tracking-[0.18em] text-brand-primary"
                    >
                      View Orders <ArrowRight size={14} className="ml-2" />
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Order Snapshot</p>
                      <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Your latest orders</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateTab('orders')}
                      className="inline-flex items-center rounded-full border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                    >
                      Full Order History
                    </button>
                  </div>

                  {recentOrders.length === 0 ? (
                    <div className="mt-6">
                      <EmptyStateCard
                        icon={Package}
                        title="No orders yet"
                        body="Once you place your first order, your dashboard will show status updates and quick links here."
                        actionLabel="Start Shopping"
                        onAction={() => navigate('/products')}
                      />
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-4 lg:grid-cols-3">
                      {recentOrders.map((order) => {
                        const status = order.orderStatus || 'Processing';

                        return (
                          <article
                            key={order._id}
                            className="rounded-[24px] border border-gray-100 bg-brand-light p-5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-mono text-xs font-bold text-brand-primary">{order._id}</span>
                              <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${getOrderStatusBadgeClass(status)}`}>
                                {status}
                              </span>
                            </div>
                            <p className="mt-4 font-serif text-2xl font-bold text-brand-dark">
                              {formatCurrency(order.totalPrice)}
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            <Link
                              to={`/orders/${order._id}`}
                              className="mt-5 inline-flex items-center text-sm font-bold uppercase tracking-[0.16em] text-brand-primary"
                            >
                              View Order <ArrowRight size={14} className="ml-2" />
                            </Link>
                            <Link
                              to={`/orders/${order._id}/invoice`}
                              className="mt-3 inline-flex items-center text-xs font-bold uppercase tracking-[0.16em] text-brand-primary/80 transition-colors duration-200 hover:text-brand-primary"
                            >
                              View Invoice
                            </Link>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Profile Details</p>
                <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Update your account information</h2>

                {profileError && (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {profileError}
                  </div>
                )}

                {profileMessage && (
                  <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {profileMessage}
                  </div>
                )}

                <form className="mt-6 space-y-5" onSubmit={submitProfileUpdate}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-brand-dark">Full Name</label>
                      <input
                        name="name"
                        type="text"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-brand-dark">Phone</label>
                      <input
                        name="phone"
                        type="text"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-brand-dark">Email Address</label>
                    <input
                      name="email"
                      type="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="inline-flex items-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {profileSaving && <Loader2 size={16} className="mr-2 animate-spin" />}
                    Save Profile
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-8">
                <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Address Book</p>
                      <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Manage saved delivery addresses</h2>
                    </div>
                    {editingAddressId && (
                      <button
                        type="button"
                        onClick={resetAddressForm}
                        className="inline-flex items-center rounded-full border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                      >
                        <RotateCcw size={14} className="mr-2" /> Add New Address
                      </button>
                    )}
                  </div>

                  {addressError && (
                    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {addressError}
                    </div>
                  )}

                  {addressMessage && (
                    <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                      {addressMessage}
                    </div>
                  )}

                  <form className="mt-6 space-y-5" onSubmit={submitAddress}>
                    <AddressFormFields form={addressForm} onChange={handleAddressChange} />
                    <button
                      type="submit"
                      disabled={addressSaving}
                      className="inline-flex items-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addressSaving && <Loader2 size={16} className="mr-2 animate-spin" />}
                      {editingAddressId ? 'Update Address' : 'Save Address'}
                    </button>
                  </form>
                </div>

                <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Saved Addresses</p>
                  <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Your delivery destinations</h2>

                  {profile.addresses?.length === 0 ? (
                    <div className="mt-6">
                      <EmptyStateCard
                        icon={MapPin}
                        title="You have not added a delivery address yet."
                        body="Save one or more delivery addresses here so your account is ready for smooth future orders."
                      />
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-5 lg:grid-cols-2">
                      {profile.addresses.map((address) => (
                        <article
                          key={address._id}
                          className="rounded-[24px] border border-gray-100 bg-brand-light p-5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="font-serif text-2xl font-bold text-brand-dark">{address.fullName}</h3>
                              <p className="text-sm text-gray-500">{address.phone}</p>
                            </div>
                            {address.isDefault && (
                              <span className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-green-700">
                                Default
                              </span>
                            )}
                          </div>

                          <div className="mt-4 text-sm leading-7 text-gray-600">
                            {formatAddressLines(address).map((line) => (
                              <p key={line}>{line}</p>
                            ))}
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startAddressEdit(address)}
                              className="inline-flex items-center rounded-full border border-brand-primary/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                            >
                              <Pencil size={12} className="mr-2" /> Edit
                            </button>
                            {!address.isDefault && (
                              <button
                                type="button"
                                onClick={() => makeDefaultAddress(address._id)}
                                className="inline-flex items-center rounded-full border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-brand-dark transition-colors duration-200 hover:bg-gray-50"
                              >
                                <Star size={12} className="mr-2" /> Make Default
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteAddress(address._id)}
                              className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-red-700 transition-colors duration-200 hover:bg-red-100"
                            >
                              <Trash2 size={12} className="mr-2" /> Delete
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Order History</p>
                    <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Review and track your orders</h2>
                  </div>
                  <Link
                    to="/track-order"
                    className="inline-flex items-center rounded-full border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                  >
                    Track an Order
                  </Link>
                </div>

                {orders.length === 0 ? (
                  <div className="mt-6">
                    <EmptyStateCard
                      icon={Package}
                      title="You haven't placed any orders yet."
                      body="Once your first order is placed, you’ll be able to review status, totals, and shipment progress here."
                      actionLabel="Start Shopping"
                      onAction={() => navigate('/products')}
                    />
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {orders.map((order) => {
                      const itemQty = order.orderItems.reduce((acc, item) => acc + item.qty, 0);
                      const status = order.orderStatus || 'Processing';

                      return (
                        <article
                          key={order._id}
                          className="rounded-[24px] border border-gray-100 bg-gradient-to-br from-white to-brand-light p-5"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="font-mono text-xs font-bold text-brand-primary">{order._id}</p>
                              <p className="mt-2 font-serif text-2xl font-bold text-brand-dark">
                                {formatCurrency(order.totalPrice)}
                              </p>
                              <p className="mt-1 text-sm text-gray-500">
                                {new Date(order.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="mt-2 text-sm text-gray-500">
                                {itemQty} {itemQty === 1 ? 'item' : 'items'}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getOrderStatusBadgeClass(status)}`}>
                                {status}
                              </span>
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentBadgeClass(order)}`}>
                                {getPaymentLabel(order)}
                              </span>
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDeliveryBadgeClass(order.isDelivered, status)}`}>
                                {getDeliveryLabel(order.isDelivered, status)}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Link
                                to={`/orders/${order._id}`}
                                className="inline-flex items-center rounded-md bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
                              >
                                View Details <ArrowRight size={14} className="ml-2" />
                              </Link>
                              <Link
                                to={`/orders/${order._id}/invoice`}
                                className="inline-flex items-center rounded-md border border-brand-primary/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                              >
                                Invoice
                              </Link>
                              <button
                                type="button"
                                onClick={() => requestReturn(order)}
                                className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-amber-700 transition-colors duration-200 hover:bg-amber-100"
                              >
                                Return
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Wishlist</p>
                <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Saved for later</h2>

                {wishlist.length === 0 ? (
                  <div className="mt-6">
                    <EmptyStateCard
                      icon={Heart}
                      title="Your wishlist is empty."
                      body="Save products from the product page and they will appear here for quick access."
                      actionLabel="Browse Products"
                      onAction={() => navigate('/products')}
                    />
                  </div>
                ) : (
                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    {wishlist.map((item) => (
                      <article key={item._id} className="flex gap-4 rounded-[24px] border border-gray-100 bg-brand-light p-4">
                        <img src={item.product?.image} alt={item.product?.name} className="h-24 w-24 rounded-2xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif text-xl font-bold text-brand-dark">{item.product?.name}</h3>
                          <p className="mt-1 text-sm font-semibold text-brand-primary">{formatCurrency(item.product?.price || 0)}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                              to={`/product/${item.product?._id}`}
                              className="rounded-full bg-brand-primary px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeWishlistItem(item.product?._id)}
                              className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'returns' && (
              <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Returns / RMA</p>
                <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Return request history</h2>

                {returnRequests.length === 0 ? (
                  <div className="mt-6">
                    <EmptyStateCard
                      icon={Package}
                      title="No return requests yet."
                      body="Use the Return button from your order history when an order needs review."
                    />
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {returnRequests.map((returnRequest) => (
                      <article key={returnRequest._id} className="rounded-[24px] border border-gray-100 bg-brand-light p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-xs font-bold text-brand-primary">{returnRequest.order?._id || returnRequest.order}</p>
                            <h3 className="mt-2 font-serif text-2xl font-bold text-brand-dark">{returnRequest.resolution}</h3>
                          </div>
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                            {returnRequest.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-gray-600">{returnRequest.reason}</p>
                        {returnRequest.adminNote && (
                          <p className="mt-3 rounded-2xl bg-white p-3 text-sm text-gray-600">{returnRequest.adminNote}</p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'password' && (
              <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Password Management</p>
                <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Keep your account secure</h2>

                {passwordError && (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {passwordError}
                  </div>
                )}

                {passwordMessage && (
                  <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {passwordMessage}
                  </div>
                )}

                <form className="mt-6 space-y-5" onSubmit={submitPasswordChange}>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-brand-dark">Current Password</label>
                    <input
                      name="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                    />
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-brand-dark">New Password</label>
                      <input
                        name="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-brand-dark">Confirm New Password</label>
                      <input
                        name="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="inline-flex items-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {passwordSaving && <Loader2 size={16} className="mr-2 animate-spin" />}
                      Update Password
                    </button>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-semibold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
                    >
                      Need a reset link instead?
                    </Link>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
