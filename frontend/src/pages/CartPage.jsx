import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, ArrowLeft, MapPin, ChevronDown, Loader2, X } from 'lucide-react';
import { formatCurrency } from '../utils/productUi';
import CustomSelect from '../components/CustomSelect';

const SL_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Moneragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

/* ── District Modal ─────────────────────────────────────────────────── */
const DistrictModal = ({ onClose, onConfirm, initialDistrict, cartItems }) => {
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState(initialDistrict || '');
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fee, setFee] = useState(null);
  const [feeError, setFeeError] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = SL_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(query.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch fee when district changes
  useEffect(() => {
    if (!district) { setFee(null); return; }
    setFetching(true);
    setFeeError('');
    axios
      .post('/api/orders/shipping-rates', {
        shippingAddress: { state: district, country: 'Sri Lanka' },
        orderItems: cartItems,
        currency: 'LKR',
      })
      .then(({ data }) => {
        // The API returns an array directly, not an object with shippingOptions
        const rate = Array.isArray(data) ? data[0] : data?.shippingOptions?.[0];
        setFee(rate ? Number(rate.basePrice || rate.price) : 0);
      })
      .catch(() => {
        setFeeError('Could not fetch shipping fee. Please try again.');
        setFee(null);
      })
      .finally(() => setFetching(false));
  }, [district]);

  const handleSelect = (d) => {
    setDistrict(d);
    setQuery(d);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setDistrict('');
    setFee(null);
    setOpen(true);
  };

  const canContinue = district && fee !== null && !fetching && !feeError;

  const handleConfirm = () => {
    if (canContinue) onConfirm(district, fee);
  };

  // Trap focus / ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
      <div className="relative w-full max-w-md rounded-[28px] bg-white shadow-[0_24px_60px_rgba(53,26,17,0.22)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-brand-dark px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-accent">Delivery Location</p>
              <h2 className="font-serif text-xl font-bold">Select Your District</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Country — fixed */}
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Country</label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-500">
              🇱🇰 <span>Sri Lanka</span>
              <span className="ml-auto text-xs text-gray-400 italic">Fixed</span>
            </div>
          </div>

          {/* District searchable dropdown */}
          <div className="mb-5" ref={dropdownRef}>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
              District <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type or select district…"
                value={district ? district : query}
                onChange={handleInputChange}
                onFocus={() => setOpen(true)}
                className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 pr-10 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
              />
              <ChevronDown
                size={16}
                className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              />
              {open && filtered.length > 0 && (
                <ul className="absolute z-10 mt-1.5 max-h-52 w-full overflow-y-auto rounded-2xl border border-gray-100 bg-white py-1.5 shadow-xl">
                  {filtered.map((d) => (
                    <li
                      key={d}
                      onMouseDown={() => handleSelect(d)}
                      className={`cursor-pointer px-4 py-2.5 text-sm transition-colors hover:bg-brand-light ${
                        d === district ? 'bg-brand-light font-semibold text-brand-primary' : 'text-brand-dark'
                      }`}
                    >
                      {d}
                    </li>
                  ))}
                </ul>
              )}
              {open && filtered.length === 0 && query && (
                <div className="absolute z-10 mt-1.5 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-400 shadow-xl">
                  No districts found for "{query}"
                </div>
              )}
            </div>
          </div>

          {/* Shipping fee display */}
          <div className="mb-6 rounded-2xl border border-brand-accent/20 bg-[#fbf3ea] px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-dark">Shipping Fee</span>
              {fetching ? (
                <Loader2 size={16} className="animate-spin text-brand-accent" />
              ) : feeError ? (
                <span className="text-xs font-medium text-red-500">{feeError}</span>
              ) : fee !== null ? (
                <span className="font-bold text-brand-primary">{formatCurrency(fee, 'LKR')}</span>
              ) : (
                <span className="text-xs italic text-gray-400">Select a district above</span>
              )}
            </div>
            {district && fee !== null && !fetching && (
              <p className="mt-1 text-xs text-gray-500">Delivery to <strong>{district}</strong> district</p>
            )}
          </div>

          {/* Action */}
          <button
            onClick={handleConfirm}
            disabled={!canContinue}
            className={`w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-[0.18em] transition-all duration-200 ${
              canContinue
                ? 'bg-brand-primary text-white hover:bg-brand-dark shadow-md'
                : 'cursor-not-allowed bg-gray-200 text-gray-400'
            }`}
          >
            {fetching ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin" /> Calculating…
              </span>
            ) : (
              'Continue to Checkout'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── CartPage ────────────────────────────────────────────────────────── */
const CartPage = () => {
  const { cartItems, addToCart, removeFromCart, selectedDistrict, districtShippingFee, saveDistrict } = useCart();
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const subtotal = cartItems.reduce((acc, item) => acc + item.qty * item.price, 0);

  const checkoutHandler = () => {
    setShowModal(true);
  };

  const handleModalConfirm = (district, fee) => {
    saveDistrict(district, fee);
    setShowModal(false);
    if (userInfo) {
      navigate('/checkout');
    } else {
      navigate('/login?redirect=/checkout');
    }
  };

  return (
    <>
      {showModal && (
        <DistrictModal
          onClose={() => setShowModal(false)}
          onConfirm={handleModalConfirm}
          initialDistrict={selectedDistrict}
          cartItems={cartItems}
        />
      )}

      <div className="container mx-auto px-4 pt-4 md:pt-6 pb-16">
        <h1 className="text-3xl font-serif font-bold mb-8">Shopping Cart</h1>
        
        {cartItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 mb-6 text-lg">Your cart is currently empty.</p>
            <Link to="/products" className="btn-primary inline-block">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="hidden md:grid grid-cols-5 text-sm uppercase tracking-wider text-gray-500 font-semibold">
                    <div className="col-span-2">Product</div>
                    <div className="text-center">Price</div>
                    <div className="text-center">Quantity</div>
                    <div className="text-right">Total</div>
                  </div>
                </div>
                
                <ul className="divide-y divide-gray-100">
                  {cartItems.map(item => (
                    <li key={`${item.product}-${item.variantId || 'default'}`} className="p-6 flex flex-col md:grid md:grid-cols-5 items-center gap-4">
                      <div className="col-span-2 flex items-center w-full">
                        <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
                        <Link to={`/product/${item.product}`} className="ml-4 font-semibold text-brand-dark hover:text-brand-primary">
                          {item.name}
                          {item.variantLabel && (
                            <span className="mt-1 block text-xs font-medium text-gray-500">{item.variantLabel}</span>
                          )}
                        </Link>
                      </div>
                      <div className="text-center w-full md:w-auto font-medium">
                        {formatCurrency(item.price)}
                      </div>
                      <div className="flex justify-center w-full md:w-auto">
                        <CustomSelect
                          value={item.qty}
                          onChange={(nextValue) => addToCart(item, Number(nextValue))}
                          className="w-[92px]"
                          buttonClassName="py-1.5 pl-3 pr-8"
                          options={[...Array(item.countInStock).keys()].map((x) => ({
                            value: x + 1,
                            label: String(x + 1),
                          }))}
                          ariaLabel={`Quantity for ${item.name}`}
                        />
                      </div>
                      <div className="flex justify-between md:justify-end items-center w-full md:w-auto w-full font-bold">
                        <span className="md:hidden">Total: </span>
                        {formatCurrency(item.price * item.qty)}
                        <button 
                          onClick={() => removeFromCart(item.product)}
                          className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                          title="Remove from Cart"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-6">
                <Link to="/products" className="inline-flex items-center text-brand-primary hover:text-brand-dark font-medium">
                  <ArrowLeft size={16} className="mr-2" /> Continue Shopping
                </Link>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <h2 className="text-xl font-serif font-bold mb-6 pb-4 border-b border-gray-100">Order Summary</h2>
                
                <div className="flex justify-between mb-4 text-gray-600">
                  <span>Items ({cartItems.reduce((acc, item) => acc + item.qty, 0)})</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex justify-between mb-2 text-gray-600">
                  <span>Shipping</span>
                  {selectedDistrict && districtShippingFee !== undefined ? (
                    <span className="font-semibold text-brand-dark">{formatCurrency(districtShippingFee, 'LKR')}</span>
                  ) : (
                    <span className="text-xs italic text-gray-400">Select district</span>
                  )}
                </div>
                {selectedDistrict && (
                  <p className="mb-4 text-xs text-brand-accent font-medium">📍 {selectedDistrict} district</p>
                )}
                
                <div className="flex justify-between mb-8 pb-6 border-b border-gray-100 text-xl font-bold">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal + (selectedDistrict ? districtShippingFee : 0))}</span>
                </div>
                
                <button 
                  onClick={checkoutHandler}
                  className="w-full btn-primary py-3 text-lg font-bold uppercase tracking-wider"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartPage;
