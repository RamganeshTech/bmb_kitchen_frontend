// components/ui/Button.tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-text border border-transparent hover:bg-primary-hover focus-visible:ring-primary/30',
  secondary:
    'bg-surface-hover text-heading border border-border hover:bg-border/60 focus-visible:ring-primary/20',
  outline:
    'bg-transparent text-heading border border-border hover:bg-surface-hover focus-visible:ring-primary/20',
  ghost:
    'bg-transparent text-body border border-transparent hover:bg-surface-hover focus-visible:ring-primary/20',
  danger:
    'bg-danger text-primary-text border border-transparent hover:bg-danger/90 focus-visible:ring-danger/30',
  // white:
  //   'bg-white text-primary-text border border-transparent hover:bg-surface-hover focus-visible:ring-danger/30',

};

const sizeStyles: Record<ButtonSize, string> = {
  icon: 'h-8 text-base px-2 gap-1 rounded-sm',
  sm: 'h-9 text-sm px-3 gap-1.5 rounded-md',
  md: 'h-10 text-sm px-4 gap-2 rounded-md',
  lg: 'h-11 text-base px-5 gap-2 rounded-lg',
};

const spinnerSize: Record<ButtonSize, number> = {
  icon: 12,
  sm: 14,
  md: 16,
  lg: 18,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center font-medium whitespace-nowrap select-none',
          'transition-colors outline-none',
          'focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          fullWidth && 'w-full',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2
              size={spinnerSize[size]}
              className="animate-spin shrink-0"
              aria-hidden="true"
            />
            <span>{loadingText ?? children}</span>
            <span className="sr-only" role="status">
              Loading
            </span>
          </>
        ) : (
          <>
            {leftIcon && (
              <span className="shrink-0" aria-hidden="true">
                {leftIcon}
              </span>
            )}
            <span>{children}</span>
            {rightIcon && (
              <span className="shrink-0" aria-hidden="true">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';