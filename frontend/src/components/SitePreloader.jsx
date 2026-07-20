import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const VISITED_ROUTES_KEY = 'apex_visited_routes_session';

const getVisitedRoutes = () => {
  try {
    const data = window.sessionStorage.getItem(VISITED_ROUTES_KEY);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch (err) {
    console.error(err);
    return new Set();
  }
};

const markRouteVisited = (pathname) => {
  try {
    const visited = getVisitedRoutes();
    visited.add(pathname);
    window.sessionStorage.setItem(VISITED_ROUTES_KEY, JSON.stringify([...visited]));
  } catch (err) {
    console.error(err);
  }
};

const SitePreloader = () => {
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const currentPath = location.pathname;
    const visited = getVisitedRoutes();

    if (visited.has(currentPath)) {
      setShowLoader(false);
      return undefined;
    }

    // First time loading this route in session
    setShowLoader(true);
    setIsFadingOut(false);

    let isMounted = true;
    const startTime = Date.now();
    const MIN_DISPLAY_TIME = 650; // Minimum time to show loader for smooth feel
    const MAX_DISPLAY_TIME = 1800; // Fallback maximum timeout

    const finishLoading = () => {
      if (!isMounted) return;

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsedTime);

      setTimeout(() => {
        if (!isMounted) return;
        setIsFadingOut(true);
        markRouteVisited(currentPath);

        setTimeout(() => {
          if (!isMounted) return;
          setShowLoader(false);
        }, 450); // Match CSS fade-out transition duration
      }, remainingTime);
    };

    // Check document readiness and critical images
    const handleCheckReady = () => {
      if (document.readyState === 'complete') {
        finishLoading();
      } else {
        window.addEventListener('load', finishLoading, { once: true });
      }
    };

    handleCheckReady();

    // Safety fallback timeout
    const fallbackTimer = setTimeout(finishLoading, MAX_DISPLAY_TIME);

    return () => {
      isMounted = false;
      window.removeEventListener('load', finishLoading);
      clearTimeout(fallbackTimer);
    };
  }, [location.pathname]);

  if (!showLoader) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Loading page content"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1f0f0a]/90 backdrop-blur-xl transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient glow effects */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d99a32]/15 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8c3b2a]/20 blur-2xl animate-pulse" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Animated Logo Container with glowing ring */}
        <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#d99a32]/30 opacity-30" />
          <div className="absolute -inset-2 animate-spin rounded-full border border-[#d99a32]/40" style={{ animationDuration: '9s' }} />

          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#d99a32]/70 bg-[#2a140e] p-3.5 shadow-[0_0_35px_rgba(217,154,50,0.35)]">
            <img
              src="/logo.webp"
              alt="Apex Spices logo"
              className="h-16 w-auto animate-preloader-pulse object-contain"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Brand Title */}
        <h2 className="font-serif text-2xl font-bold uppercase tracking-[0.22em] text-[#d99a32] sm:text-3xl">
          APEX SPICES
        </h2>
        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.32em] text-[#fff7ee]/85 sm:text-xs">
          Global Marketplace &bull; Premium Quality
        </p>

        {/* Shimmer Progress Bar */}
        <div className="mt-7 h-1 w-44 overflow-hidden rounded-full bg-white/10 shadow-inner">
          <div className="h-full w-full animate-preloader-shimmer bg-gradient-to-r from-[#d99a32] via-[#fff7ee] to-[#d99a32]" />
        </div>
      </div>
    </div>
  );
};

export default SitePreloader;
