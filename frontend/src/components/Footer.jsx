import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import axios from 'axios';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const subscribe = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await axios.post('/api/marketing/newsletter', {
        email,
        source: 'footer',
        tags: ['footer', 'storefront'],
      });
      setEmail('');
      setMessage('Subscribed. Thank you.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to subscribe right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <footer className="border-t border-brand-accent/20 bg-brand-dark py-12 text-brand-light">
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 md:grid-cols-4">
        <div>
          <h3 className="mb-4 flex items-center text-xl font-serif font-bold text-brand-accent">
            <Globe size={20} className="mr-2" /> APEX LINK GROUP
          </h3>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-accent/70">
            Global Marketplace
          </p>
          <p className="text-sm leading-7 text-gray-300">
            A premium multi-industry marketplace connecting trusted manufacturers and suppliers with customers worldwide — from textiles and food products to IT solutions and industrial equipment.
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-serif font-bold">Customer Care</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              <Link to="/track-order" className="transition-colors hover:text-brand-accent">
                Track Order
              </Link>
            </li>
            <li>
              <Link to="/profile" className="transition-colors hover:text-brand-accent">
                My Account
              </Link>
            </li>
            <li>
              <Link to="/shipping" className="transition-colors hover:text-brand-accent">
                Shipping
              </Link>
            </li>
            <li>
              <Link to="/returns" className="transition-colors hover:text-brand-accent">
                Returns
              </Link>
            </li>
            <li>
              <Link to="/contact" className="transition-colors hover:text-brand-accent">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-semibold uppercase tracking-wider">Marketplace</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              <Link to="/products" className="transition-colors hover:text-brand-accent">
                All Products
              </Link>
            </li>
            <li>
              <Link to="/categories" className="transition-colors hover:text-brand-accent">
                All Industries
              </Link>
            </li>
            <li>
              <Link to="/category/textiles-apparel" className="transition-colors hover:text-brand-accent">
                Textiles &amp; Apparel
              </Link>
            </li>
            <li>
              <Link to="/category/it-solutions-electronics" className="transition-colors hover:text-brand-accent">
                IT Solutions &amp; Electronics
              </Link>
            </li>
            <li>
              <Link to="/category/industrial-machinery" className="transition-colors hover:text-brand-accent">
                Industrial &amp; Machinery
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-semibold uppercase tracking-wider">Policies</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              <Link to="/privacy" className="transition-colors hover:text-brand-accent">
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="transition-colors hover:text-brand-accent">
                Terms
              </Link>
            </li>
            <li>
              <Link to="/faq" className="transition-colors hover:text-brand-accent">
                FAQs
              </Link>
            </li>
            <li>
              <Link to="/about" className="transition-colors hover:text-brand-accent">
                Our Story
              </Link>
            </li>
          </ul>

          <form onSubmit={subscribe} className="mt-6">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-brand-accent/80">
              Newsletter
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 outline-none focus:border-brand-accent"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand-accent px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-dark disabled:opacity-60"
              >
                Join
              </button>
            </div>
            {message && <p className="mt-2 text-xs text-gray-300">{message}</p>}
          </form>
        </div>
      </div>

      <div className="container mx-auto mt-12 border-t border-white/10 px-4 pt-8 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Apex Link Group — Global Marketplace. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
