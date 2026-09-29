// components/ui/Toggle.tsx
import { forwardRef, useId } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/cn';

type ToggleSize = 'sm' | 'md';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: ToggleSize;
  id?: string;
}

const trackSize: Record<ToggleSize, string> = {
  sm: 'w-9 h-5',
  md: 'w-11 h-6',
};

const thumbSize: Record<ToggleSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4.5 h-4.5',
};

const thumbTranslate: Record<ToggleSize, string> = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
};

const iconSize: Record<ToggleSize, number> = {
  sm: 8,
  md: 10,
};

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, label, description, disabled, size = 'md', id }, ref) => {
    const generatedId = useId();
    const toggleId = id ?? generatedId;
    const descId = description ? `${toggleId}-description` : undefined;

    return (
      <div className="flex items-start gap-3">
        <button
          ref={ref}
          id={toggleId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-describedby={descId}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-200',
            'outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            trackSize[size],
            checked
              ? 'bg-primary border-primary'
              : 'bg-surface-hover border-border'
          )}
        >
          <span
            className={cn(
              'flex items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200',
              thumbSize[size],
              checked ? thumbTranslate[size] : 'translate-x-0.5'
            )}
          >
            {/* Icon inside the thumb — on/off state isn't conveyed by color alone */}
            {checked ? (
              <Check size={iconSize[size]} className="text-primary" strokeWidth={3} aria-hidden="true" />
            ) : (
              <X size={iconSize[size]} className="text-muted" strokeWidth={3} aria-hidden="true" />
            )}
          </span>
        </button>

        {(label || description) && (
          <div className="min-w-0">
            {label && (
              <label
                htmlFor={toggleId}
                onClick={() => !disabled && onChange(!checked)}
                className={cn(
                  'text-sm font-medium text-heading block',
                  disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p id={descId} className="text-sm text-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';