import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, Lock, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import {
  formatCurrency,
  buildProductPath,
  getOptimizedImageUrl,
  getProductBadges,
} from '../utils/productUi';

const Product = ({ product, priority = false, compact = false }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const badges = getProductBadges(product);
  const productPath = buildProductPath(product);
  const savedToWishlist = isInWishlist(product);

  const handleAddToCart = (event) => {
    event.preventDefault();

    if (product.countInStock > 0) {
      addToCart(product, 1);
      navigate('/cart');
    }
  };

  const handleWishlistToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <article
      className={`group flex h-full min-w-0 flex-col overflow-hidden border border-[#ead6c6] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(53,26,17,0.14)] ${
        compact
          ? 'rounded-lg shadow-[0_8px_20px_rgba(53,26,17,0.08)]'
          : 'rounded-2xl shadow-[0_12px_30px_rgba(53,26,17,0.08)]'
      }`}
    >
      <div className="relative">
        <Link to={productPath} className="block">
          <div
            className={`relative overflow-hidden bg-[#f4e7db] ${
              compact ? 'aspect-[4/3]' : 'aspect-square sm:aspect-[4/3]'
            }`}
          >
            <img
              src={getOptimizedImageUrl(product.image, {
                width: compact ? 360 : 520,
                height: compact ? 270 : 520,
                crop: 'fill',
              })}
              alt={product.name}
              width={compact ? 360 : 520}
              height={compact ? 270 : 520}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              sizes={
                compact
                  ? '(min-width: 1024px) 22vw, (min-width: 640px) 31vw, 48vw'
                  : '(min-width: 1280px) 240px, (min-width: 768px) 30vw, 50vw'
              }
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1f0f0a]/45 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

            <div
              className={`absolute z-10 flex flex-nowrap items-center overflow-hidden ${
                compact
                  ? 'left-1.5 top-1.5 max-w-[calc(100%-2.75rem)] gap-1'
                  : 'left-1.5 top-1.5 max-w-[calc(100%-3rem)] gap-1 sm:left-3 sm:top-3 sm:max-w-[calc(100%-4rem)] sm:gap-1.5'
              }`}
            >
              {badges.map((badge) => (
                <span
                  key={badge.key}
                  aria-label={badge.key === 'best-seller' ? badge.label : undefined}
                  title={badge.key === 'best-seller' ? badge.label : undefined}
                  className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold uppercase leading-none shadow-lg ${
                    compact
                      ? 'h-5 px-1.5 text-[7px] tracking-[0.02em]'
                      : 'h-5 px-2 text-[8px] tracking-[0.04em] sm:h-6 sm:px-2.5 sm:text-[9px] sm:tracking-[0.08em]'
                  } ${badge.className}`}
                >
                  {badge.key === 'best-seller' ? (
                    <Star size={12} fill="currentColor" strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    badge.label
                  )}
                </span>
              ))}
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleWishlistToggle}
          aria-label={savedToWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={savedToWishlist}
          title={savedToWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute right-1.5 top-1.5 z-20 inline-flex items-center justify-center rounded-full border shadow-sm transition-colors sm:right-3 sm:top-3 ${
            compact ? 'h-7 w-7' : 'h-9 w-9'
          } ${
            savedToWishlist
              ? 'border-brand-primary bg-brand-primary text-white'
              : 'border-[#ead6c6] bg-white/95 text-brand-primary hover:border-brand-primary hover:bg-[#fff7ee]'
          }`}
        >
          <Heart
            size={compact ? 14 : 17}
            fill={savedToWishlist ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className={`flex min-w-0 flex-1 flex-col ${compact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4 xl:p-5'}`}>
        <div className={`flex min-w-0 items-center justify-between gap-2 ${compact ? 'mb-1.5' : 'mb-2 sm:mb-3'}`}>
          <span
            className={`min-w-0 truncate font-bold uppercase text-[#c9822b] ${
              compact
                ? 'text-[8px] tracking-[0.1em]'
                : 'text-[9px] tracking-[0.14em] sm:text-[10px] sm:tracking-[0.2em]'
            }`}
          >
            {product.category}
          </span>
        </div>

        <Link to={productPath} className="block">
          <h3
            className={`line-clamp-2 break-words font-serif font-bold text-[#2a140e] transition-colors duration-200 group-hover:text-[#c9822b] ${
              compact
                ? 'min-h-9 text-sm leading-[1.15rem] sm:text-[15px]'
                : 'min-h-10 text-base leading-5 sm:min-h-11 sm:text-lg sm:leading-6 xl:text-xl'
            }`}
          >
            {product.name}
          </h3>
        </Link>

        {!compact && (
          <div className="mt-2 flex items-center justify-between sm:mt-3">
            <div className="flex min-w-0 flex-wrap items-center text-[#d99a32]">
              {[...Array(5)].map((_, index) => (
                <Star
                  key={index}
                  size={12}
                  fill={index < Math.floor(product.rating || 0) ? 'currentColor' : 'none'}
                  className={
                    index < Math.floor(product.rating || 0)
                      ? 'text-[#d99a32]'
                      : 'text-[#ead6c6]'
                  }
                />
              ))}
              <span className="ml-2 hidden text-xs font-semibold text-gray-500 sm:inline">
                {product.numReviews || 0} reviews
              </span>
              <span className="ml-2 text-[10px] font-semibold text-gray-500 sm:hidden">
                {product.numReviews || 0}
              </span>
            </div>
          </div>
        )}

        <div className={`mt-auto border-t border-[#efdfd2] ${compact ? 'mt-2 pt-2' : 'mt-2 flex flex-col gap-3 pt-2.5 sm:mt-3 sm:gap-3 sm:pt-3'}`}>
          {compact ? (
            <div className="flex min-w-0 items-end justify-between gap-2">
              <div className="min-w-0">
                {product.compareAtPrice > product.price && (
                  <p className="truncate text-[9px] leading-tight text-gray-400 line-through">
                    {formatCurrency(product.compareAtPrice)}
                  </p>
                )}
                <p className="truncate font-serif text-sm font-bold leading-tight text-[#8c3b2a] sm:text-base">
                  {formatCurrency(product.price)}
                </p>
              </div>

              {product.countInStock === 0 ? (
                <button
                  type="button"
                  disabled
                  aria-label={`${product.name} is sold out`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-200 text-gray-500"
                >
                  <Lock size={14} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  aria-label={`Add ${product.name} to cart`}
                  title="Add to cart"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#9b432a] text-white transition-colors duration-200 hover:bg-[#2a140e]"
                >
                  <ShoppingCart size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <>
              <div>
                {product.compareAtPrice > product.price && (
                  <p className="text-[11px] leading-tight text-gray-400 line-through sm:text-sm">
                    {formatCurrency(product.compareAtPrice)}
                  </p>
                )}
                <p className="break-words font-serif text-lg font-bold leading-tight text-[#2a140e] sm:text-xl xl:text-2xl">
                  {formatCurrency(product.price)}
                </p>
              </div>

              <div className="flex w-full flex-col items-stretch gap-2 xl:flex-row xl:items-center">
                <Link
                  to={productPath}
                  className="inline-flex min-h-9 flex-1 items-center justify-center rounded-full border border-[#e0c3ae] px-2 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#744126] transition-colors duration-200 hover:border-[#744126] hover:bg-[#f5e9dd] sm:text-xs sm:tracking-[0.12em]"
                >
                  View <ArrowRight size={13} className="ml-2" />
                </Link>

                {product.countInStock === 0 ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-9 flex-1 items-center justify-center rounded-full bg-gray-200 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 sm:text-xs sm:tracking-[0.12em]"
                  >
                    <Lock size={13} className="mr-2" /> Sold Out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="inline-flex min-h-9 flex-1 items-center justify-center rounded-full bg-[#9b432a] px-2 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:bg-[#2a140e] sm:text-xs sm:tracking-[0.12em]"
                  >
                    <ShoppingCart size={13} className="mr-2" /> Add
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export default memo(Product);
