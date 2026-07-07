const RouteLoadingScreen = () => (
  <div className="flex min-h-[55vh] items-center justify-center bg-[#f7f9fc] px-4">
    <div className="w-full max-w-md rounded-[28px] border border-[#dce4ef] bg-white px-8 py-10 text-center shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.34em] text-brand-accent">Apex Link Group</p>
      <div className="mx-auto mt-5 h-12 w-12 animate-spin rounded-full border-[3px] border-brand-accent/30 border-t-brand-primary" />
      <p className="mt-5 font-serif text-2xl font-bold text-brand-dark">Preparing your experience</p>
      <p className="mt-2 text-sm leading-7 text-gray-500">
        Loading premium storefront content and secure account tools.
      </p>
    </div>
  </div>
);

export default RouteLoadingScreen;
