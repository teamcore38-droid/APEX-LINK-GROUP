import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Mail, Menu, PackagePlus, ShoppingBag, User, LogOut, MapPinned, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';


const PRIMARY_NAV_LINKS = [
  ['HOME', '/'],
  ['SHOP', '/products'],
  ['CATEGORIES', '/categories'],
  ['TRACK ORDER', '/track-order'],
  ['CONTACT', '/contact'],
];

const Header = () => {
  const { cartItems } = useCart();
  const { userInfo, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [desktopUserMenuOpen, setDesktopUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const desktopUserMenuRef = useRef(null);
  const mobileNavRef = useRef(null);

  const canAccessAdmin = Boolean(
    userInfo?.isAdmin || userInfo?.isStaff || userInfo?.permissions?.length
  );

  const handleLogout = () => {
    setDesktopUserMenuOpen(false);
    setMobileNavOpen(false);
    logout();
    navigate('/');
  };

  const isActiveLink = (path) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  // Close all open menus automatically on route change
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDesktopUserMenuOpen(false);
      setMobileNavOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  // Click-outside and touch-outside handler for desktop and mobile menus
  useEffect(() => {
    const handleOutsideClickOrTouch = (event) => {
      // Close desktop profile dropdown if click/touch is outside
      if (
        desktopUserMenuOpen &&
        desktopUserMenuRef.current &&
        !desktopUserMenuRef.current.contains(event.target)
      ) {
        setDesktopUserMenuOpen(false);
      }

      // Close mobile navigation drawer if click/touch is outside
      if (
        mobileNavOpen &&
        mobileNavRef.current &&
        !mobileNavRef.current.contains(event.target)
      ) {
        setMobileNavOpen(false);
      }
    };

    if (desktopUserMenuOpen || mobileNavOpen) {
      document.addEventListener('mousedown', handleOutsideClickOrTouch);
      document.addEventListener('touchstart', handleOutsideClickOrTouch);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClickOrTouch);
      document.removeEventListener('touchstart', handleOutsideClickOrTouch);
    };
  }, [desktopUserMenuOpen, mobileNavOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#2a140e] py-3 text-[#fff7ee] shadow-md lg:py-4">
      <div className="container mx-auto flex items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-1.5">
          <img
            src="/logo.webp"
            alt="Apex Fashion logo"
            width="128"
            height="128"
            fetchPriority="high"
            decoding="async"
            className="h-12 w-auto shrink-0 object-contain sm:h-14 xl:h-16"
          />
          <span className="flex min-w-0 flex-col">
            <span className="whitespace-nowrap font-serif text-lg font-bold uppercase tracking-[0.14em] text-brand-accent sm:text-xl sm:tracking-[0.18em] xl:text-2xl xl:tracking-widest">
              APEX FASHION
            </span>
            <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-brand-accent/80 sm:text-[10px] sm:tracking-[0.24em]">
              Curated. Modern. Global.
            </span>
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-4 text-xs font-semibold uppercase tracking-[0.15em] font-['Times_New_Roman',_Times,_Georgia,_serif] xl:flex 2xl:gap-7 2xl:text-sm 2xl:tracking-[0.2em]">
          {PRIMARY_NAV_LINKS.map(([label, path]) => (
            <Link
              key={path}
              to={path}
              className={`whitespace-nowrap border-b-2 pb-1 font-['Times_New_Roman',_Times,_Georgia,_serif] transition-colors ${
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
              className={`border-b-2 pb-1 font-['Times_New_Roman',_Times,_Georgia,_serif] transition-colors ${
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
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-[#2a140e]">
                  {cartItems.reduce((acc, item) => acc + item.qty, 0)}
                </span>
              )}
            </div>
            <span className="ml-2 hidden text-sm font-semibold uppercase tracking-wider font-['Times_New_Roman',_Times,_Georgia,_serif] xl:inline">Cart</span>
          </Link>

          {userInfo ? (
            <div ref={desktopUserMenuRef} className="relative hidden xl:block">
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  setDesktopUserMenuOpen((open) => !open);
                }}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] transition-colors duration-200 hover:border-brand-accent hover:text-brand-accent"
                aria-expanded={desktopUserMenuOpen}
                aria-label="User Account Menu"
              >
                <User size={18} className="mr-2 text-brand-accent" />
                {userInfo.name?.split(' ')[0] || 'Account'}
                <ChevronDown
                  size={16}
                  className={`ml-2 transition-transform duration-200 ${
                    desktopUserMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {desktopUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[24px] border border-gray-100 bg-white p-3 text-brand-dark shadow-[0_18px_40px_rgba(53,26,17,0.18)] animate-in fade-in slide-in-from-top-1 z-50">
                  <Link
                    to="/profile"
                    onClick={() => setDesktopUserMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <User size={16} className="mr-3 text-brand-accent" /> My Account
                  </Link>
                  <Link
                    to="/profile?tab=orders"
                    onClick={() => setDesktopUserMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <ShoppingBag size={16} className="mr-3 text-brand-accent" /> My Orders
                  </Link>
                  {/* Temporarily hidden: Vendor Onboarding & Customer Experience
                  <Link
                    to="/vendor/onboarding"
                    onClick={() => setDesktopUserMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Vendor Onboarding
                  </Link>
                  */}
                  {(userInfo.isVendor || userInfo.isAdmin) && (
                    <Link
                      to="/vendor/dashboard"
                      onClick={() => setDesktopUserMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Vendor Dashboard
                    </Link>
                  )}
                  {/* Temporarily hidden: Customer Experience
                  <Link
                    to="/customer-experience"
                    onClick={() => setDesktopUserMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <User size={16} className="mr-3 text-brand-accent" /> Customer Experience
                  </Link>
                  */}
                  <Link
                    to="/privacy-center"
                    onClick={() => setDesktopUserMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <User size={16} className="mr-3 text-brand-accent" /> Privacy Center
                  </Link>
                  <Link
                    to="/track-order"
                    onClick={() => setDesktopUserMenuOpen(false)}
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                  >
                    <MapPinned size={16} className="mr-3 text-brand-accent" /> Track Order
                  </Link>
                  {canAccessAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setDesktopUserMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Products
                    </Link>
                  )}
                  {canAccessAdmin && (
                    <Link
                      to="/admin/products/new"
                      onClick={() => setDesktopUserMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <PackagePlus size={16} className="mr-3 text-brand-accent" /> Add Product
                    </Link>
                  )}
                  {canAccessAdmin && (
                    <Link
                      to="/admin/professional"
                      onClick={() => setDesktopUserMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Professional Admin
                    </Link>
                  )}
                  {canAccessAdmin && (
                    <Link
                      to="/admin/mobile"
                      onClick={() => setDesktopUserMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Mobile Admin
                    </Link>
                  )}
                  {userInfo.isAdmin && (
                    <Link
                      to="/admin/messages"
                      onClick={() => setDesktopUserMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <Mail size={16} className="mr-3 text-brand-accent" /> Messages
                    </Link>
                  )}
                  {userInfo.isAdmin && (
                    <Link
                      to="/admin/vendors"
                      onClick={() => setDesktopUserMenuOpen(false)}
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light"
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Marketplace Ops
                    </Link>
                  )}
                  {userInfo.isAdmin && (
                    <Link
                      to="/admin/commerce"
                      onClick={() => setDesktopUserMenuOpen(false)}
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
            <div className="hidden items-center gap-3 xl:flex">
              <Link
                to="/login"
                className="text-sm font-semibold uppercase tracking-[0.16em] transition-colors duration-200 hover:text-brand-accent"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full border border-brand-accent/30 px-3 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-accent transition-colors duration-200 hover:bg-brand-accent hover:text-[#2a140e] xl:px-4"
              >
                Register
              </Link>
            </div>
          )}

          <div ref={mobileNavRef} className="relative xl:hidden">
            <button
              className="rounded-md p-1.5 transition-colors hover:bg-white/10"
              type="button"
              onClick={() => {
                setDesktopUserMenuOpen(false);
                setMobileNavOpen((open) => !open);
              }}
              aria-expanded={mobileNavOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {mobileNavOpen && (
              <div className="fixed inset-x-0 top-[65px] border-t border-white/10 bg-[#1f0f0a] px-4 py-4 font-['Times_New_Roman',_Times,_Georgia,_serif] shadow-2xl animate-in fade-in slide-in-from-top-1 z-50">
                <div className="container mx-auto space-y-3">


                  <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
                    {PRIMARY_NAV_LINKS.map(([label, path]) => (
                      <Link
                        key={`mobile-nav-${path}`}
                        to={path}
                        onClick={() => setMobileNavOpen(false)}
                        className={`block rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] font-['Times_New_Roman',_Times,_Georgia,_serif] transition-colors ${
                          isActiveLink(path) ? 'bg-brand-accent/20 text-brand-accent' : 'hover:bg-white/10'
                        }`}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>

                  {userInfo ? (
                    <>
                      <Link to="/profile" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                        My Account
                      </Link>
                      <Link to="/profile?tab=orders" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                        My Orders
                      </Link>
                      <Link to="/track-order" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                        Track Order
                      </Link>
                      {/* Temporarily hidden: Customer Experience & Vendor Onboarding
                      <Link to="/customer-experience" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                        Customer Experience
                      </Link>
                      */}
                      <Link to="/privacy-center" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                        Privacy Center
                      </Link>
                      {/* Temporarily hidden: Vendor Onboarding
                      <Link to="/vendor/onboarding" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                        Vendor Onboarding
                      </Link>
                      */}
                      {(userInfo.isVendor || userInfo.isAdmin) && (
                        <Link to="/vendor/dashboard" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                          Vendor Dashboard
                        </Link>
                      )}
                      {canAccessAdmin && (
                        <Link to="/admin" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                          Products
                        </Link>
                      )}
                      {canAccessAdmin && (
                        <Link to="/admin/products/new" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                          Add Product
                        </Link>
                      )}
                      {canAccessAdmin && (
                        <Link to="/admin/professional" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                          Professional Admin
                        </Link>
                      )}
                      {canAccessAdmin && (
                        <Link to="/admin/mobile" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                          Mobile Admin
                        </Link>
                      )}
                      {userInfo.isAdmin && (
                        <Link to="/admin/vendors" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                          Marketplace Ops
                        </Link>
                      )}
                      {userInfo.isAdmin && (
                        <Link to="/admin/messages" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
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
                      <Link to="/login" onClick={() => setMobileNavOpen(false)} className="block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em]">
                        Login
                      </Link>
                      <Link to="/register" onClick={() => setMobileNavOpen(false)} className="block rounded-xl border border-brand-accent/30 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-accent">
                        Register
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
