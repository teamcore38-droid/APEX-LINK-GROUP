import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for Intersection Observer scroll reveal animations.
 * @param {Object} [options]
 * @param {number} [options.threshold=0.12] - Viewport visibility threshold
 * @param {string} [options.rootMargin='0px 0px -40px 0px'] - Margin around root
 * @returns {[React.RefObject, boolean]} [ref, isVisible]
 */
export const useScrollReveal = (options = {}) => {
  const { threshold = 0.12, rootMargin = '0px 0px -40px 0px' } = options;
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return undefined;
    }

    // Fallback if IntersectionObserver is not available
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return undefined;
    }

    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      if (node) {
        observer.unobserve(node);
      }
    };
  }, [threshold, rootMargin]);

  return [ref, isVisible];
};

export default useScrollReveal;
