import { useEffect, useRef, useState } from 'react';
import Product from '../components/Product';
import FeaturedProductCarousel from '../components/FeaturedProductCarousel';
import HomeCategoryCarousel from '../components/HomeCategoryCarousel';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, Globe, ShieldCheck, Truck } from 'lucide-react';
import { getCategories } from '../utils/categoryApi';
import {
  getCachedHomepageProducts,
  getHomepageProducts,
} from '../utils/homepageProductCache';
import {
  HOME_HERO_BACKGROUND_IMAGES as heroBackgroundImages,
  HOME_HERO_DESKTOP_MEDIA,
  HOME_HERO_MOBILE_MEDIA,
  HOME_MOBILE_HERO_BACKGROUND_IMAGES as mobileHeroBackgroundImages,
  HOME_MOBILE_HERO_MARK,
} from '../utils/homeHeroAssets';
import useScrollReveal from '../hooks/useScrollReveal';

const createInitialCollectionState = (collection) => {
  const cachedProducts = getCachedHomepageProducts(collection);

  return {
    products: cachedProducts || [],
    loading: cachedProducts === null,
    error: null,
  };
};

const getInitialImageCounts = () => {
  const width = window.innerWidth;

  if (width < 768) {
    return { featured: 2, bestSellers: 2 };
  }

  if (width < 1024) {
    return { featured: 3, bestSellers: 3 };
  }

  return { featured: 4, bestSellers: 4 };
};

