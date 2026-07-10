import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Mail, Menu, ShoppingBag, User, LogOut, MapPinned } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const PRIMARY_NAV_LINKS = [
  ['HOME', '/'],
  ['SHOP', '/products'],
  ['CATEGORIES', '/categories'],
  ['RFQ', '/rfq'],
  ['EXPERIENCE', '/customer-experience'],
  ['TRACK ORDER', '/track-order'],
  ['ABOUT', '/about'],
  ['CONTACT', '/contact'],
];

const Header = () => {
  const { cartItems } = useCart();
  const { userInfo, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const canAccessAdmin = Boolean(
    userInfo?.isAdmin || userInfo?.isStaff || userInfo?.permissions?.length
  );

  const handleLogout = () => {
    setAccountMenuOpen(false);
    logout();
    navigate('/');
  };

  const isActiveLink = (path) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#081729] py-3 text-[#f7f9fc] shadow-md lg:py-4">
      <div className="container mx-auto flex items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
        <Link to="/" className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-lg font-serif font-bold uppercase tracking-[0.14em] text-brand-accent sm:text-xl sm:tracking-[0.18em] lg:text-2xl lg:tracking-widest">
            <img
              src="/Apex Logo.jpg"
              alt="Apex Link Group logo"
              className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20 sm:h-12 sm:w-12"
            />
            <span className="whitespace-nowrap">APEX LINK GROUP</span>
          </div>
          <span className="mt-1 hidden text-[10px] tracking-[0.18em] text-brand-accent/80 xl:block">
            GLOBAL MARKETPLACE
          </span>
        </Link>

        <nav className="hidden items-center gap-4 text-xs font-semibold uppercase tracking-[0.15em] lg:flex xl:gap-7 xl:text-sm xl:tracking-[0.2em]">
          {PRIMARY_NAV_LINKS.map(([label, path]) => (
            <Link
              key={path}
              to={path}
              className={`whitespace-nowrap border-b-2 pb-1 transition-colors ${
                isActiveLink(path)
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent hover:text-brand-accent'
              }`}
            >
              {label}
            </Link>
          ))}
          {canAccessAdmin && (
            <Link
              to="/admin"
              className={`border-b-2 pb-1 transition-colors ${
                isActiveLink('/admin')
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent hover:text-brand-accent'
              }`}
            >
              ADMIN
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-5">
          <Link to="/cart" className="relative inline-flex items-center transition-colors hover:text-brand-accent">
            <div className="relative">
              <ShoppingBag size={22} className="text-brand-accent" />
              {cartItems.length > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-[#081729]">
                  {cartItems.reduce((acc, item) => acc + item.qty, 0)}
                </span>
              )}
            </div>
            <span className="ml-2 hidden text-sm font-semibold uppercase tracking-wider xl:inline">Cart</span>
          </Link>

          {userInfo ? (
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] transition-colors duration-200 hover:border-brand-accent hover:text-brand-accent"
              >
                <User size={18} className="mr-2 text-brand-accent" />
                {userInfo.name?.split(' ')[0] || 'Account'}
                <ChevronDown size={16} className="ml-2" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[24px] border border-gray-100 bg-white p-3 text-brand-dark shadow-[0_18px_40px_rgba(11,31,58,0.18)]">
                  <Link
                    to="/profile"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <User size={16} className="mr-3 text-brand-accent" /> My Account
                  </Link>
                  <Link
                    to="/profile?tab=orders"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <ShoppingBag size={16} className="mr-3 text-brand-accent" /> My Orders
                  </Link>
                  <Link
                    to="/vendor/onboarding"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Vendor Onboarding
                  </Link>
                  {(userInfo.isVendor || userInfo.isAdmin) && (
                    <Link
                      to="/vendor/dashboard"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Vendor Dashboard
                    </Link>
                  )}
                  <Link
                    to="/customer-experience"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <User size={16} className="mr-3 text-brand-accent" /> Customer Experience
                  </Link>
                  <Link
                    to="/privacy-center"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <User size={16} className="mr-3 text-brand-accent" /> Privacy Center
                  </Link>
                  <Link
                    to="/track-order"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <MapPinned size={16} className="mr-3 text-brand-accent" /> Track Order
                  </Link>
                  {canAccessAdmin && (
                    <Link
                      to="/admin/professional"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Professional Admin
                    </Link>
                  )}
                  {canAccessAdmin && (
                    <Link
                      to="/admin/mobile"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Mobile Admin
                    </Link>
                  )}
                  {userInfo.isAdmin && (
                    <Link
                      to="/admin/messages"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <Mail size={16} className="mr-3 text-brand-accent" /> Messages
                    </Link>
                  )}
                  {userInfo.isAdmin && (
                    <Link
                      to="/admin/vendors"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Marketplace Ops
                    </Link>
                  )}
                  {userInfo.isAdmin && (
                    <Link
                      to="/admin/commerce"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Commerce Ops
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-2 flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-semibold text-red-700 transition-colors duration-200 hover:bg-red-50"
                  >
                    <LogOut size={16} className="mr-3" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-3 lg:flex">
              <Link
                to="/login"
                className="text-sm font-semibold uppercase tracking-[0.16em] transition-colors duration-200 hover:text-brand-accent"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full border border-brand-accent/30 px-3 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-accent transition-colors duration-200 hover:bg-brand-accent hover:text-[#081729] xl:px-4"
              >
                Register
              </Link>
            </div>
          )}

          <button
            className="rounded-md p-1.5 transition-colors hover:bg-white/10 lg:hidden"
            type="button"
            onClick={() => setAccountMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {accountMenuOpen && (
        <div className="border-t border-white/10 bg-[#060f1d] px-4 py-4 lg:hidden">
          <div className="container mx-auto space-y-3">
            <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
              {PRIMARY_NAV_LINKS.map(([label, path]) => (
                <Link
                  key={`mobile-nav-${path}`}
                  to={path}
                  onClick={() => setAccountMenuOpen(false)}
                  className={`block rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-colors ${
                    isActiveLink(path) ? 'bg-brand-accent/20 text-brand-accent' : 'hover:bg-white/10'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {userInfo ? (
              <>
                <Link to="/profile" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                  My Account
                </Link>
                <Link to="/profile?tab=orders" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                  My Orders
                </Link>
                <Link to="/track-order" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                  Track Order
                </Link>
                <Link to="/customer-experience" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                  Customer Experience
                </Link>
                <Link to="/privacy-center" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                  Privacy Center
                </Link>
                <Link to="/vendor/onboarding" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                  Vendor Onboarding
                </Link>
                {(userInfo.isVendor || userInfo.isAdmin) && (
                  <Link to="/vendor/dashboard" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                    Vendor Dashboard
                  </Link>
                )}
                {canAccessAdmin && (
                  <Link to="/admin" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                    Admin
                  </Link>
                )}
                {canAccessAdmin && (
                  <Link to="/admin/professional" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                    Professional Admin
                  </Link>
                )}
                {canAccessAdmin && (
                  <Link to="/admin/mobile" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                    Mobile Admin
                  </Link>
                )}
                {userInfo.isAdmin && (
                  <Link to="/admin/vendors" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                    Marketplace Ops
                  </Link>
                )}
                {userInfo.isAdmin && (
                  <Link to="/admin/messages" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                    Messages
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-xl bg-red-50 px-4 py-3 text-left text-sm font-semibold uppercase tracking-[0.14em] text-red-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="grid gap-3">
                <Link to="/login" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                  Login
                </Link>
                <Link to="/register" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl border border-brand-accent/30 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-accent">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
