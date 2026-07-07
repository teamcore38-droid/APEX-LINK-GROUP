import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Product from './Product';

const getItemsPerView = (width) => {
  if (width < 768) {
    return 1;
  }

  if (width < 1024) {
    return 2;
  }

  return 3;
};

const chunkProducts = (products, size) => {
  const pages = [];

  for (let index = 0; index < products.length; index += size) {
    pages.push(products.slice(index, index + size));
  }

  return pages;
};

const FeaturedProductCarousel = ({ products = [] }) => {
  const [itemsPerView, setItemsPerView] = useState(() => getItemsPerView(window.innerWidth));
  const [activePage, setActivePage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef(null);

  const curatedProducts = useMemo(() => products.slice(0, 8), [products]);
  const pages = useMemo(
    () => chunkProducts(curatedProducts, itemsPerView),
    [curatedProducts, itemsPerView]
  );
  const safeActivePage = pages.length > 0 ? activePage % pages.length : 0;

  useEffect(() => {
    const onResize = () => {
      setItemsPerView(getItemsPerView(window.innerWidth));
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (pages.length <= 1 || isPaused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActivePage((currentPage) => (currentPage + 1) % pages.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [activePage, isPaused, pages.length]);

  const goToPrev = () => {
    setActivePage((currentPage) => (currentPage - 1 + pages.length) % pages.length);
  };

  const goToNext = () => {
    setActivePage((currentPage) => (currentPage + 1) % pages.length);
  };

  const onBlurCapture = (event) => {
    const relatedTarget = event.relatedTarget;

    if (carouselRef.current && relatedTarget && carouselRef.current.contains(relatedTarget)) {
      return;
    }

    setIsPaused(false);
  };

  if (pages.length === 0) {
    return null;
  }

  return (
    <div
      ref={carouselRef}
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured products carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={onBlurCapture}
    >
      <div className="overflow-hidden rounded-[28px]">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{
            transform: `translateX(-${safeActivePage * 100}%)`,
          }}
        >
          {pages.map((pageProducts, pageIndex) => (
            <div key={`featured-page-${pageIndex}`} className="w-full flex-shrink-0">
              <div
                className={`grid gap-6 ${
                  itemsPerView === 1
                    ? 'grid-cols-1'
                    : itemsPerView === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                }`}
              >
                {pageProducts.map((product) => (
                  <div key={product._id} className="h-full">
                    <Product product={product} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pages.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-3 md:flex">
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous featured products"
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ccd8e8] bg-white/90 text-[#24406b] shadow-lg transition hover:border-[#8a6d1a] hover:text-[#8a6d1a]"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next featured products"
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ccd8e8] bg-white/90 text-[#24406b] shadow-lg transition hover:border-[#8a6d1a] hover:text-[#8a6d1a]"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="mt-7 flex items-center justify-center gap-2">
            {pages.map((_, index) => {
              const isCurrent = index === safeActivePage;
              return (
                <button
                  key={`featured-dot-${index}`}
                  type="button"
                  onClick={() => setActivePage(index)}
                  aria-label={`Go to featured slide ${index + 1} of ${pages.length}`}
                  aria-current={isCurrent ? 'true' : 'false'}
                  className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                    isCurrent
                      ? 'border-[#8a6d1a] bg-[#8a6d1a] text-white'
                      : 'border-[#ccd8e8] bg-white text-[#46648c] hover:border-[#8a6d1a] hover:text-[#8a6d1a]'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-center gap-3 md:hidden">
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous featured products"
              className="inline-flex items-center rounded-full border border-[#ccd8e8] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#24406b] transition hover:border-[#8a6d1a] hover:text-[#8a6d1a]"
            >
              <ChevronLeft size={16} className="mr-2" /> Prev
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next featured products"
              className="inline-flex items-center rounded-full border border-[#ccd8e8] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#24406b] transition hover:border-[#8a6d1a] hover:text-[#8a6d1a]"
            >
              Next <ChevronRight size={16} className="ml-2" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FeaturedProductCarousel;
