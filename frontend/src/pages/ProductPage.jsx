import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
  Loader2,
  Maximize2,
  MessageCircle,
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
import RouteLoadingScreen from '../components/RouteLoadingScreen';
import { useAuth } from '../context/AuthContext';
import Product from '../components/Product';
import { getCategories } from '../utils/categoryApi';
import { getPublicCategoryPath } from '../utils/categoryUi';
import { trackEvent } from '../utils/analytics';
import {
  NOINDEX_ROBOTS,
  applySeo,
  buildBreadcrumbStructuredData,
  buildProductStructuredData,
} from '../utils/seo';
import { buildCanonicalUrl } from '../utils/seoConfig';
import {
  formatCurrency,
  buildProductPath,
  getProductIdFromRouteParam,
  getOptimizedImageUrl,
  getProductImageUrl,
  getProductImages,
  getStockPresentation,
  getVariantImageAssets,
  normalizeProductPayload,
} from '../utils/productUi';

const TRUST_POINTS = [
  ['Verified Authentic', 'Every product checked against strict quality standards.'],
  ['Product Details', 'Review size, color, SKU, price, and policy notes before checkout.'],
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
  const { id: productRouteParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { userInfo } = useAuth();
  const productId = getProductIdFromRouteParam(productRouteParam);

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
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [sizeError, setSizeError] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [wishlistSaving, setWishlistSaving] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [categorySlug, setCategorySlug] = useState('');
  const [storeSettings, setStoreSettings] = useState({ checkoutMode: 'whatsapp', whatsappNumber: '+94770000000' });

  useEffect(() => {
    let isMounted = true;
    axios.get('/api/settings')
      .then(({ data }) => {
        if (isMounted && data) {
          setStoreSettings({
            checkoutMode: data.checkoutMode || 'whatsapp',
            whatsappNumber: data.whatsappNumber || '+94770000000',
          });
        }
      })
      .catch((err) => console.error('Error fetching settings:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const applyProductSeo = (data, seoData = null) => {
      const canonicalPath = buildProductPath(data);
      const canonicalUrl = buildCanonicalUrl(canonicalPath);
      applySeo({
        title: seoData?.title || data.seo?.title || data.name,
        description:
          seoData?.description ||
          data.seo?.description ||
          data.shortDescription ||
          data.description?.slice(0, 160),
        keywords: seoData?.keywords || data.seo?.keywords || [data.category, data.brand, data.sku].filter(Boolean),
        canonicalUrl,
        ogImage: seoData?.ogImage || data.seo?.ogImage || data.image,
        type: 'product',
        structuredData: [
          seoData?.structuredData || buildProductStructuredData(data, canonicalUrl),
          seoData?.breadcrumbs ||
            buildBreadcrumbStructuredData([
              { name: 'Home', url: '/' },
              { name: 'Products', url: '/products' },
              { name: data.name, url: canonicalUrl },
            ]),
        ],
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

      const [seoResult, , recommendationResult, reviewResult, relatedResult, categoriesResult] = await Promise.allSettled([
        axios.get(`/api/seo/product/${data._id}${location.search}`),
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
            category: data.category,
            exclude: data._id,
            limit: 4,
            sort: '',
          },
        }),
        getCategories(),
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
        setRelatedProducts(normalizeProductPayload(relatedResult.value.data).products);
      } else {
        console.error(relatedResult.reason);
        setRelatedProducts([]);
      }

      if (categoriesResult.status === 'fulfilled') {
        const matchingCategory = categoriesResult.value.find(
          (category) =>
            String(category.name || '').trim().toLowerCase() ===
            String(data.category || '').trim().toLowerCase()
        );
        setCategorySlug(matchingCategory?.slug || '');
      } else {
        setCategorySlug('');
      }
    };

    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      setSizeError('');
      setCategorySlug('');

      try {
        const { data } = await axios.get(`/api/products/${productId}`);
        if (!isActive) {
          return;
        }

        setProduct(data);
        applyProductSeo(data);
        const canonicalPath = buildProductPath(data);
        if (location.pathname !== canonicalPath) {
          navigate(`${canonicalPath}${location.search}`, { replace: true });
        }
        const gallery = getProductImages(data);
        const requestedOptions = new URLSearchParams(location.search);
        const requestedVariantId = requestedOptions.get('variant') || '';
        const requestedSize = requestedOptions.get('size') || '';
        const requestedColor = requestedOptions.get('color') || '';
        const requestedVariant = data.variants?.find((variant) => {
          if (variant.isActive === false) return false;
          if (requestedVariantId && String(variant._id) === requestedVariantId) return true;
          const sizeMatches = !requestedSize || String(variant.size || '').toLowerCase() === requestedSize.toLowerCase();
          const colorMatches = !requestedColor || String(variant.color || '').toLowerCase() === requestedColor.toLowerCase();
          return Boolean(requestedSize || requestedColor) && sizeMatches && colorMatches;
        });
        const firstActiveVariant = !data.hasSizes
          ? data.variants?.find((variant) => variant.isActive !== false)
          : null;
        const initialVariant = requestedVariant || firstActiveVariant;
        const initialVariantGallery = getVariantImageUrls(initialVariant);
        setSelectedImage(initialVariantGallery[0] || gallery[0] || data.image);
        setSelectedVariantId(initialVariant?._id ? String(initialVariant._id) : '');
        setSelectedSize(requestedSize || initialVariant?.size || '');
        setSelectedColor(requestedColor || initialVariant?.color || '');

        setQty(1);
        setLoading(false);

        void loadSupportingProductData(data);
      } catch (fetchError) {
        if (!isActive) {
          return;
        }

        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load this product right now.');
        applySeo({
          title: 'Product Not Found',
          description: 'This Apex Fashion product is unavailable or could not be found.',
          canonicalUrl: buildCanonicalUrl(`/product/${productRouteParam}`),
          robots: NOINDEX_ROBOTS,
        });
        setLoading(false);
      }
    };

    fetchProduct();

    return () => {
      isActive = false;
    };
  }, [location.pathname, location.search, navigate, productId, productRouteParam, userInfo?.token]);

  const selectedVariant = useMemo(
    () => {
      if (!product?.variants?.length) {
        return null;
      }

      if (product.hasSizes && selectedSize && selectedColor) {
        return product.variants.find((variant) => {
          const optionSize = String(variant.size || '').trim().toLowerCase();
          const optionColor = String(variant.color || variant.label || '').trim().toLowerCase();
          return optionSize === selectedSize.toLowerCase() && optionColor === selectedColor.toLowerCase();
        }) || null;
      }

      return product.variants.find((variant) => String(variant._id) === String(selectedVariantId)) || null;
    },
    [product, selectedColor, selectedSize, selectedVariantId]
  );
  const categoryPath = getPublicCategoryPath(product?.category, categorySlug);
  const selectedSizeObj = useMemo(
    () => (product?.hasSizes && selectedSize ? product.sizes?.find((s) => s.size === selectedSize) : null),
    [product, selectedSize]
  );

  const availableColorsForSize = useMemo(() => {
    if (!selectedSizeObj) return [];
    const comboColors = (product?.variants || [])
      .filter((variant) =>
        variant.isActive !== false &&
          String(variant.size || '').trim().toLowerCase() === selectedSize.toLowerCase()
      )
      .map((variant) => ({
        name: String(variant.color || variant.label || '').trim(),
        variant,
        stock: Number(variant.countInStock || 0),
      }))
      .filter((entry) => entry.name);

    if (comboColors.length > 0) {
      return comboColors;
    }

    return (Array.isArray(selectedSizeObj.colors) ? selectedSizeObj.colors : []).map((color) => ({
      name: color,
      variant: null,
      stock: Number(selectedSizeObj.countInStock || 0),
    }));
  }, [product, selectedSize, selectedSizeObj]);

  const productImages = useMemo(() => {
    const variantImages = getVariantImageUrls(selectedVariant);

    return variantImages.length > 0 ? variantImages : getProductImages(product || {});
  }, [product, selectedVariant]);
  const currentGalleryImage = productImages.includes(selectedImage)
    ? selectedImage
    : productImages[0] || selectedImage || product?.image || '';
  const selectedImageIndex = Math.max(0, productImages.indexOf(currentGalleryImage));

  const effectivePrice = useMemo(() => {
    if (selectedVariant && Number(selectedVariant.price || 0) > 0) {
      return Number(selectedVariant.price);
    }

    if (selectedSizeObj && Number(selectedSizeObj.price || 0) > 0) {
      return Number(selectedSizeObj.price);
    }
    return Number(product?.price || 0) + Number(selectedVariant?.priceAdjustment || 0);
  }, [product, selectedSizeObj, selectedVariant]);

  const effectiveStock = useMemo(() => {
    if (selectedVariant) {
      return Number(selectedVariant.countInStock || 0);
    }

    if (selectedSizeObj) {
      const sizeCombinationStock = (product?.variants || [])
        .filter((variant) =>
          variant.isActive !== false &&
            String(variant.size || '').trim().toLowerCase() === String(selectedSizeObj.size || '').toLowerCase()
        )
        .reduce((total, variant) => total + Number(variant.countInStock || 0), 0);

      if (sizeCombinationStock > 0) {
        return sizeCombinationStock;
      }

      return Number(selectedSizeObj.countInStock || 0);
    }

    if (product?.hasSizes && Array.isArray(product.sizes)) {
      return product.sizes.reduce((total, sizeOption) => total + Number(sizeOption.countInStock || 0), 0);
    }

    return selectedVariant ? Number(selectedVariant.countInStock || 0) : Number(product?.countInStock || 0);
  }, [selectedSizeObj, selectedVariant, product]);

  const stockPresentation = getStockPresentation(effectiveStock || 0);
  const displaySku = selectedVariant?.sku || product?.sku || '';
  const currentProductPath = product ? buildProductPath(product) : `/product/${productRouteParam}`;

  const handleSelectSize = (sizeObj) => {
    const nextSize = sizeObj.size;
    const colors = (product?.variants || [])
      .filter((variant) =>
        variant.isActive !== false &&
          String(variant.size || '').trim().toLowerCase() === String(nextSize || '').toLowerCase()
      )
      .map((variant) => ({
        name: String(variant.color || variant.label || '').trim(),
        variant,
      }))
      .filter((entry) => entry.name);
    const fallbackColors = colors.length > 0
      ? colors
      : (Array.isArray(sizeObj.colors) ? sizeObj.colors : []).map((color) => ({ name: color, variant: null }));
    const autoColor = fallbackColors.length === 1 ? fallbackColors[0] : null;

    setSelectedSize(nextSize);
    setSelectedColor(autoColor?.name || '');
    setSelectedVariantId(autoColor?.variant?._id ? String(autoColor.variant._id) : '');
    setSizeError('');
    setQty(1);

    const variantImages = getVariantImageUrls(autoColor?.variant);
    if (variantImages.length > 0) {
      setSelectedImage(variantImages[0]);
      return;
    }

    const fallbackImages = getProductImages(product || {});
    setSelectedImage(fallbackImages[0] || product.image);
  };

  const handleSelectColor = (colorOption) => {
    setSelectedColor(colorOption.name);
    setSizeError('');
    setSelectedVariantId(colorOption.variant?._id ? String(colorOption.variant._id) : '');
    setQty(1);

    const variantImages = getVariantImageUrls(colorOption.variant);
    if (variantImages.length > 0) {
      setSelectedImage(variantImages[0]);
    }
  };

  const showGalleryImage = useCallback((image) => {
    setSelectedImage(image);
    setIsLightboxZoomed(false);
  }, []);

  const showPreviousImage = useCallback(() => {
    const currentIndex = Math.max(0, productImages.indexOf(currentGalleryImage));
    showGalleryImage(productImages[(currentIndex - 1 + productImages.length) % productImages.length] || currentGalleryImage);
  }, [currentGalleryImage, productImages, showGalleryImage]);

  const showNextImage = useCallback(() => {
    const currentIndex = Math.max(0, productImages.indexOf(currentGalleryImage));
    showGalleryImage(productImages[(currentIndex + 1) % productImages.length] || currentGalleryImage);
  }, [currentGalleryImage, productImages, showGalleryImage]);

  useEffect(() => {
    if (!isLightboxOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (event.key === 'ArrowLeft') {
        showPreviousImage();
      } else if (event.key === 'ArrowRight') {
        showNextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, showNextImage, showPreviousImage]);

  if (loading) {
    return <RouteLoadingScreen message="Loading product details..." />;
  }

  if (error || !product) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-3xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="font-serif text-3xl font-bold text-brand-dark">Product Unavailable</p>
          <p className="mt-3 text-sm text-red-700">{error || 'This product could not be found.'}</p>
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
    if (product.hasSizes && product.sizes?.length > 0) {
      if (!selectedSize) {
        setSizeError('Please select a size before adding to cart.');
        return;
      }

      if (availableColorsForSize.length > 0 && !selectedColor) {
        setSizeError('Please select an available color for this size before adding to cart.');
        return;
      }

      if (availableColorsForSize.length > 0 && selectedColor && !availableColorsForSize.some((color) => color.name === selectedColor)) {
        setSizeError('That color is not available for the selected size.');
        return;
      }
    }

    setSizeError('');

    addToCart(
      {
        ...product,
        image: selectedVariant?.image || currentGalleryImage || product.image,
        price: effectivePrice,
        countInStock: effectiveStock,
        size: selectedSize || '',
        color: selectedColor || '',
        variantId: selectedVariant?._id || '',
        variantLabel: selectedVariant?.label || '',
        sku: selectedVariant?.sku || product.sku || '',
      },
      qty
    );
    navigate('/cart');
  };

  const handleBuyNow = () => {
    if (product.hasSizes && product.sizes?.length > 0) {
      if (!selectedSize) {
        setSizeError('Please select a size before proceeding.');
        return;
      }

      if (availableColorsForSize.length > 0 && !selectedColor) {
        setSizeError('Please select an available color for this size before proceeding.');
        return;
      }

      if (availableColorsForSize.length > 0 && selectedColor && !availableColorsForSize.some((color) => color.name === selectedColor)) {
        setSizeError('That color is not available for the selected size.');
        return;
      }
    }

    setSizeError('');

    if (storeSettings.checkoutMode === 'whatsapp') {
      const rawNumber = (storeSettings.whatsappNumber || '+94770000000').replace(/\D/g, '');
      const unitPriceFormatted = formatCurrency(effectivePrice);
      const totalPriceFormatted = formatCurrency(effectivePrice * qty);
      const currentUrl = window.location.href;

      const messageLines = [
        `🛒 *NEW ORDER REQUEST*`,
        ``,
        `*Product:* ${product.name}`,
        product.hasSizes && selectedSize ? `*Size:* ${selectedSize}` : null,
        selectedColor ? `*Color:* ${selectedColor}` : null,
        `*Quantity:* ${qty}`,
        `*Unit Price:* ${unitPriceFormatted}`,
        `*Total:* ${totalPriceFormatted}`,
        ``,
        `*Product Link:* ${currentUrl}`,
        ``,
        `Thank you!`,
      ].filter((line) => line !== null).join('\n');

      const whatsappUrl = `https://wa.me/${rawNumber}?text=${encodeURIComponent(messageLines)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } else {
      addToCart(
        {
          ...product,
          image: selectedVariant?.image || currentGalleryImage || product.image,
          price: effectivePrice,
          countInStock: effectiveStock,
          size: selectedSize || '',
          color: selectedColor || '',
          variantId: selectedVariant?._id || '',
          variantLabel: selectedVariant?.label || '',
          sku: selectedVariant?.sku || product.sku || '',
        },
        qty
      );
      navigate('/checkout');
    }
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
      navigate(`/login?redirect=${encodeURIComponent(`${currentProductPath}${location.search}`)}`);
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
      navigate(`/login?redirect=${encodeURIComponent(`${currentProductPath}${location.search}`)}`);
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

  const renderVariantSelection = (containerClass = '') => {
    if (product?.hasSizes) return null;
    if (!product?.variants?.length) return null;
    const activeVariants = product.variants.filter((variant) => variant.isActive !== false);
    if (!activeVariants.length) return null;

    return (
      <div className={`rounded-[28px] border border-[#ecd9ca] bg-white p-5 shadow-sm ${containerClass}`}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Variant</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {activeVariants.map((variant) => {
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
                  <span className="mt-1 block truncate text-xs text-gray-500">
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
    );
  };

  return (
    <div className="min-h-screen bg-[#fff7ee] pt-2 sm:pt-4 pb-16">
      <div className="container mx-auto max-w-7xl px-4">
        <Link
          to="/products"
          className="inline-flex items-center text-sm font-semibold text-brand-dark transition hover:text-brand-primary"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Shop
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <section className="space-y-4 lg:sticky lg:top-24 h-fit">
            <button
              type="button"
              onClick={() => {
                setIsLightboxOpen(true);
                setIsLightboxZoomed(false);
              }}
              className="group relative block w-full overflow-hidden rounded-[32px] border border-[#ead6c6] bg-white p-2 text-left shadow-[0_24px_70px_rgba(53, 26, 17,0.10)]"
              aria-label={`Open full size view for ${product.name}`}
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-[26px] bg-[#f8efe6]">
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

            {renderVariantSelection('hidden lg:block mt-6')}
          </section>

          <section className="rounded-[32px] bg-white p-6 shadow-[0_24px_70px_rgba(53, 26, 17,0.10)] sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={categoryPath}
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
              {displaySku && (
                <span className="rounded-full border border-[#ead6c6] bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-gray-600">
                  SKU {displaySku}
                </span>
              )}
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-[#ecd9ca] bg-white transition-all duration-200">
              <button
                type="button"
                onClick={() => setDetailsExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between bg-[#fbf3ea] px-5 py-4 text-left transition-colors duration-200 hover:bg-[#f5e9dd]"
                aria-expanded={detailsExpanded}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary shrink-0">
                    <Info size={18} />
                  </div>
                  <span className="font-serif text-base font-bold text-brand-dark sm:text-lg">
                    Product Details & Specifications
                  </span>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-brand-primary transition-transform duration-300 shrink-0 ${
                    detailsExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {detailsExpanded && (
                <div className="p-5 space-y-5 border-t border-[#ecd9ca] bg-white animate-in fade-in slide-in-from-top-1">
                  {product.description && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Description</p>
                      <p className="mt-2 text-sm leading-7 text-gray-700 whitespace-pre-line">
                        {product.description}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4 rounded-2xl bg-[#f8efe6] p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Origin</p>
                      <p className="mt-1.5 text-sm leading-6 text-gray-700">{product.origin || 'India'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Contents & Specifications</p>
                      <p className="mt-1.5 text-sm leading-6 text-gray-700">{product.ingredients || 'Premium product with verified sourcing.'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Standalone Size & Color Selection Component */}
            {product?.hasSizes && product?.sizes?.length > 0 && (
              <div className="mt-6 rounded-[24px] border border-[#ecd9ca] bg-white p-5 shadow-xs space-y-5">
                {/* 1. Size Selection */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-base font-bold text-brand-dark">1. Select Size</h3>
                    {selectedSize && (
                      <span className="text-xs font-semibold text-brand-primary">Selected Size: {selectedSize}</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {product.sizes.map((sizeObj) => {
                      const comboStock = (product.variants || [])
                        .filter((variant) =>
                          variant.isActive !== false &&
                            String(variant.size || '').trim().toLowerCase() === String(sizeObj.size || '').toLowerCase()
                        )
                        .reduce((total, variant) => total + Number(variant.countInStock || 0), 0);
                      const hasCombinationRows = (product.variants || []).some((variant) =>
                        String(variant.size || '').trim().toLowerCase() === String(sizeObj.size || '').toLowerCase()
                      );
                      const sizeStock = hasCombinationRows ? comboStock : Number(sizeObj.countInStock || 0);
                      const isOutOfStock = sizeStock <= 0;
                      const isSelected = selectedSize === sizeObj.size;
                      const displayPrice = Number(sizeObj.price || 0) > 0 ? Number(sizeObj.price) : Number(product.price || 0);

                      return (
                        <button
                          key={sizeObj.size}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleSelectSize(sizeObj)}
                          className={`group relative flex min-w-[76px] flex-col items-center justify-center rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                            isOutOfStock
                              ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-60'
                              : isSelected
                                ? 'border-brand-primary bg-brand-primary text-white shadow-md'
                                : 'border-gray-300 bg-white text-brand-dark hover:border-brand-primary hover:bg-[#fff7ee]'
                          }`}
                        >
                          <span className="text-sm">{sizeObj.size}</span>
                          {isOutOfStock ? (
                            <span className="text-[9px] font-semibold text-red-500 uppercase tracking-tighter">Out of Stock</span>
                          ) : (
                            <span className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                              {formatCurrency(displayPrice)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Color Selection (Filtered by selected size) */}
                {!selectedSize && (
                  <div className="rounded-2xl border border-dashed border-brand-accent/30 bg-[#fff7ee] px-4 py-4 text-sm font-medium text-gray-600">
                    Select a size to see available colors.
                  </div>
                )}

                {selectedSize && availableColorsForSize.length > 0 && (
                  <div className="border-t border-[#f2e2d5] pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-base font-bold text-brand-dark">2. Select Color</h3>
                      {selectedColor && (
                        <span className="text-xs font-semibold text-brand-primary">Selected Color: {selectedColor}</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {availableColorsForSize.map((colorOption) => {
                        const isSelected = selectedColor === colorOption.name;
                        const isOutOfStock = Number(colorOption.stock || 0) <= 0;

                        return (
                          <button
                            key={colorOption.name}
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => handleSelectColor(colorOption)}
                            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all duration-200 ${
                              isOutOfStock
                                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-60'
                                : isSelected
                                ? 'border-brand-primary bg-brand-dark text-white shadow-md'
                                : 'border-gray-300 bg-[#fff7ee] text-brand-dark hover:border-brand-primary'
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/20 shadow-xs"
                              style={{ backgroundColor: colorOption.name.toLowerCase() }}
                            />
                            <span>{colorOption.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 rounded-[28px] border border-[#ecd9ca] bg-white p-4 sm:p-5 shadow-xs">
              {sizeError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
                  {sizeError}
                </div>
              )}
              {renderVariantSelection('lg:hidden mb-5')}

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-start">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 sm:hidden">Quantity</span>
                    <div className="inline-flex h-12 items-center rounded-full border border-gray-200 bg-[#fff7ee] px-1 shadow-xs">
                      <button
                        type="button"
                        onClick={() => setQty((currentQty) => Math.max(1, currentQty - 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-brand-dark transition-colors duration-200 hover:bg-brand-light"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="min-w-[44px] text-center text-base font-bold text-brand-dark">{qty}</span>
                      <button
                        type="button"
                        disabled={qty >= effectiveStock}
                        onClick={() => setQty((currentQty) => Math.min(effectiveStock, currentQty + 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-brand-dark transition-colors duration-200 hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-1 items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={effectiveStock === 0}
                      className={`inline-flex h-12 flex-1 items-center justify-center rounded-xl px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-[0.18em] transition-all duration-200 ${
                        effectiveStock === 0
                          ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                          : 'bg-brand-primary text-white shadow-sm hover:bg-brand-dark hover:shadow-md'
                      }`}
                    >
                      {effectiveStock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>

                    <button
                      type="button"
                      onClick={addToWishlist}
                      disabled={wishlistSaving}
                      className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl border border-brand-primary/20 px-4 py-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-brand-primary transition-all duration-200 hover:border-brand-primary hover:bg-brand-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {wishlistSaving ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Heart size={16} className="mr-1.5 text-brand-accent" />
                      )}
                      Save
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={effectiveStock === 0}
                  className={`flex h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-[0.18em] transition-all duration-200 ${
                    effectiveStock === 0
                      ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                      : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md'
                  }`}
                >
                  <MessageCircle size={18} className="mr-2" /> Buy Now
                </button>

                <Link
                  to="/products"
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-brand-primary/20 bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-all duration-200 hover:border-brand-primary hover:bg-brand-light hover:text-brand-dark"
                >
                  Continue Shopping
                </Link>
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

        <section className="mt-12 rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(53, 26, 17,0.08)] sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Trust & Quality</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-brand-dark sm:text-3xl">Why customers choose Apex Fashion</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {TRUST_POINTS.map(([title, subtitle], index) => {
              const Icon = [BadgeCheck, Sparkles, ShieldCheck, Truck][index];

              return (
                <div key={title} className="flex items-start gap-3.5 rounded-[20px] bg-[#f8efe6] p-3.5 sm:p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-primary shadow-sm">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-brand-dark leading-tight">{title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">{subtitle}</p>
                  </div>
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
                to={categoryPath}
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