const HomePage = () => {
  const [featuredState, setFeaturedState] = useState(() => createInitialCollectionState('featured'));
  const [bestSellersState, setBestSellersState] = useState(() => createInitialCollectionState('bestSellers'));
  const [homeCategories, setHomeCategories] = useState([]);
  const [activeHeroImage, setActiveHeroImage] = useState(0);
  const [initialDesktopViewport] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const heroBackgroundRef = useRef(null);
  const mobileHeroMarkRef = useRef(null);
  const [heroAssetsReady, setHeroAssetsReady] = useState(() => ({
    background: false,
    mobileMark: initialDesktopViewport,
  }));
  const [prioritizeProductImages, setPrioritizeProductImages] = useState(false);

  const [trustBadgesRef, trustBadgesVisible] = useScrollReveal();
  const [featuredRef, featuredVisible] = useScrollReveal();
  const [bestSellersRef, bestSellersVisible] = useScrollReveal();
  const [fashionBannerRef, fashionBannerVisible] = useScrollReveal();
  const heroContentReady = heroAssetsReady.background && heroAssetsReady.mobileMark;
  const featuredProducts = featuredState.products;
  const bestSellers = bestSellersState.products;
  const initialImageCounts = getInitialImageCounts();

  useEffect(() => {
    const heroTimer = window.setInterval(() => {
      setActiveHeroImage((prev) => (
        (prev + 1) % Math.max(heroBackgroundImages.length, mobileHeroBackgroundImages.length)
      ));
    }, 7000);

    return () => window.clearInterval(heroTimer);
  }, []);

  useEffect(() => {
    const imageSet = window.matchMedia('(min-width: 768px)').matches
      ? heroBackgroundImages
      : mobileHeroBackgroundImages;
    const nextImageUrl = imageSet[(activeHeroImage + 1) % imageSet.length];
    const preloadNextImage = () => {
      const image = new Image();
      image.src = nextImageUrl;
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preloadNextImage, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = window.setTimeout(preloadNextImage, 600);
    return () => window.clearTimeout(timer);
  }, [activeHeroImage]);

  useEffect(() => {
    getCategories()
      .then((categories) => {
        setHomeCategories(categories.filter((category) => category.isActive !== false));
      })
      .catch((err) => {
        console.error('Unable to load homepage categories', err);
      });
  }, []);

  useEffect(() => {
    if (heroContentReady) {
      return;
    }

    const completedImageTimer = window.setTimeout(() => {
      const backgroundImage = heroBackgroundRef.current;
      const mobileMarkReady = initialDesktopViewport || mobileHeroMarkRef.current?.complete;

      if (backgroundImage?.complete && mobileMarkReady) {
        setHeroAssetsReady({ background: true, mobileMark: true });
      }
    }, 0);

    const fallbackTimer = window.setTimeout(() => {
      setHeroAssetsReady({ background: true, mobileMark: true });
    }, 3500);

    return () => {
      window.clearTimeout(completedImageTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [heroContentReady, initialDesktopViewport]);

  useEffect(() => {
    if (!heroContentReady) {
      return undefined;
    }

    let isActive = true;
    let idleId;
    let timerId;

    const publishProducts = (collection, products) => {
      if (!isActive) {
        return;
      }

      const setCollectionState = collection === 'featured' ? setFeaturedState : setBestSellersState;
      setCollectionState({ products, loading: false, error: null });
    };

    const publishError = (collection, error) => {
      console.error(`Unable to load homepage ${collection}`, error);

      if (!isActive) {
        return;
      }

      const setCollectionState = collection === 'featured' ? setFeaturedState : setBestSellersState;
      setCollectionState((current) => ({ ...current, loading: false, error }));
    };

    const startProductRequests = () => {
      if (!isActive) {
        return;
      }

      setPrioritizeProductImages(true);

      void getHomepageProducts('featured')
        .then((products) => publishProducts('featured', products))
        .catch((error) => publishError('featured', error));

      void getHomepageProducts('bestSellers')
        .then((products) => publishProducts('bestSellers', products))
        .catch((error) => publishError('bestSellers', error));
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(startProductRequests, { timeout: 1200 });
    } else {
      timerId = window.setTimeout(startProductRequests, 300);
    }

    return () => {
      isActive = false;

      if (idleId !== undefined) {
        window.cancelIdleCallback(idleId);
      }

      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
  }, [heroContentReady]);

  const markHeroBackgroundReady = () => {
    setHeroAssetsReady((current) => (
      current.background ? current : { ...current, background: true }
    ));
  };

  const markMobileHeroReady = () => {
    setHeroAssetsReady((current) => (
      current.mobileMark ? current : { ...current, mobileMark: true }
    ));
  };

  return (
    <div>
      <div className="relative flex min-h-[72svh] items-center justify-center overflow-hidden bg-brand-dark md:h-[72vh] md:min-h-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 20% 20%, rgba(217, 154, 50,0.14), transparent 52%), radial-gradient(ellipse at 80% 75%, rgba(140, 59, 42,0.85), transparent 62%), linear-gradient(155deg, #2a140e 0%, #351a11 45%, #4a2317 100%)',
          }}
        ></div>
        <picture key={`hero-bg-${activeHeroImage}`}>
          <source
            media={HOME_HERO_DESKTOP_MEDIA}
            srcSet={heroBackgroundImages[activeHeroImage % heroBackgroundImages.length]}
          />
          <source
            media={HOME_HERO_MOBILE_MEDIA}
            srcSet={mobileHeroBackgroundImages[activeHeroImage % mobileHeroBackgroundImages.length]}
          />
          <img
            ref={heroBackgroundRef}
            src={mobileHeroBackgroundImages[activeHeroImage % mobileHeroBackgroundImages.length]}
            alt=""
            aria-hidden="true"
            width="1717"
            height="916"
            fetchPriority={activeHeroImage === 0 ? 'high' : 'auto'}
            loading={activeHeroImage === 0 ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={markHeroBackgroundReady}
            onError={markHeroBackgroundReady}
            className="hero-bg-crossfade pointer-events-none absolute inset-0 h-full w-full object-cover object-center [--hero-opacity:0.42] md:[--hero-opacity:0.4]"
          />
        </picture>
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(217, 154, 50,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(217, 154, 50,0.6) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-70"></div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 text-center md:py-0">
          <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.26em] text-brand-accent md:mb-4 md:text-sm md:tracking-[0.3em]">
            Sri Lankan Fashion Store
          </span>
          <h1 className="mb-4 font-serif text-4xl font-bold leading-tight text-brand-light drop-shadow-lg sm:text-5xl md:mb-6 md:text-7xl">
            Curated Fashion <br /> For Everyday Style
          </h1>
          <picture className="contents">
            <source media={HOME_HERO_MOBILE_MEDIA} srcSet={HOME_MOBILE_HERO_MARK} />
            <img
              ref={mobileHeroMarkRef}
              alt="Apex Fashion hero mark"
              width="512"
              height="512"
              fetchPriority="high"
              decoding="async"
              onLoad={markMobileHeroReady}
              onError={markMobileHeroReady}
              className="mx-auto mb-8 mt-3 h-44 w-auto object-contain drop-shadow-[0_14px_32px_rgba(0,0,0,0.35)] md:hidden"
            />
          </picture>
          <p className="mx-auto mb-7 hidden max-w-2xl text-base font-light leading-8 text-gray-100 drop-shadow-md md:mb-10 md:block md:text-xl">
            Apex Fashion brings together clothing, footwear, accessories, and style essentials with clear prices, PayHere checkout, delivery updates, and customer-friendly support.
          </p>
          <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-3 sm:max-w-none sm:flex-row sm:gap-4">
            <Link to="/products" className="btn-primary w-full px-6 py-3.5 text-base font-bold uppercase tracking-wider transition-transform hover:-translate-y-1 sm:w-auto sm:px-8 sm:py-4 sm:text-lg">
              Shop Fashion
            </Link>
            <Link to="/categories" className="w-full border-2 border-brand-accent/70 px-6 py-3.5 text-base font-bold uppercase tracking-wider text-brand-accent transition-all hover:bg-brand-accent hover:text-brand-dark sm:w-auto sm:px-8 sm:py-4 sm:text-lg">
              Browse Categories
            </Link>
          </div>
        </div>
      </div>

      <div ref={trustBadgesRef} className="border-y border-brand-accent/45 bg-gradient-to-r from-[#4a2317] via-[#8c3b2a] to-[#31160f] py-4 text-white md:py-5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {[
              { icon: Truck, title: 'Sri Lanka Wide Delivery', subtitle: 'All 25 Districts' },
              { icon: Globe, title: 'Clear Product Details', subtitle: 'Sizes, colors, and SKUs' },
              { icon: ShieldCheck, title: 'Return Support', subtitle: 'Policy terms apply' },
              { icon: Award, title: 'PayHere Checkout', subtitle: 'Verified payment status' },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`group rounded-2xl border border-white/14 bg-white/[0.06] px-3 py-4 text-center shadow-[0_10px_28px_rgba(0,0,0,0.14)] backdrop-blur-[1.5px] transition hover:bg-white/[0.1] md:px-4 md:py-5 reveal-fade-up ${
                  trustBadgesVisible ? 'is-visible' : ''
                }`}
                style={{ transitionDelay: `${idx * 80}ms` }}
              >
                <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-brand-accent/55 bg-[#4a2317] text-brand-accent md:mb-3 md:h-11 md:w-11">
                  <item.icon size={19} />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#fff7ee] md:text-sm">{item.title}</p>
                <p className="mt-1 text-[11px] text-[#e7c7ad] md:text-xs">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {homeCategories.length > 0 && (
        <section className="bg-[#fff7ee] pb-4 pt-6 md:pb-6 md:pt-8" aria-labelledby="home-category-links-title">
          <div className="container mx-auto px-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-4 md:mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-primary">Browse by Category</p>
                <h2 id="home-category-links-title" className="mt-1.5 font-serif text-3xl font-bold text-brand-dark md:text-4xl">
                  Shop by Category
                </h2>
              </div>
              <Link
                to="/categories"
                className="inline-flex items-center rounded-full border border-brand-primary/25 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors hover:bg-brand-primary hover:text-white sm:px-5 sm:py-2.5"
              >
                View All Categories <ArrowRight size={14} className="ml-2" />
              </Link>
            </div>
            <HomeCategoryCarousel categories={homeCategories} />
          </div>
        </section>
      )}

      <div ref={featuredRef} className="bg-[radial-gradient(circle_at_top,_rgba(217, 154, 50,0.10),_transparent_58%),#fffaf4] py-6 md:py-8">
        <div className="container mx-auto px-4">
          <div
            className={`mb-4 text-center md:mb-5 reveal-fade-up ${featuredVisible ? 'is-visible' : ''}`}
            style={{ transitionDelay: '0ms' }}
          >
            <h2 className="font-serif text-3xl font-bold text-brand-dark md:text-4xl">Featured Collection</h2>
            <div className="mx-auto mt-3 h-px w-28 bg-gradient-to-r from-transparent via-brand-accent to-transparent"></div>
          </div>

          {featuredState.loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-[255px] animate-pulse rounded-lg border border-[#ead6c6] bg-[#f6eadf] sm:h-[285px]" />
              ))}
            </div>
          ) : featuredState.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-6 text-center text-red-700">
              <p className="font-semibold">Unable to load featured collection right now.</p>
              <Link
                to="/products"
                className="mt-4 inline-flex items-center rounded-md border border-red-300 px-5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-red-700 transition-colors hover:bg-red-100"
              >
                Browse All Products
              </Link>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="rounded-xl border border-brand-accent/25 bg-[#f8eee5] px-6 py-10 text-center text-brand-primary">
              <p className="font-serif text-2xl font-bold text-brand-dark">No featured products yet</p>
              <p className="mt-2 text-sm">Explore the full store while our team curates featured highlights.</p>
              <Link
                to="/products"
                className="mt-5 inline-flex items-center rounded-md border border-brand-primary px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
              >
                Explore Store
              </Link>
            </div>
          ) : (
            <FeaturedProductCarousel
              products={featuredProducts}
              isVisible={featuredVisible}
              prioritizeFirstPage={prioritizeProductImages}
            />
          )}

          {!featuredState.loading && !featuredState.error && featuredProducts.length > 0 && (
            <div
              className={`mt-5 text-center reveal-fade-up ${featuredVisible ? 'is-visible' : ''}`}
              style={{ transitionDelay: '450ms' }}
            >
              <Link
                to="/products"
                className="inline-flex items-center rounded-md border border-brand-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
              >
                Explore Full Collection
              </Link>
            </div>
          )}
        </div>
      </div>

      <div ref={bestSellersRef} className="bg-[#f5e7da] py-8 md:py-10" aria-busy={bestSellersState.loading}>
        <div className="container mx-auto px-4">
          <div
            className={`mb-5 flex flex-wrap items-end justify-between gap-4 reveal-fade-up ${bestSellersVisible ? 'is-visible' : ''}`}
            style={{ transitionDelay: '0ms' }}
          >
            <h2 className="font-serif text-3xl font-bold text-brand-dark md:text-4xl">Best Sellers</h2>
            <Link
              to="/products"
              className="inline-flex items-center rounded-full border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
            >
              Shop All Products
            </Link>
          </div>

          {bestSellersState.loading ? (
            <div className="product-grid" aria-label="Loading best sellers">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="min-h-[330px] animate-pulse rounded-2xl border border-[#e4cdbb] bg-[#ecd9ca] sm:min-h-[430px]"
                />
              ))}
            </div>
          ) : bestSellersState.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-6 text-center text-red-700">
              <p className="font-semibold">Unable to load best sellers right now.</p>
            </div>
          ) : bestSellers.length === 0 ? (
            <div className="rounded-xl border border-brand-accent/25 bg-[#f8eee5] px-6 py-8 text-center text-brand-primary">
              <p className="font-serif text-xl font-bold text-brand-dark">No best sellers yet</p>
              <p className="mt-2 text-sm">Explore the full collection for more customer favorites.</p>
            </div>
          ) : (
            <div className="product-grid">
              {bestSellers.map((product, index) => (
                <div
                  key={product._id}
                  className={`h-full reveal-fade-up ${bestSellersVisible ? 'is-visible' : ''}`}
                  style={{ transitionDelay: `${(index + 1) * 100}ms` }}
                >
                  <Product
                    product={product}
                    priority={prioritizeProductImages && index < initialImageCounts.bestSellers}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={fashionBannerRef} className="bg-[#f6eadf] py-14 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-10 md:flex-row md:gap-12">
            <div
              className={`relative md:w-1/2 reveal-fade-up ${fashionBannerVisible ? 'is-visible' : ''}`}
              style={{ transitionDelay: '0ms' }}
            >
              <div className="absolute -inset-4 hidden translate-x-4 translate-y-4 transform rounded-lg border-2 border-brand-accent md:block"></div>
              <img
                src="https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=1000"
                alt="Curated fashion apparel and footwear collection"
                width="1000"
                height="1250"
                loading="lazy"
                decoding="async"
                className="relative z-10 h-[500px] w-full rounded-lg object-cover shadow-2xl"
              />
            </div>
            <div
              className={`md:w-1/2 reveal-fade-up ${fashionBannerVisible ? 'is-visible' : ''}`}
              style={{ transitionDelay: '150ms' }}
            >
              <h2 className="mb-4 font-serif text-4xl font-bold text-brand-dark md:text-5xl">Style Made for Every Moment</h2>
              <div className="mb-6 h-1 w-20 bg-brand-accent"></div>
              <p className="mb-4 text-lg leading-relaxed text-gray-700">
                Discover fashion essentials selected for comfort, confidence, and everyday polish. From statement footwear to easy wardrobe staples, every piece is chosen to help you dress well without overthinking it.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-gray-700">
                We focus on wearable designs, dependable materials, and versatile styling, so your cart feels ready for workdays, weekends, celebrations, and everything in between.
              </p>
              <Link to="/products" className="btn-outline inline-block border-brand-dark px-8 py-4 font-bold uppercase tracking-wider text-brand-dark hover:bg-brand-dark hover:text-white">
                Explore Fashion
              </Link>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default HomePage;
