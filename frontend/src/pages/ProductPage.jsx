import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  BadgeCheck,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import Product from '../components/Product';
import { slugifyCategoryName } from '../utils/categoryUi';
import {
  formatCurrency,
  getProductImages,
  getStockPresentation,
  normalizeProductPayload,
} from '../utils/productUi';

const TRUST_POINTS = [
  ['Verified Authentic', 'Every product checked against strict quality standards.'],
  ['Premium Grade', 'Sourced from certified, audited manufacturers.'],
  ['Ethically Sourced', 'Chosen from trusted producers and origin partners.'],
  ['Fast Delivery', 'Packed with care and shipped promptly worldwide.'],
];

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await axios.get(`/api/products/${id}`);
        setProduct(data);
        setSelectedImage(data.image);
        setQty(1);

        try {
          const relatedResponse = await axios.get('/api/products', {
            params: {
              category: slugifyCategoryName(data.category),
              exclude: data._id,
              limit: 4,
              sort: '',
            },
          });

          const relatedPayload = normalizeProductPayload(relatedResponse.data);
          setRelatedProducts(relatedPayload.products);
        } catch (relatedError) {
          console.error(relatedError);
          setRelatedProducts([]);
        }
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load this product right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const productImages = useMemo(() => getProductImages(product || {}), [product]);
  const stockPresentation = getStockPresentation(product?.countInStock || 0);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f7f9fc]">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-brand-primary"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-3xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="font-serif text-3xl font-bold text-brand-dark">Product unavailable</p>
          <p className="mt-3 text-sm text-red-700">{error || 'Unable to load this product.'}</p>
          <Link
            to="/products"
            className="mt-8 inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, qty);
    navigate('/cart');
  };

  return (
    <div className="bg-[#f7f9fc] pb-20">
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <Link
          to="/products"
          className="inline-flex items-center text-sm font-semibold text-gray-600 transition-colors duration-200 hover:text-brand-primary"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Shop
        </Link>

        <div className="mt-8 grid gap-10 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-5">
            <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_24px_70px_rgba(11,31,58,0.10)]">
              <img
                src={selectedImage || product.image}
                alt={product.name}
                className="h-[520px] w-full object-cover"
              />
            </div>

            {productImages.length > 1 && (
              <div className="grid gap-4 sm:grid-cols-4">
                {productImages.map((image) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`overflow-hidden rounded-[20px] border-2 transition ${
                      selectedImage === image ? 'border-brand-primary' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} gallery`}
                      className="h-28 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[32px] bg-white p-6 shadow-[0_24px_70px_rgba(11,31,58,0.10)] sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/category/${slugifyCategoryName(product.category)}`}
                className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent transition-colors duration-200 hover:text-brand-primary"
              >
                {product.category}
              </Link>
              {product.isFeatured && (
                <span className="rounded-full bg-[#f3f6fc] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6d14]">
                  Featured
                </span>
              )}
              {product.isBestSeller && (
                <span className="rounded-full bg-[#f3e1de] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8c3b2a]">
                  Best Seller
                </span>
              )}
            </div>

            <h1 className="mt-4 font-serif text-4xl font-bold text-brand-dark sm:text-5xl">{product.name}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center text-brand-accent">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    size={16}
                    fill={index < Math.floor(product.rating || 0) ? 'currentColor' : 'none'}
                    className={index < Math.floor(product.rating || 0) ? 'text-brand-accent' : 'text-gray-300'}
                  />
                ))}
                <span className="ml-2 text-sm font-semibold text-gray-500">
                  {product.numReviews || 0} reviews
                </span>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stockPresentation.className}`}>
                {stockPresentation.label}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-4">
              {product.compareAtPrice > product.price && (
                <p className="text-xl text-gray-400 line-through">
                  {formatCurrency(product.compareAtPrice)}
                </p>
              )}
              <p className="font-serif text-4xl font-bold text-brand-dark">
                {formatCurrency(product.price)}
              </p>
              {product.weight && (
                <span className="rounded-full bg-[#eef2f8] px-3 py-1 text-sm font-semibold text-[#2c4a73]">
                  {product.weight}
                </span>
              )}
            </div>

            <p className="mt-6 text-base leading-8 text-gray-700">
              {product.description}
            </p>

            <div className="mt-8 grid gap-4 rounded-[28px] bg-[#f4f7fb] p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Origin</p>
                <p className="mt-2 text-sm leading-7 text-gray-700">{product.origin || 'Premium source details coming soon.'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Contents & Specifications</p>
                <p className="mt-2 text-sm leading-7 text-gray-700">{product.ingredients || 'Premium product with verified sourcing.'}</p>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-[#e1e8f2] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Quantity</p>
                  <div className="mt-3 inline-flex items-center rounded-full border border-gray-200 bg-[#f7f9fc] p-1">
                    <button
                      type="button"
                      onClick={() => setQty((currentQty) => Math.max(1, currentQty - 1))}
                      className="rounded-full p-3 text-brand-dark transition-colors duration-200 hover:bg-brand-light"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="min-w-[54px] text-center text-lg font-semibold text-brand-dark">{qty}</span>
                    <button
                      type="button"
                      disabled={qty >= product.countInStock}
                      onClick={() => setQty((currentQty) => Math.min(product.countInStock, currentQty + 1))}
                      className="rounded-full p-3 text-brand-dark transition-colors duration-200 hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 sm:items-end">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={product.countInStock === 0}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors duration-200 sm:w-auto ${
                      product.countInStock === 0
                        ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                        : 'bg-brand-primary text-white hover:bg-brand-dark'
                    }`}
                  >
                    {product.countInStock === 0 ? 'Currently Out of Stock' : 'Add to Cart'}
                  </button>

                  <Link
                    to="/products"
                    className="inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>

              {product.countInStock === 0 && (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  This product is temporarily out of stock. Please check back soon for restocked inventory.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-16 rounded-[32px] bg-white p-6 shadow-[0_24px_70px_rgba(11,31,58,0.08)] sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Trust & Quality</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Why customers choose Apex Link Group</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {TRUST_POINTS.map(([title, subtitle], index) => {
              const Icon = [BadgeCheck, Sparkles, ShieldCheck, Truck][index];

              return (
                <div key={title} className="rounded-[24px] bg-[#f4f7fb] p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-primary shadow-sm">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-brand-dark">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-gray-600">{subtitle}</p>
                </div>
              );
            })}
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Related Products</p>
                <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">
                  More from {product.category}
                </h2>
              </div>
              <Link
                to={`/category/${slugifyCategoryName(product.category)}`}
                className="inline-flex items-center rounded-full border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
              >
                Explore Category
              </Link>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <Product key={relatedProduct._id} product={relatedProduct} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductPage;
