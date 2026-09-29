// components/ui/SideModal.tsx
import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface SideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Override width, e.g. "w-full sm:w-[450px] md:w-[500px]" */
  width?: string;
  /** Extra header actions (e.g. a Save button) — rendered left of the close button */
  actions?: ReactNode;
}

export const SideModal: React.FC<SideModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = 'w-full sm:w-[450px] md:w-[500px]',
  actions,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Track trigger element + move focus into the panel, restore on close
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      previouslyFocused.current?.focus();
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap within the panel
  const handleTabTrap = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusables = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 bg-text-heading/40 backdrop-blur-sm z-[9990] transition-opacity duration-300',
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-modal-title"
        onKeyDown={handleTabTrap}
        className={cn(
          'fixed top-0 right-0 h-full bg-surface shadow-2xl z-[9999] flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          'border-l border-border',
          width,
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border shrink-0">
          <h2 id="side-modal-title" className="text-lg font-semibold text-heading truncate">
            {title}
          </h2>

          <div className="flex items-center gap-3 shrink-0">
            {actions && <div className="flex items-center">{actions}</div>}

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-body transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 outline-none"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">{children}</div>
      </div>
    </>
  );
};