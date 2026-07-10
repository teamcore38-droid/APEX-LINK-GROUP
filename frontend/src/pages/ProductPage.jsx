import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  BadgeCheck,
  Heart,
  Loader2,
  MessageSquare,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Product from '../components/Product';
import { slugifyCategoryName } from '../utils/categoryUi';
import { trackEvent } from '../utils/analytics';
import { applySeo, buildProductStructuredData } from '../utils/seo';
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

const getCustomerSessionId = () => {
  const key = 'apexCustomerSessionId';
  const existing = localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  localStorage.setItem(key, next);
  return next;
};

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { userInfo } = useAuth();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [wishlistSaving, setWishlistSaving] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await axios.get(`/api/products/${id}`);
        setProduct(data);
        const seoResponse = await axios.get(`/api/seo/product/${data._id}`).catch(() => null);
        applySeo({
          title: seoResponse?.data?.title || data.seo?.title || data.name,
          description:
            seoResponse?.data?.description ||
            data.seo?.description ||
            data.shortDescription ||
            data.description?.slice(0, 160),
          keywords: seoResponse?.data?.keywords || data.seo?.keywords || [data.category, data.brand, data.sku].filter(Boolean),
          canonicalUrl: seoResponse?.data?.canonicalUrl || window.location.href,
          ogImage: seoResponse?.data?.ogImage || data.seo?.ogImage || data.image,
          type: 'product',
          structuredData: seoResponse?.data?.structuredData || buildProductStructuredData(data),
        });
        trackEvent(
          'product_view',
          {
            productId: data._id,
            name: data.name,
            category: data.category,
            price: data.price,
            currency: 'LKR',
          },
          { token: userInfo?.token }
        );
        setSelectedImage(data.image);
        setSelectedVariantId(data.variants?.find((variant) => variant.isActive !== false)?._id || '');
        setQty(1);

        try {
          const sessionId = getCustomerSessionId();
          await axios.post(
            '/api/customer/recently-viewed',
            { productId: data._id, sessionId },
            {
              headers: {
                ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {}),
                'x-session-id': sessionId,
              },
            }
          );
        } catch (viewError) {
          console.error(viewError);
        }

        try {
          const sessionId = getCustomerSessionId();
          const recommendationResponse = await axios.get('/api/customer/recommendations', {
            params: { sessionId, limit: 4 },
            headers: {
              ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {}),
              'x-session-id': sessionId,
            },
          });
          setRecommendedProducts(recommendationResponse.data.filter((item) => item._id !== data._id));
        } catch (recommendationError) {
          console.error(recommendationError);
          setRecommendedProducts([]);
        }

        try {
          const reviewResponse = await axios.get(`/api/reviews/product/${data._id}`);
          setReviews(reviewResponse.data);
        } catch (reviewError) {
          console.error(reviewError);
          setReviews([]);
        }

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
  }, [id, userInfo?.token]);

  const productImages = useMemo(() => getProductImages(product || {}), [product]);
  const selectedVariant = useMemo(
    () => product?.variants?.find((variant) => variant._id === selectedVariantId) || null,
    [product, selectedVariantId]
  );
  const effectivePrice = Number(product?.price || 0) + Number(selectedVariant?.priceAdjustment || 0);
  const effectiveStock = selectedVariant ? selectedVariant.countInStock : product?.countInStock || 0;
  const stockPresentation = getStockPresentation(effectiveStock || 0);

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
    addToCart(
      {
        ...product,
        price: effectivePrice,
        countInStock: effectiveStock,
        variantId: selectedVariant?._id || '',
        variantLabel: selectedVariant?.label || '',
        sku: selectedVariant?.sku || product.sku || '',
      },
      qty
    );
    navigate('/cart');
  };

  const shareProduct = async () => {
    const shareData = {
      title: product.name,
      text: product.shortDescription || product.description?.slice(0, 120) || product.name,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setReviewMessage('Product link copied.');
      }
      trackEvent('share_product', { productId: product._id, name: product.name });
    } catch (shareError) {
      if (shareError.name !== 'AbortError') {
        setReviewMessage('Unable to share this product right now.');
      }
    }
  };

  const addToWishlist = async () => {
    if (!userInfo?.token) {
      navigate(`/login?redirect=/product/${id}`);
      return;
    }

    setWishlistSaving(true);

    try {
      await axios.post(
        '/api/wishlist',
        { productId: product._id },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );
      setReviewMessage('Saved to your wishlist.');
    } catch (wishlistError) {
      setReviewMessage(wishlistError.response?.data?.message || 'Unable to update wishlist.');
    } finally {
      setWishlistSaving(false);
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();

    if (!userInfo?.token) {
      navigate(`/login?redirect=/product/${id}`);
      return;
    }

    setReviewSaving(true);
    setReviewMessage('');

    try {
      await axios.post(`/api/reviews/product/${product._id}`, reviewForm, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      });
      setReviewForm({ rating: 5, comment: '' });
      setReviewMessage('Review submitted for moderation.');
    } catch (reviewError) {
      setReviewMessage(reviewError.response?.data?.message || 'Unable to submit review.');
    } finally {
      setReviewSaving(false);
    }
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

            <button
              type="button"
              onClick={shareProduct}
              className="mt-4 rounded-md border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-primary"
            >
              Share Product
            </button>

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
                  {product.numReviews || reviews.length || 0} reviews
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
                {formatCurrency(effectivePrice)}
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
              {product.variants?.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Variant</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {product.variants.filter((variant) => variant.isActive !== false).map((variant) => (
                      <button
                        key={variant._id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(variant._id);
                          setQty(1);
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          selectedVariantId === variant._id
                            ? 'border-brand-primary bg-brand-light text-brand-dark'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-brand-primary/40'
                        }`}
                      >
                        <span className="block font-semibold">{variant.label}</span>
                        <span className="mt-1 block text-xs">
                          {[variant.size, variant.color, variant.weight, variant.packaging].filter(Boolean).join(' | ') || 'Standard option'}
                        </span>
                        {variant.priceAdjustment !== 0 && (
                          <span className="mt-1 block text-xs font-semibold text-brand-primary">
                            {variant.priceAdjustment > 0 ? '+' : ''}{formatCurrency(variant.priceAdjustment)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                      disabled={qty >= effectiveStock}
                      onClick={() => setQty((currentQty) => Math.min(effectiveStock, currentQty + 1))}
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
                    disabled={effectiveStock === 0}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors duration-200 sm:w-auto ${
                      effectiveStock === 0
                        ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                        : 'bg-brand-primary text-white hover:bg-brand-dark'
                    }`}
                  >
                    {effectiveStock === 0 ? 'Currently Out of Stock' : 'Add to Cart'}
                  </button>
                  <button
                    type="button"
                    onClick={addToWishlist}
                    disabled={wishlistSaving}
                    className="inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {wishlistSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Heart size={16} className="mr-2" />}
                    Save
                  </button>

                  <Link
                    to="/products"
                    className="inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>

              {effectiveStock === 0 && (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  This product is temporarily out of stock. Please check back soon for restocked inventory.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-16 rounded-[32px] bg-white p-6 shadow-[0_24px_70px_rgba(11,31,58,0.08)] sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Reviews</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Customer feedback</h2>
          </div>

          {reviewMessage && (
            <div className="mb-6 rounded-2xl border border-brand-accent/20 bg-brand-light px-4 py-3 text-sm font-semibold text-brand-primary">
              {reviewMessage}
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <form onSubmit={submitReview} className="rounded-[24px] border border-gray-100 bg-brand-light p-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-brand-dark">Rating</span>
                <select
                  value={reviewForm.rating}
                  onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>{rating} stars</option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-brand-dark">Review</span>
                <textarea
                  rows="5"
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-accent"
                />
              </label>
              <button
                type="submit"
                disabled={reviewSaving}
                className="mt-4 inline-flex items-center rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
              >
                {reviewSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <MessageSquare size={16} className="mr-2" />}
                Submit Review
              </button>
            </form>

            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="rounded-[24px] border border-dashed border-brand-accent/30 bg-brand-light p-6 text-sm text-gray-600">
                  No approved reviews yet. Be the first to submit one.
                </p>
              ) : (
                reviews.map((review) => (
                  <article key={review._id} className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-serif text-xl font-bold text-brand-dark">{review.name}</p>
                      <span className="text-sm font-semibold text-brand-accent">{review.rating}/5</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-gray-600">{review.comment}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

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

        {recommendedProducts.length > 0 && (
          <section className="mt-16">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">For You</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Personalized recommendations</h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {recommendedProducts.map((recommendedProduct) => (
                <Product key={recommendedProduct._id} product={recommendedProduct} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductPage;
