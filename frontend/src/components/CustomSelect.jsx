import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const isSelectableOption = (option) => option && !option.disabled;

const CustomSelect = ({
  id,
  value,
  onChange,
  options = [],
  ariaLabel,
  disabled = false,
  placeholder = 'Select an option',
  className = '',
  buttonClassName = '',
  listClassName = '',
  leftIcon = null,
}) => {
  const generatedId = useId();
  const selectId = id || `custom-select-${generatedId}`;
  const listboxId = `${selectId}-listbox`;

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedIndex = useMemo(
    () => options.findIndex((option) => String(option.value) === String(value)),
    [options, value]
  );

  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const selectedLabel = selectedOption?.label || placeholder;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onClickOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (activeIndex >= 0 && optionRefs.current[activeIndex]) {
      optionRefs.current[activeIndex].scrollIntoView({
        block: 'nearest',
      });
    }
  }, [activeIndex, isOpen]);

  const openListbox = () => {
    if (disabled) {
      return;
    }

    const fallbackIndex = options.findIndex(isSelectableOption);
    const nextIndex = selectedIndex >= 0 ? selectedIndex : fallbackIndex;
    setActiveIndex(nextIndex);
    setIsOpen(true);
  };

  const closeListbox = () => setIsOpen(false);

  const moveActiveIndex = (direction) => {
    if (!options.length) {
      return;
    }

    let nextIndex = activeIndex;
    const guardCount = options.length * 2;
    let iterations = 0;

    while (iterations < guardCount) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (isSelectableOption(options[nextIndex])) {
        setActiveIndex(nextIndex);
        return;
      }
      iterations += 1;
    }
  };

  const selectByIndex = (index) => {
    const option = options[index];
    if (!option || option.disabled) {
      return;
    }

    onChange?.(option.value);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const onButtonKeyDown = (event) => {
    if (disabled) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          openListbox();
        } else {
          moveActiveIndex(event.key === 'ArrowDown' ? 1 : -1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen) {
          if (activeIndex >= 0) {
            selectByIndex(activeIndex);
          }
        } else {
          openListbox();
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          closeListbox();
        }
        break;
      default:
        break;
    }
  };

  const onListboxKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActiveIndex(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActiveIndex(-1);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(options.findIndex(isSelectableOption));
        break;
      case 'End': {
        event.preventDefault();
        const reversedIndex = [...options].reverse().findIndex(isSelectableOption);
        if (reversedIndex >= 0) {
          setActiveIndex(options.length - 1 - reversedIndex);
        }
        break;
      }
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0) {
          selectByIndex(activeIndex);
        }
        break;
      case 'Escape':
        event.preventDefault();
        closeListbox();
        buttonRef.current?.focus();
        break;
      case 'Tab':
        closeListbox();
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        id={selectId}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className={`group w-full rounded-xl border border-[#ccd6e4] bg-[#f7f9fc] py-3 text-left text-sm text-brand-dark shadow-[0_8px_20px_rgba(11,31,58,0.05)] transition-all hover:border-brand-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50 disabled:cursor-not-allowed disabled:opacity-60 ${leftIcon ? 'pl-11 pr-10' : 'px-4 pr-10'} ${buttonClassName}`}
        onClick={() => (isOpen ? closeListbox() : openListbox())}
        onKeyDown={onButtonKeyDown}
      >
        {leftIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[#93a5bf]">
            {leftIcon}
          </span>
        ) : null}
        <span className={`${!selectedOption ? 'text-gray-400' : ''}`}>{selectedLabel}</span>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#c9a227]">
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {isOpen ? (
        <ul
          role="listbox"
          id={listboxId}
          aria-labelledby={selectId}
          tabIndex={-1}
          className={`absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-[#d7dfeb] bg-[#fafbfd] py-1.5 shadow-[0_22px_40px_rgba(11,31,58,0.16)] ${listClassName}`}
          onKeyDown={onListboxKeyDown}
        >
          {options.map((option, index) => {
            const isSelected = String(option.value) === String(value);
            const isActive = index === activeIndex;

            return (
              <li
                key={`${option.value}-${index}`}
                id={`${listboxId}-option-${index}`}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                role="option"
                aria-selected={isSelected}
                className={`mx-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  option.disabled
                    ? 'cursor-not-allowed text-gray-300'
                    : isActive
                      ? 'bg-[#e8edf5] text-brand-dark'
                      : isSelected
                        ? 'bg-[#f1f4fa] text-brand-dark'
                        : 'text-[#1c3a61] hover:bg-[#edf1f8]'
                }`}
                onMouseEnter={() => {
                  if (!option.disabled) {
                    setActiveIndex(index);
                  }
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectByIndex(index)}
              >
                <span>{option.label}</span>
                {isSelected ? <Check size={15} className="text-brand-accent" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export default CustomSelect;
