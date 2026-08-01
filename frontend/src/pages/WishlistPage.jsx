import { Heart, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import Product from '../components/Product';
import { useWishlist } from '../context/WishlistContext';

const WishlistPage = () => {
  const { wishlistItems, wishlistCount } = useWishlist();

  return (
    <div className="min-h-[60vh] bg-[#fff7ee] py-8 sm:py-12">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e8d2c1] pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-accent">
              Saved for later
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-brand-dark sm:text-4xl">
              My Wishlist
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {wishlistCount === 1 ? '1 saved product' : `${wishlistCount} saved products`}
            </p>
          </div>

          {wishlistCount > 0 && (
            <Link
              to="/products"
              className="inline-flex min-h-10 items-center rounded-md border border-brand-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
            >
              <ShoppingBag size={15} className="mr-2" aria-hidden="true" />
              Continue Shopping
            </Link>
          )}
        </div>

        {wishlistCount === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center py-16 text-center sm:py-24">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#e0c3ae] bg-white text-brand-primary shadow-sm">
              <Heart size={28} aria-hidden="true" />
            </span>
            <h2 className="mt-5 font-serif text-2xl font-bold text-brand-dark">
              Your wishlist is empty
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Select the heart on any product to keep it here for your next visit.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex min-h-11 items-center rounded-md bg-brand-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-brand-dark"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="product-grid mt-6 sm:mt-8">
            {wishlistItems.map((product, index) => (
              <Product key={product._id} product={product} priority={index < 4} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
