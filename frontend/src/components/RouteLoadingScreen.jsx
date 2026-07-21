const RouteLoadingScreen = ({ message = 'Preparing your experience' }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#fff7ee] px-6 py-16 text-center">
    <div className="relative flex flex-col items-center">
      {/* Animated Logo Container with glowing ring */}
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#d99a32]/30 opacity-30" />
        <div
          className="absolute -inset-2 animate-spin rounded-full border border-[#d99a32]/40"
          style={{ animationDuration: '9s' }}
        />

        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#d99a32]/70 bg-[#2a140e] p-3 shadow-[0_0_30px_rgba(217,154,50,0.25)]">
          <img
            src="/logo.webp"
            alt="Apex Spices logo"
            className="h-12 w-auto animate-preloader-pulse object-contain"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* Brand Title */}
      <h2 className="font-serif text-xl font-bold uppercase tracking-[0.22em] text-[#d99a32] sm:text-2xl">
        APEX SPICES
      </h2>
      <p className="mt-1 font-serif text-lg font-bold text-brand-dark sm:text-xl">
        {message}
      </p>

      {/* Shimmer Progress Bar */}
      <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-brand-primary/10 shadow-inner">
        <div className="h-full w-full animate-preloader-shimmer bg-gradient-to-r from-[#d99a32] via-[#fff7ee] to-[#d99a32]" />
      </div>
    </div>
  </div>
);

export default RouteLoadingScreen;
