// components/ui/InfoTooltip.tsx
import {
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/cn';

type Position = 'auto' | 'top' | 'bottom' | 'left' | 'right';

interface InfoTooltipProps {
  description: string;
  position?: Position;
  icon?: ReactNode;
  title?: string;
  iconSize?: number;
  className?: string;
  popupClassName?: string;
}

const GAP = 10;
const EDGE_PADDING = 12;

export default function InfoTooltip({
  description,
  position = 'auto',
  icon,
  title,
  iconSize = 20,
  className,
  popupClassName,
}: InfoTooltipProps) {
  // hovering -> shown while mouse is over icon/popup (auto-hides on mouse leave)
  // pinned   -> shown after a click, stays open until outside click / Esc
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovering || pinned;

  const [resolvedPosition, setResolvedPosition] = useState<Exclude<Position, 'auto'>>(
    position === 'auto' ? 'top' : position
  );
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 260 });

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const computePosition = useCallback(() => {
    const iconEl = iconRef.current;
    if (!iconEl) return;

    const iconRect = iconEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const popupWidth = Math.min(280, vw - EDGE_PADDING * 2);
    const popupHeight = popupRef.current?.offsetHeight || 90;

    const space = {
      top: iconRect.top,
      bottom: vh - iconRect.bottom,
      left: iconRect.left,
      right: vw - iconRect.right,
    };

    let side: Exclude<Position, 'auto'> = position === 'auto' ? 'top' : position;

    if (position === 'auto') {
      const fits = {
        top: space.top >= popupHeight + GAP,
        bottom: space.bottom >= popupHeight + GAP,
        left: space.left >= popupWidth + GAP,
        right: space.right >= popupWidth + GAP,
      };
      if (fits.bottom) side = 'bottom';
      else if (fits.top) side = 'top';
      else if (fits.right) side = 'right';
      else if (fits.left) side = 'left';
      else {
        side = (Object.keys(space) as (keyof typeof space)[]).reduce((a, b) =>
          space[a] > space[b] ? a : b
        ) as Exclude<Position, 'auto'>;
      }
    }

    let top = 0;
    let left = 0;

    if (side === 'top') {
      top = iconRect.top - popupHeight - GAP;
      left = iconRect.left + iconRect.width / 2 - popupWidth / 2;
    } else if (side === 'bottom') {
      top = iconRect.bottom + GAP;
      left = iconRect.left + iconRect.width / 2 - popupWidth / 2;
    } else if (side === 'left') {
      top = iconRect.top + iconRect.height / 2 - popupHeight / 2;
      left = iconRect.left - popupWidth - GAP;
    } else if (side === 'right') {
      top = iconRect.top + iconRect.height / 2 - popupHeight / 2;
      left = iconRect.right + GAP;
    }

    left = Math.max(EDGE_PADDING, Math.min(left, vw - popupWidth - EDGE_PADDING));
    top = Math.max(EDGE_PADDING, Math.min(top, vh - popupHeight - EDGE_PADDING));

    setResolvedPosition(side);
    setCoords({ top, left, width: popupWidth });
  }, [position]);

  useLayoutEffect(() => {
    if (open) computePosition();
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;

    const handleReposition = () => computePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setPinned(false);
        setHovering(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinned(false);
        setHovering(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, computePosition]);

  const arrowStyles: Record<Exclude<Position, 'auto'>, string> = {
    top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-bg-surface border-l-transparent border-r-transparent border-b-transparent',
    bottom:
      'top-[-6px] left-1/2 -translate-x-1/2 border-b-bg-surface border-l-transparent border-r-transparent border-t-transparent',
    left: 'right-[-6px] top-1/2 -translate-y-1/2 border-l-bg-surface border-t-transparent border-b-transparent border-r-transparent',
    right:
      'left-[-6px] top-1/2 -translate-y-1/2 border-r-bg-surface border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <span
      className={cn('relative inline-flex', className)}
      ref={wrapperRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        ref={iconRef}
        type="button"
        aria-label="More information"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setPinned((prev) => !prev);
        }}
        style={{ width: iconSize, height: iconSize }}
        className={cn(
          'cursor-pointer inline-flex items-center justify-center rounded-full shrink-0',
          'bg-surface text-muted border border-border',
          'hover:bg-surface-hover hover:border-text-muted hover:text-body',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1',
          'transition-colors'
        )}
      >
        {icon ?? <Info size={iconSize * 0.65} aria-hidden="true" />}
      </button>

      {open && (
        <div
          ref={popupRef}
          role="tooltip"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 9999,
          }}
          className={cn(
            'rounded-lg bg-surface text-body text-sm shadow-xl border border-border px-3.5 py-3',
            'motion-safe:animate-in motion-safe:fade-in duration-150',
            popupClassName
          )}
        >
          <div className={cn('absolute w-0 h-0 border-[6px]', arrowStyles[resolvedPosition])} />
          {title && <p className="font-semibold mb-1 text-heading">{title}</p>}
          <p className="text-body leading-snug whitespace-pre-wrap">{description}</p>
        </div>
      )}
    </span>
  );
}

/*
USAGE:

<InfoTooltip description="Percentage discount applied on top of base fee structure." />

<InfoTooltip
  position="left"
  title="Admission No."
  description="Auto-generated per active book, resets only on new book creation."
/>

Behavior:
- Hover icon -> preview opens, closes automatically when mouse leaves (icon & popup)
- Click icon -> pins it open regardless of mouse position
- Click outside / Esc -> closes (both hover + pinned state cleared)
*/