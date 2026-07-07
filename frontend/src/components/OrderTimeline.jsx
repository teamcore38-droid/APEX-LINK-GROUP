const OrderTimeline = ({ timeline = [], title = 'Order Timeline' }) => {
  if (!timeline.length) {
    return null;
  }

  return (
    <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Timeline</p>
      <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">{title}</h2>

      <div className="mt-6 space-y-5">
        {timeline.map((entry, index) => (
          <div key={entry.id || `${entry.status}-${index}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="mt-1 h-3 w-3 rounded-full bg-brand-primary" />
              {index !== timeline.length - 1 && <div className="mt-2 h-full w-px bg-brand-accent/20" />}
            </div>
            <div className="flex-1 rounded-2xl bg-brand-light p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-serif text-xl font-bold text-brand-dark">{entry.status}</p>
                {entry.updatedAt && (
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    {new Date(entry.updatedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
              {entry.note && (
                <p className="mt-2 text-sm leading-7 text-gray-600">{entry.note}</p>
              )}
              {entry.updatedByName && (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
                  Updated by {entry.updatedByName}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OrderTimeline;
