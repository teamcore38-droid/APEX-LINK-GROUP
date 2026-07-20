import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

const CurrencySelector = ({ isMobile = false }) => {
  const { currency, setCurrency, selectedCurrencyObj, currencies } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (code) => {
    setCurrency(code);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${isMobile ? 'w-full' : ''}`}>
      {/* Custom Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select currency"
        className={`group inline-flex items-center justify-between rounded-xl border border-brand-accent/30 bg-[#1f0f0a]/80 px-3 py-1.5 text-xs font-semibold text-brand-accent shadow-sm backdrop-blur-md transition-all duration-300 hover:border-brand-accent hover:bg-[#2a140e] hover:shadow-[0_0_15px_rgba(217,154,50,0.2)] focus:outline-none focus:ring-2 focus:ring-brand-accent/50 ${
          isMobile ? 'w-full py-2.5 px-4 text-sm' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none sm:text-lg">{selectedCurrencyObj.flag}</span>
          <span className="font-bold tracking-wider">{selectedCurrencyObj.code}</span>
          <span className="text-white/60 font-normal">({selectedCurrencyObj.symbol})</span>
        </div>
        <ChevronDown
          size={15}
          className={`ml-2 text-brand-accent transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Custom Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 overflow-hidden rounded-2xl border border-brand-accent/40 bg-[#1c0d08]/95 p-1.5 text-[#fff7ee] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
            isMobile ? 'left-0 right-0 w-full' : 'right-0 w-60'
          }`}
          role="listbox"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent/80">
            <span className="flex items-center gap-1.5">
              <Globe size={12} className="text-brand-accent" /> Select Currency
            </span>
            <span className="text-[9px] font-normal text-white/40">Global Checkout</span>
          </div>

          <div className="mt-1 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
            {currencies.map((item) => {
              const isSelected = item.code === currency;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelect(item.code)}
                  role="option"
                  aria-selected={isSelected}
                  className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-200 ${
                    isSelected
                      ? 'border-l-2 border-brand-accent bg-gradient-to-r from-brand-accent/25 via-brand-accent/15 to-transparent text-brand-accent font-bold'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg leading-none shrink-0">{item.flag}</span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold tracking-wider">{item.code}</span>
                        <span className="text-xs text-brand-accent/70">({item.symbol})</span>
                      </div>
                      <span className="text-[10px] text-white/50 truncate">{item.name}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
