import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import {
  formatCurrency,
  getProductStatusBadge,
  getStockPresentation,
} from '../utils/productUi';

const Product = ({ product }) => {
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
    <article className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#dce4ef] bg-white shadow-[0_20px_50px_rgba(11,31,58,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(11,31,58,0.14)]">
      <Link to={`/product/${product._id}`} className="relative block">
        <div className="relative h-72 overflow-hidden bg-[#ecf0f7]">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071427]/45 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

          {statusBadge && (
            <span
              className={`absolute left-4 top-4 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] shadow-lg ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          )}

          {showStockBadge && (
            <span
              className={`absolute right-4 top-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${stockBadge.className}`}
            >
              {stockBadge.label}
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#a07c16]">
            {product.category}
          </span>
          {product.weight && (
            <span className="rounded-full bg-[#eef2f8] px-3 py-1 text-[11px] font-semibold text-[#2c4a73]">
              {product.weight}
            </span>
          )}
        </div>

        <Link to={`/product/${product._id}`} className="block">
          <h3 className="font-serif text-2xl font-bold text-[#081729] transition-colors duration-200 group-hover:text-[#a07c16]">
            {product.name}
          </h3>
        </Link>

        <p className="mt-3 line-clamp-2 text-sm leading-7 text-gray-600">
          {product.shortDescription || product.description}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center text-[#c9a227]">
            {[...Array(5)].map((_, index) => (
              <Star
                key={index}
                size={14}
                fill={index < Math.floor(product.rating || 0) ? 'currentColor' : 'none'}
                className={
                  index < Math.floor(product.rating || 0) ? 'text-[#c9a227]' : 'text-[#dce4ef]'
                }
              />
            ))}
            <span className="ml-2 text-xs font-semibold text-gray-500">
              {product.numReviews || 0} reviews
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-[#e6ebf4] pt-5">
          <div>
            {product.compareAtPrice > product.price && (
              <p className="text-sm text-gray-400 line-through">
                {formatCurrency(product.compareAtPrice)}
              </p>
            )}
            <p className="font-serif text-3xl font-bold text-[#081729]">
              {formatCurrency(product.price)}
            </p>
          </div>

          <div className="flex w-full items-center gap-2">
            <Link
              to={`/product/${product._id}`}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-[#ccd8e8] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2c4a73] transition-colors duration-200 hover:border-[#2c4a73] hover:bg-[#eef2f8]"
            >
              View <ArrowRight size={13} className="ml-2" />
            </Link>

            {product.countInStock === 0 ? (
              <button
                type="button"
                disabled
                className="inline-flex flex-1 items-center justify-center rounded-full bg-gray-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500"
              >
                <Lock size={13} className="mr-2" /> Sold Out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-[#22406b] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-[#081729]"
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

export default Product;
