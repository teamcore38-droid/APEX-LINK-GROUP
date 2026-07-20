import { useCallback, useRef, useState } from 'react';

/**
 * Custom hook for Intersection Observer scroll reveal animations.
 * Uses Callback Ref to support conditionally rendered and async loaded elements.
 * @param {Object} [options]
 * @param {number} [options.threshold=0.08] - Viewport visibility threshold
 * @param {string} [options.rootMargin='0px 0px -20px 0px'] - Margin around root
 * @returns {[Function, boolean]} [refCallback, isVisible]
 */
export const useScrollReveal = (options = {}) => {
  const { threshold = 0.08, rootMargin = '0px 0px -20px 0px' } = options;
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef(null);

  const ref = useCallback(
    (node) => {
      if (isVisible) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node) return;

      // Respect prefers-reduced-motion
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setIsVisible(true);
        return;
      }

      // Fallback if IntersectionObserver is not available
      if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        setIsVisible(true);
        return;
      }

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        },
        { threshold, rootMargin }
      );

      observerRef.current.observe(node);
    },
    [threshold, rootMargin, isVisible]
  );

  return [ref, isVisible];
};

export default useScrollReveal;
