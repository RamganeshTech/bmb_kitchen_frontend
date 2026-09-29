// components/ui/Dropdown.tsx
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/cn';

export interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  isDanger?: boolean;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  triggerLabel?: string;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  triggerLabel = 'More actions',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const generatedId = useId();
  const menuId = `dropdown-menu-${generatedId}`;

  const openMenu = () => {
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const closeMenu = (returnFocus = true) => {
    setIsOpen(false);
    setActiveIndex(-1);
    if (returnFocus) triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu();
      setActiveIndex(0);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus active item
  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [isOpen, activeIndex]);

  const enabledIndices = items.reduce<number[]>((acc, item, i) => {
    if (!item.disabled) acc.push(i);
    return acc;
  }, []);

  const moveActive = (direction: 1 | -1) => {
    if (enabledIndices.length === 0) return;
    const currentPos = enabledIndices.indexOf(activeIndex);
    const nextPos =
      currentPos === -1
        ? direction === 1
          ? 0
          : enabledIndices.length - 1
        : (currentPos + direction + enabledIndices.length) % enabledIndices.length;
    setActiveIndex(enabledIndices[nextPos]);
  };

  const handleMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        closeMenu(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={typeof trigger === 'string' ? undefined : triggerLabel}
        onClick={(e) => {
          e.stopPropagation();
          isOpen ? closeMenu() : openMenu();
        }}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex items-center justify-center cursor-pointer outline-none rounded-md focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          role="menu"
          id={menuId}
          aria-orientation="vertical"
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'absolute z-50 mt-1 min-w-[120px] w-32 rounded-lg bg-surface border border-border p-1 shadow-md',
            'flex flex-col gap-0.5',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                closeMenu();
              }}
              className={cn(
                'w-full cursor-pointer text-left flex items-center px-2.5 py-1.5 text-xs font-medium rounded transition-colors group outline-none',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                item.isDanger
                  ? 'text-danger hover:bg-danger/10 focus:bg-danger/10'
                  : 'text-body hover:bg-surface-hover hover:text-heading focus:bg-surface-hover focus:text-heading'
              )}
            >
              {item.icon && (
                <span
                  className={cn(
                    'shrink-0 w-3.5 h-3.5 flex items-center justify-center mr-2',
                    item.isDanger ? 'text-danger/70' : 'text-muted group-hover:text-primary'
                  )}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};