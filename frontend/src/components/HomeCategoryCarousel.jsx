import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCategoryImage, getPublicCategoryPath } from '../utils/categoryUi';

const SCROLL_EDGE_TOLERANCE = 6;

const HomeCategoryCarousel = ({ categories = [] }) => {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const maxScrollLeft = Math.max(element.scrollWidth - element.clientWidth, 0);
    setCanScrollLeft(element.scrollLeft > SCROLL_EDGE_TOLERANCE);
    setCanScrollRight(element.scrollLeft < maxScrollLeft - SCROLL_EDGE_TOLERANCE);
  }, []);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return undefined;

    updateScrollState();
    element.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateScrollState)
      : null;
    resizeObserver?.observe(element);

    return () => {
      element.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [categories.length, updateScrollState]);

  const scrollCategories = (direction) => {
    const element = scrollContainerRef.current;
    if (!element) return;

    element.scrollBy({
      left: direction === 'left' ? -element.clientWidth * 0.72 : element.clientWidth * 0.72,
      behavior: 'smooth',
    });
  };

  if (categories.length === 0) return null;

  return (
    <div className="relative" role="region" aria-label="Shop by category" aria-roledescription="carousel">
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#fff7ee] to-transparent transition-opacity duration-200 sm:w-12 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#fff7ee] to-transparent transition-opacity duration-200 sm:w-12 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() => scrollCategories('left')}
        disabled={!canScrollLeft}
        aria-label="Previous categories"
        className="absolute left-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#ead6c6] bg-white/95 text-brand-primary shadow-md transition hover:border-brand-accent hover:text-brand-accent disabled:pointer-events-none disabled:opacity-0 md:flex"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => scrollCategories('right')}
        disabled={!canScrollRight}
        aria-label="Next categories"
        className="absolute right-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#ead6c6] bg-white/95 text-brand-primary shadow-md transition hover:border-brand-accent hover:text-brand-accent disabled:pointer-events-none disabled:opacity-0 md:flex"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>

      <div
        ref={scrollContainerRef}
        className="flex touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto px-1 py-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-5 md:px-12"
        tabIndex="0"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') scrollCategories('left');
          if (event.key === 'ArrowRight') scrollCategories('right');
        }}
      >
        {categories.map((category) => (
          <Link
            key={category._id || category.slug || category.name}
            to={getPublicCategoryPath(category.name, category.slug)}
            className="group w-[104px] min-w-[104px] snap-start text-center sm:w-[122px] sm:min-w-[122px] md:w-[132px] md:min-w-[132px]"
          >
            <div className="mx-auto aspect-[0.78] w-full overflow-hidden rounded-[999px] border-2 border-white bg-[#f2e3d7] shadow-[0_6px_18px_rgba(77,33,22,0.12)] transition duration-200 group-hover:-translate-y-1 group-hover:border-brand-accent group-hover:shadow-[0_10px_22px_rgba(77,33,22,0.18)]">
              <img
                src={getCategoryImage(category)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-center"
              />
            </div>
            <span className="mt-3 block font-serif text-sm font-bold leading-tight text-brand-dark sm:text-base">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HomeCategoryCarousel;
