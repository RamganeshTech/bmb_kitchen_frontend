// components/ui/SearchSelect.tsx
import {
  useState,useRef,useEffect,useId,useMemo,type KeyboardEvent,
} from 'react';
import { ChevronDown, X, Check, Search } from 'lucide-react';
import { Label } from './Label';
import { cn } from '../../lib/cn';

export interface SelectOption {
  label: string;
  value: string | number;
}

interface SearchSelectProps {
  options: SelectOption[];
  value?: string | number | null;
  onChange: (value: SelectOption) => void;
  /** Called on Enter when no filtered option matches the typed text — useful for "create new" flows */
  onEnter?: (searchValue: string) => void;
  /** Called when the clear (x) button is clicked. Required if isClearable is true. */
  onClear?: () => void;
  placeholder?: string;
  isClearable?: boolean;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  emptyMessage?: string;
}

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-10 text-sm px-3',
  md: 'h-11 text-sm px-3.5',
  lg: 'h-12 text-base px-4',
};

export const SearchSelect: React.FC<SearchSelectProps> = ({
  options,
  value,
  onChange,
  onEnter,
  onClear,
  placeholder = 'Search...',
  label,
  isClearable = true,
  required,
  error,
  disabled,
  size = 'md',
  emptyMessage = 'No results found',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const inputId = useId();
  const listboxId = `${inputId}-listbox`;

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  // Reset highlight whenever the filtered list changes
  //   useEffect(() => {
  //     setHighlightedIndex(0);
  //   }, [searchTerm, isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep the highlighted option scrolled into view
  useEffect(() => {
    if (!isOpen) return;
    const activeEl = listRef.current?.children[highlightedIndex] as HTMLElement | undefined;
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const openDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      setIsOpen(true);
      setHighlightedIndex(0); // <-- Added here
    }
    // setIsOpen(true);
  };

  const selectOption = (option: SelectOption) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      openDropdown();
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex]);
        } else {
          onEnter?.(searchTerm);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const displayValue = isOpen ? searchTerm : selectedOption?.label ?? '';
  const showClear = isClearable && !!selectedOption && !disabled;

  return (
    <div ref={containerRef} className="w-full relative">
      {label && (
        <Label htmlFor={inputId} required={required} size={size === 'lg' ? 'md' : 'sm'}>
          {label}
        </Label>
      )}

      <div className="relative">
        <span
          className="absolute left-0 inset-y-0 flex items-center pl-3 text-muted pointer-events-none"
          aria-hidden="true"
        >
          <Search size={size === 'sm' ? 16 : 18} />
        </span>

        <input
          ref={inputRef} id={inputId} type="text" role="combobox" aria-expanded={isOpen} aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && filteredOptions[highlightedIndex]
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          aria-required={required || undefined} aria-invalid={!!error} disabled={disabled} placeholder={placeholder}
          value={displayValue}  onFocus={openDropdown}  onClick={openDropdown}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setHighlightedIndex(0); // <-- Added here
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full rounded-lg border bg-surface text-heading placeholder:text-muted',
            'transition-colors outline-none pl-9',
            'focus:ring-2 focus:ring-offset-0',
            sizeStyles[size],
            showClear ? 'pr-16' : 'pr-9',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-border focus:border-primary focus:ring-primary/20',
            disabled && 'opacity-50 cursor-not-allowed bg-surface-hover'
          )}
          {...props}
        />

        <div className="absolute right-0 inset-y-0 flex items-center gap-1 pr-3">
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear selection"
              className="text-muted hover:text-body transition-colors p-0.5"
            >
              <X size={size === 'sm' ? 14 : 16} />
            </button>
          )}
          <ChevronDown
            size={size === 'sm' ? 14 : 16}
            className={cn(
              'text-muted transition-transform pointer-events-none',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}

      {isOpen && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className={cn(
            'absolute z-50 mt-1.5 w-full max-h-60 overflow-auto',
            'bg-surface border border-border rounded-lg shadow-lg py-1'
          )}
        >
          {filteredOptions.length === 0 && (
            <li className="px-3.5 py-2.5 text-sm text-muted select-none">
              {emptyMessage}
            </li>
          )}

          {filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={option.value}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectOption(option)}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 text-sm cursor-pointer select-none',
                  isHighlighted ? 'bg-surface-hover' : '',
                  isSelected ? 'text-primary font-medium' : 'text-body'
                )}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={16} aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};