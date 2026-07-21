import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import {
  formatCurrency,
  getOptimizedImageUrl,
  getProductStatusBadge,
  getStockPresentation,
} from '../utils/productUi';

const Product = ({ product, priority = false }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const statusBadge = getProductStatusBadge(product);
  const stockBadge = getStockPresentation(product.countInStock);
  const showStockBadge = product.countInStock > 0;

  const handleAddToCart = (event) => {
    event.preventDefault();

    if (product.countInStock > 0) {
      addToCart(product, 1);
      navigate('/cart');
    }
  };

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#ead6c6] bg-white shadow-[0_12px_30px_rgba(53,26,17,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(53,26,17,0.14)]">
      <Link to={`/product/${product._id}`} className="relative block">
        <div className="relative aspect-square overflow-hidden bg-[#f4e7db] sm:aspect-[4/3]">
          <img
            src={getOptimizedImageUrl(product.image, { width: 520, height: 520, crop: 'fill' })}
            alt={product.name}
            width="520"
            height="520"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            sizes="(min-width: 1280px) 240px, (min-width: 768px) 30vw, 50vw"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1f0f0a]/45 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

          <div className="absolute inset-x-1.5 top-1.5 flex flex-row flex-wrap items-center justify-between gap-1 sm:inset-x-3 sm:top-3">
            {statusBadge && (
              <span
                className={`inline-flex max-w-full rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.04em] shadow-lg sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.12em] ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            )}

            {showStockBadge && (
              <span
                className={`inline-flex max-w-full rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.04em] sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.12em] ${stockBadge.className}`}
              >
                {stockBadge.label}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4 xl:p-5">
        <div className="mb-2 flex min-w-0 items-center justify-between gap-2 sm:mb-3">
          <span className="min-w-0 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-[#c9822b] sm:text-[10px] sm:tracking-[0.2em]">
            {product.category}
          </span>
          {product.weight && (
            <span className="hidden shrink-0 rounded-full bg-[#f5e9dd] px-2 py-1 text-[10px] font-semibold text-[#744126] sm:inline-flex">
              {product.weight}
            </span>
          )}
        </div>

        <Link to={`/product/${product._id}`} className="block">
          <h3 className="line-clamp-2 min-h-10 break-words font-serif text-base font-bold leading-5 text-[#2a140e] transition-colors duration-200 group-hover:text-[#c9822b] sm:min-h-11 sm:text-lg sm:leading-6 xl:text-xl">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2 flex items-center justify-between sm:mt-3">
          <div className="flex min-w-0 flex-wrap items-center text-[#d99a32]">
            {[...Array(5)].map((_, index) => (
              <Star
                key={index}
                size={12}
                fill={index < Math.floor(product.rating || 0) ? 'currentColor' : 'none'}
                className={
                  index < Math.floor(product.rating || 0) ? 'text-[#d99a32]' : 'text-[#ead6c6]'
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

        <div className="mt-2 flex flex-col gap-3 border-t border-[#efdfd2] pt-2.5 sm:mt-3 sm:gap-3 sm:pt-3">
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
              to={`/product/${product._id}`}
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
        </div>
      </div>
    </article>
  );
};

export default memo(Product);
