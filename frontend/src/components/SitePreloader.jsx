import { useEffect, useState } from 'react';

const PRELOADER_SEEN_KEY = 'apex_preloader_seen_session';

const hasSeenPreloader = () => {
  try {
    return window.sessionStorage.getItem(PRELOADER_SEEN_KEY) === '1';
  } catch (err) {
    console.error(err);
    return false;
  }
};

const markPreloaderSeen = () => {
  try {
    window.sessionStorage.setItem(PRELOADER_SEEN_KEY, '1');
  } catch (err) {
    console.error(err);
  }
};

const SitePreloader = () => {
  const [showLoader, setShowLoader] = useState(() => !hasSeenPreloader());
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!showLoader) {
      return undefined;
    }

    let isMounted = true;
    let finishStarted = false;
    const startTime = Date.now();
    const timers = [];
    const MIN_DISPLAY_TIME = 300;
    const MAX_DISPLAY_TIME = 1400;

    const finishLoading = () => {
      if (!isMounted || finishStarted) return;

      finishStarted = true;

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsedTime);

      timers.push(window.setTimeout(() => {
        if (!isMounted) return;
        setIsFadingOut(true);
        markPreloaderSeen();

        timers.push(window.setTimeout(() => {
          if (!isMounted) return;
          setShowLoader(false);
        }, 300));
      }, remainingTime));
    };

    if (document.readyState === 'complete') {
      finishLoading();
    } else {
      window.addEventListener('load', finishLoading, { once: true });
    }

    timers.push(window.setTimeout(finishLoading, MAX_DISPLAY_TIME));

    return () => {
      isMounted = false;
      window.removeEventListener('load', finishLoading);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [showLoader]);

  if (!showLoader) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Loading page content"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1f0f0a] transition-opacity duration-300 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Animated Logo Container with glowing ring */}
        <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#d99a32]/30 opacity-30" />
          <div className="absolute -inset-2 animate-spin rounded-full border border-[#d99a32]/40" style={{ animationDuration: '9s' }} />

          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#d99a32]/70 bg-[#2a140e] p-3.5 shadow-[0_0_35px_rgba(217,154,50,0.35)]">
            <img
              src="/logo.webp"
              alt="Apex Spices logo"
              width="96"
              height="96"
              decoding="async"
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
