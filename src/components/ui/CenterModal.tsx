// components/ui/CenterModal.tsx
import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface CenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Override width, e.g. "max-w-xl", "max-w-2xl", "max-w-4xl" */
  maxWidth?: string;
  /** Extra header actions (e.g., Save button, step indicator) */
  actions?: ReactNode;
}

export const CenterModal: React.FC<CenterModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-3xl',
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

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap within the dialog
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
          'fixed inset-0 bg-heading/40 backdrop-blur-sm z-[9990] transition-opacity duration-300',
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        )}
      />

      {/* Center Modal Container */}
      <div
        className={cn(
          'fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden pointer-events-none transition-[visibility] duration-300',
          isOpen ? 'visible' : 'invisible'
        )}
      >
        {/* Modal Dialog Card */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="center-modal-title"
          onKeyDown={handleTabTrap}
          className={cn(
            'pointer-events-auto w-full bg-surface rounded-2xl border border-border shadow-2xl flex flex-col',
            'max-h-[90vh] overflow-hidden',
            'transform transition-all duration-300 ease-out',
            maxWidth,
            isOpen
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-3'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-border shrink-0 bg-surface">
            <h2 id="center-modal-title" className="text-lg sm:text-xl font-semibold text-heading truncate">
              {title}
            </h2>

            <div className="flex items-center gap-3 shrink-0">
              {actions && <div className="flex items-center">{actions}</div>}

              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-body transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 outline-none"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};