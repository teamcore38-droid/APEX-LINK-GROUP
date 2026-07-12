import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Maximize2,
  MessageSquare,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  X,
  ZoomIn,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Product from '../components/Product';
import { slugifyCategoryName } from '../utils/categoryUi';
import { trackEvent } from '../utils/analytics';
import { applySeo, buildProductStructuredData } from '../utils/seo';
import {
  formatCurrency,
  getOptimizedImageUrl,
  getProductImageUrl,
  getProductImages,
  getStockPresentation,
  getVariantImageAssets,
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

const getVariantImageUrls = (variant) =>
  getVariantImageAssets(variant)
    .map((image) => getProductImageUrl(image))
    .filter(Boolean);

const getProductDetailImageUrl = (image) =>
  getOptimizedImageUrl(image, { width: 1200, crop: 'limit', quality: 'auto:good' });

const getProductThumbnailUrl = (image) =>
  getOptimizedImageUrl(image, { width: 240, height: 240, crop: 'fill', quality: 'auto:eco' });

const getProductLightboxImageUrl = (image) =>
  getOptimizedImageUrl(image, { width: 1800, crop: 'limit', quality: 'auto:good' });

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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLightboxZoomed, setIsLightboxZoomed] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [wishlistSaving, setWishlistSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const applyProductSeo = (data, seoData = null) => {
      applySeo({
        title: seoData?.title || data.seo?.title || data.name,
        description:
          seoData?.description ||
          data.seo?.description ||
          data.shortDescription ||
          data.description?.slice(0, 160),
        keywords: seoData?.keywords || data.seo?.keywords || [data.category, data.brand, data.sku].filter(Boolean),
        canonicalUrl: seoData?.canonicalUrl || window.location.href,
        ogImage: seoData?.ogImage || data.seo?.ogImage || data.image,
        type: 'product',
        structuredData: seoData?.structuredData || buildProductStructuredData(data),
      });
    };

    const buildSessionHeaders = (sessionId) => ({
      ...(userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {}),
      'x-session-id': sessionId,
    });

    const loadSupportingProductData = async (data) => {
      const sessionId = getCustomerSessionId();

      void trackEvent(
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

      const [seoResult, recentlyViewedResult, recommendationResult, reviewResult, relatedResult] = await Promise.allSettled([
        axios.get(`/api/seo/product/${data._id}`),
        axios.post(
          '/api/customer/recently-viewed',
          { productId: data._id, sessionId },
          { headers: buildSessionHeaders(sessionId) }
        ),
        axios.get('/api/customer/recommendations', {
          params: { sessionId, limit: 4 },
          headers: buildSessionHeaders(sessionId),
        }),
        axios.get(`/api/reviews/product/${data._id}`),
        axios.get('/api/products', {
          params: {
            category: slugifyCategoryName(data.category),
            exclude: data._id,
            limit: 4,
            sort: '',
          },
        }),
      ]);

      if (!isActive) {
        return;
      }

      if (seoResult.status === 'fulfilled') {
        applyProductSeo(data, seoResult.value.data);
      }

      if (recommendationResult.status === 'fulfilled') {
        setRecommendedProducts(recommendationResult.value.data.filter((item) => item._id !== data._id));
      } else {
        console.error(recommendationResult.reason);
        setRecommendedProducts([]);
      }

      if (reviewResult.status === 'fulfilled') {
        setReviews(reviewResult.value.data);
      } else {
        console.error(reviewResult.reason);
        setReviews([]);
      }

      if (relatedResult.status === 'fulfilled') {
        const relatedPayload = normalizeProductPayload(relatedResult.value.data);
        setRelatedProducts(relatedPayload.products);
      } else {
        console.error(relatedResult.reason);
        setRelatedProducts([]);
      }

      if (recentlyViewedResult.status === 'rejected') {
        console.error(recentlyViewedResult.reason);
      }
    };

    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      setRelatedProducts([]);
      setRecommendedProducts([]);
      setReviews([]);

      try {
        const { data } = await axios.get(`/api/products/${id}`);
        if (!isActive) {
          return;
        }

        setProduct(data);
        applyProductSeo(data);
        const gallery = getProductImages(data);
        const firstActiveVariant = data.variants?.find((variant) => variant.isActive !== false);
        const firstVariantGallery = getVariantImageUrls(firstActiveVariant);
        setSelectedImage(firstVariantGallery[0] || gallery[0] || data.image);
        setSelectedVariantId(firstActiveVariant?._id ? String(firstActiveVariant._id) : '');
        setQty(1);
        setLoading(false);

        void loadSupportingProductData(data);
      } catch (fetchError) {
        if (!isActive) {
          return;
        }

        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load this product right now.');
        setLoading(false);
      }
    };

    fetchProduct();

    return () => {
      isActive = false;
    };
  }, [id, userInfo?.token]);

  const selectedVariant = useMemo(
    () => product?.variants?.find((variant) => String(variant._id) === String(selectedVariantId)) || null,
    [product, selectedVariantId]
  );
  const productImages = useMemo(() => {
    const variantImages = getVariantImageUrls(selectedVariant);

    return variantImages.length > 0 ? variantImages : getProductImages(product || {});
  }, [product, selectedVariant]);
  const currentGalleryImage = productImages.includes(selectedImage)
    ? selectedImage
    : productImages[0] || selectedImage || product?.image || '';
  const selectedImageIndex = Math.max(0, productImages.indexOf(currentGalleryImage));
  const effectivePrice = Number(product?.price || 0) + Number(selectedVariant?.priceAdjustment || 0);
  const effectiveStock = selectedVariant ? selectedVariant.countInStock : product?.countInStock || 0;
  const stockPresentation = getStockPresentation(effectiveStock || 0);

  useEffect(() => {
    if (!isLightboxOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsLightboxOpen(false);
      }

      if (event.key === 'ArrowLeft') {
        setSelectedImage((currentImage) => {
          const currentIndex = Math.max(0, productImages.indexOf(currentImage));
          return productImages[(currentIndex - 1 + productImages.length) % productImages.length] || currentImage;
        });
      }

      if (event.key === 'ArrowRight') {
        setSelectedImage((currentImage) => {
          const currentIndex = Math.max(0, productImages.indexOf(currentImage));
          return productImages[(currentIndex + 1) % productImages.length] || currentImage;
        });
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, productImages]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#fff7ee]">
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

  const showGalleryImage = (image) => {
    setSelectedImage(image);
    setIsLightboxZoomed(false);
  };

  const showPreviousImage = () => {
    const currentIndex = Math.max(0, productImages.indexOf(currentGalleryImage));
    showGalleryImage(productImages[(currentIndex - 1 + productImages.length) % productImages.length] || currentGalleryImage);
  };

  const showNextImage = () => {
    const currentIndex = Math.max(0, productImages.indexOf(currentGalleryImage));
    showGalleryImage(productImages[(currentIndex + 1) % productImages.length] || currentGalleryImage);
  };

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
    <div className="bg-[#fff7ee] pb-20">
      <div className="container mx-auto max-w-7xl px-4 pb-10 pt-5 sm:pt-6">
        <Link
          to="/products"
          className="inline-flex items-center text-sm font-semibold text-gray-600 transition-colors duration-200 hover:text-brand-primary"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Shop
        </Link>

        <div className="mt-5 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-5">
            <button
              type="button"
              onClick={() => {
                setIsLightboxOpen(true);
                setIsLightboxZoomed(false);
              }}
              className="group relative block w-full overflow-hidden rounded-[28px] bg-white text-left shadow-[0_24px_70px_rgba(53,26,17,0.10)] focus:outline-none focus:ring-4 focus:ring-brand-accent/30 sm:rounded-[32px]"
              aria-label={`Open ${product.name} image gallery`}
            >
              <div className="relative aspect-square bg-[#f4e7db] sm:aspect-[5/4] lg:aspect-[4/3] xl:aspect-[1.08/1]">
                <img
                  src={getProductDetailImageUrl(currentGalleryImage || product.image)}
                  alt={product.name}
                  fetchPriority="high"
                  decoding="async"
                  sizes="(min-width: 1280px) 640px, (min-width: 768px) 90vw, 100vw"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1f0f0a]/35 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                <span className="absolute bottom-4 right-4 inline-flex items-center rounded-full bg-white/95 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-dark shadow-lg transition group-hover:bg-brand-primary group-hover:text-white">
                  <ZoomIn size={16} className="mr-2" />
                  Zoom
                </span>
              </div>
            </button>

            {productImages.length > 1 && (
              <div className="product-thumbnail-strip flex gap-3 overflow-x-auto pb-2 sm:gap-4">
                {productImages.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => showGalleryImage(image)}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition sm:h-24 sm:w-24 lg:h-28 lg:w-28 ${
                      currentGalleryImage === image
                        ? 'border-brand-primary shadow-[0_12px_24px_rgba(140,59,42,0.20)]'
                        : 'border-[#ead6c6] opacity-80 hover:border-brand-accent hover:opacity-100'
                    }`}
                    aria-label={`Show ${product.name} image ${index + 1}`}
                  >
                    <img
                      src={getProductThumbnailUrl(image)}
                      alt={`${product.name} gallery thumbnail ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[32px] bg-white p-6 shadow-[0_24px_70px_rgba(53, 26, 17,0.10)] sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/category/${slugifyCategoryName(product.category)}`}
                className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent transition-colors duration-200 hover:text-brand-primary"
              >
                {product.category}
              </Link>
              {product.isFeatured && (
                <span className="rounded-full bg-[#fff7ee] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b36a2e]">
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
                <span className="rounded-full bg-[#f5e9dd] px-3 py-1 text-sm font-semibold text-[#744126]">
                  {product.weight}
                </span>
              )}
            </div>

            <p className="mt-6 text-base leading-8 text-gray-700">
              {product.description}
            </p>

            <div className="mt-8 grid gap-4 rounded-[28px] bg-[#f8efe6] p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Origin</p>
                <p className="mt-2 text-sm leading-7 text-gray-700">{product.origin || 'Premium source details coming soon.'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Contents & Specifications</p>
                <p className="mt-2 text-sm leading-7 text-gray-700">{product.ingredients || 'Premium product with verified sourcing.'}</p>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-[#ecd9ca] p-5">
              {product.variants?.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Variant</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {product.variants.filter((variant) => variant.isActive !== false).map((variant) => {
                      const variantImages = getVariantImageUrls(variant);
                      const variantImage = variantImages[0];

                      return (
                        <button
                          key={variant._id}
                          type="button"
                          onClick={() => {
                            setSelectedVariantId(variant._id ? String(variant._id) : '');
                            if (variantImages.length > 0) {
                              setSelectedImage(variantImages[0]);
                            } else {
                              const fallbackImages = getProductImages(product || {});
                              setSelectedImage(fallbackImages[0] || product.image);
                            }
                            setQty(1);
                          }}
                          className={`flex min-h-[82px] items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition ${
                            String(selectedVariantId) === String(variant._id)
                              ? 'border-brand-primary bg-brand-light text-brand-dark'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-brand-primary/40'
                          }`}
                        >
                          {variantImage && (
                            <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#ead6c6] bg-[#f8efe6]">
                              <img
                                src={getProductThumbnailUrl(variantImage)}
                                alt={`${variant.label} option`}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover"
                              />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{variant.label}</span>
                            <span className="mt-1 block truncate text-xs">
                              {[variant.size, variant.color, variant.weight, variant.packaging].filter(Boolean).join(' | ') || 'Standard option'}
                            </span>
                            {variant.priceAdjustment !== 0 && (
                              <span className="mt-1 block text-xs font-semibold text-brand-primary">
                                {variant.priceAdjustment > 0 ? '+' : ''}{formatCurrency(variant.priceAdjustment)}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Quantity</p>
                  <div className="mt-3 inline-flex items-center rounded-full border border-gray-200 bg-[#fff7ee] p-1">
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
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-end">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={effectiveStock === 0}
                      className={`inline-flex min-h-14 w-full items-center justify-center rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors duration-200 sm:w-auto sm:min-w-[190px] ${
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
                      className="inline-flex min-h-14 w-full items-center justify-center rounded-xl border border-brand-primary/20 px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[132px]"
                    >
                      {wishlistSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Heart size={16} className="mr-2" />}
                      Save
                    </button>
                  </div>

                  <Link
                    to="/products"
                    className="inline-flex min-h-14 w-full items-center justify-center rounded-xl border border-brand-primary/20 px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white sm:w-auto"
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

        <section className="mt-8 rounded-[32px] bg-white p-6 shadow-[0_24px_70px_rgba(53, 26, 17,0.08)] sm:mt-10 sm:p-8">
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

        <section className="mt-16 rounded-[32px] bg-white p-6 shadow-[0_24px_70px_rgba(53, 26, 17,0.08)] sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Trust & Quality</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Why customers choose Apex Link Group</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {TRUST_POINTS.map(([title, subtitle], index) => {
              const Icon = [BadgeCheck, Sparkles, ShieldCheck, Truck][index];

              return (
                <div key={title} className="rounded-[24px] bg-[#f8efe6] p-5">
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

            <div className="product-grid">
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
            <div className="product-grid">
              {recommendedProducts.map((recommendedProduct) => (
                <Product key={recommendedProduct._id} product={recommendedProduct} />
              ))}
            </div>
          </section>
        )}
      </div>

      {isLightboxOpen && (
        <div
          className="product-lightbox fixed inset-0 z-[90] flex flex-col bg-[#1f0f0a]/95 px-4 py-4 text-white sm:px-8 sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} image gallery`}
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-accent">
                {selectedImageIndex + 1} / {productImages.length || 1}
              </p>
              <p className="mt-1 line-clamp-1 font-serif text-xl font-bold">{product.name}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsLightboxZoomed((current) => !current);
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                aria-label={isLightboxZoomed ? 'Fit image to screen' : 'Zoom image'}
              >
                <Maximize2 size={18} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsLightboxOpen(false);
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close image gallery"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="relative mt-4 flex min-h-0 flex-1 items-center justify-center" onClick={(event) => event.stopPropagation()}>
            {productImages.length > 1 && (
              <button
                type="button"
                onClick={showPreviousImage}
                className="absolute left-0 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:left-4"
                aria-label="Show previous product image"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsLightboxZoomed((current) => !current)}
              className={`max-h-full overflow-auto rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-accent/40 ${
                isLightboxZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
              }`}
              aria-label={isLightboxZoomed ? 'Zoom out product image' : 'Zoom in product image'}
            >
              <img
                src={getProductLightboxImageUrl(currentGalleryImage || product.image)}
                alt={product.name}
                decoding="async"
                className={`mx-auto rounded-2xl object-contain shadow-2xl transition duration-300 ${
                  isLightboxZoomed
                    ? 'max-h-none max-w-none scale-100'
                    : 'max-h-[72vh] max-w-full'
                }`}
              />
            </button>

            {productImages.length > 1 && (
              <button
                type="button"
                onClick={showNextImage}
                className="absolute right-0 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-4"
                aria-label="Show next product image"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {productImages.length > 1 && (
            <div className="product-thumbnail-strip mt-4 flex max-w-full justify-center gap-3 overflow-x-auto pb-2" onClick={(event) => event.stopPropagation()}>
              {productImages.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => showGalleryImage(image)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-20 sm:w-20 ${
                    currentGalleryImage === image ? 'border-brand-accent' : 'border-white/20 opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Show ${product.name} image ${index + 1}`}
                >
                  <img
                    src={getProductThumbnailUrl(image)}
                    alt={`${product.name} lightbox thumbnail ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductPage;
