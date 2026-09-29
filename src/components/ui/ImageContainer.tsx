// components/ui/ImageContainer.tsx
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ImageContainerProps {
  src: string;
  alt: string;
  /** Thumbnail size/shape classes, e.g. "w-20 h-20 rounded-lg object-cover" */
  className?: string;
}

export function ImageContainer({ src, alt, className }: ImageContainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const openPreview = () => {
    previouslyFocused.current = document.activeElement as HTMLElement;
    setIsLoading(true);
    setIsOpen(true);
  };

  const closePreview = () => {
    setIsOpen(false);
    previouslyFocused.current?.focus();
  };

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Lock body scroll while open + focus the close button
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = 'unset';
      clearTimeout(timer);
    };
  }, [isOpen]);

  const handleTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPreview();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        onKeyDown={handleTriggerKeyDown}
        aria-label={`View larger image: ${alt}`}
        className="outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-lg"
      >
        <img
          src={src}
          alt={alt}
          className={cn('object-cover cursor-zoom-in', className)}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={closePreview}
          className={cn(
            'fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8',
            'bg-text-heading/80 backdrop-blur-sm',
            'motion-safe:animate-in motion-safe:fade-in duration-150'
          )}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closePreview}
            aria-label="Close image preview"
            className={cn(
              'absolute top-4 right-4 sm:top-6 sm:right-6 z-10',
              'w-9 h-9 flex items-center justify-center rounded-full',
              'bg-white/10 text-primary-text hover:bg-white/20 transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-white/60'
            )}
          >
            <X size={20} aria-hidden="true" />
          </button>

          {isLoading && (
            <Loader2
              size={32}
              className="absolute animate-spin text-primary-text/70"
              aria-hidden="true"
            />
          )}

          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            onLoad={() => setIsLoading(false)}
            className={cn(
              'max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-200',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
          />
        </div>
      )}
    </>
  );
}