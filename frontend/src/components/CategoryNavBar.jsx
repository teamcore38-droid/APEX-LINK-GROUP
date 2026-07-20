import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, ChevronLeft, ChevronRight, Grid } from 'lucide-react';

const CategoryNavBar = () => {
  const [categories, setCategories] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const dropdownRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get('/api/categories');
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories for nav bar', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Close dropdown on outside click or route change
  useEffect(() => {
    setActiveDropdown(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Separate parent and child categories
  const parentCategories = categories.filter((c) => !c.parentCategory && c.isActive);

  const getChildrenForParent = (parentId) => {
    return categories.filter(
      (c) =>
        c.isActive &&
        (c.parentCategory?._id === parentId ||
          c.parentCategory === parentId ||
          (typeof c.parentCategory === 'object' && c.parentCategory?._id === parentId))
    );
  };

  const handleCategoryClick = (categoryName) => {
    setActiveDropdown(null);
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
  };

  // Scroll checking logic
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (container) container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [categories, loading]);

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === 'left' ? -240 : 240;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (loading || parentCategories.length === 0) {
    return null;
  }

  return (
    <div className="relative z-40 border-b border-white/10 bg-[#1c0d09] text-[#fff7ee] shadow-sm">
      <div className="container mx-auto relative px-2 sm:px-6" ref={dropdownRef}>
        
        {/* Soft Left Fade + Arrow */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center bg-gradient-to-r from-[#1c0d09] via-[#1c0d09]/85 to-transparent pl-2 pr-6 pointer-events-auto">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-accent/25 text-brand-accent shadow-md transition-all hover:bg-brand-accent hover:text-[#1c0d09]"
              aria-label="Scroll categories left"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}

        {/* Soft Right Fade + Arrow */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center bg-gradient-to-l from-[#1c0d09] via-[#1c0d09]/85 to-transparent pr-2 pl-6 pointer-events-auto">
            <button
              type="button"
              onClick={() => scroll('right')}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-accent/25 text-brand-accent shadow-md transition-all hover:bg-brand-accent hover:text-[#1c0d09]"
              aria-label="Scroll categories right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Scrollable Container (Scrollbar Hidden) */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-3 py-2.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Main All Categories badge */}
          <Link
            to="/categories"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-accent transition-colors hover:bg-brand-accent/25"
          >
            <Grid size={13} />
            <span>All Categories</span>
          </Link>

          {/* Category Navigation Items */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-5 shrink-0">
            {parentCategories.map((parent) => {
              const children = getChildrenForParent(parent._id);
              const hasChildren = children.length > 0;
              const isOpen = activeDropdown === parent._id;

              return (
                <div
                  key={parent._id}
                  className="relative shrink-0"
                  onMouseEnter={() => hasChildren && setActiveDropdown(parent._id)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (hasChildren && !isOpen) {
                        setActiveDropdown(parent._id);
                      } else {
                        handleCategoryClick(parent.name);
                      }
                    }}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${
                      isOpen
                        ? 'bg-brand-accent/20 text-brand-accent'
                        : 'text-[#fff7ee]/90 hover:bg-white/5 hover:text-brand-accent'
                    }`}
                  >
                    <span>{parent.name}</span>
                    {hasChildren && (
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 text-brand-accent ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>

                  {/* Mega Menu / Dropdown */}
                  {hasChildren && isOpen && (
                    <div className="absolute left-0 top-full mt-1 w-64 rounded-2xl border border-brand-accent/25 bg-[#25120c] p-3 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-50">
                      <div className="mb-2 border-b border-white/10 pb-2">
                        <button
                          type="button"
                          onClick={() => handleCategoryClick(parent.name)}
                          className="flex w-full items-center justify-between font-serif text-sm font-bold text-brand-accent hover:underline"
                        >
                          <span>All {parent.name}</span>
                          <span className="text-[10px] uppercase tracking-wider text-[#fff7ee]/60">Browse All →</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        {children.map((child) => (
                          <button
                            key={child._id}
                            type="button"
                            onClick={() => handleCategoryClick(child.name)}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-[#fff7ee]/90 transition-colors hover:bg-brand-accent/15 hover:text-brand-accent"
                          >
                            <span>{child.name}</span>
                            <span className="text-[10px] text-brand-accent/70">›</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CategoryNavBar;
