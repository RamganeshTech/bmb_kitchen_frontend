// components/ui/Input.tsx
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Label } from './Label';
import { cn } from '../../lib/cn';

type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: InputSize;
  fullWidth?: boolean;
  containerClassName?: string;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-10 text-sm px-3',   // 40px — still meets comfortable touch target
  md: 'h-11 text-sm px-3.5', // 44px — WCAG-recommended minimum touch target
  lg: 'h-12 text-base px-4', // 48px
};

const iconSizeBySize: Record<InputSize, number> = {
  sm: 16,
  md: 18,
  lg: 20,
};

const iconPaddingLeft: Record<InputSize, string> = {
  sm: 'pl-9',
  md: 'pl-10',
  lg: 'pl-11',
};

const iconPaddingRight: Record<InputSize, string> = {
  sm: 'pr-9',
  md: 'pr-10',
  lg: 'pr-11',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      required,
      optional,
      error,
      helperText,
      leftIcon,
      rightIcon,
      size = 'md',
      fullWidth = true,
      containerClassName,
      className,
      id,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === 'password';
    const resolvedType = isPasswordType && showPassword ? 'text' : type;

    // Auto password-toggle only if caller hasn't supplied their own rightIcon
    const effectiveRightIcon =
      rightIcon ??
      (isPasswordType ? (
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="pointer-events-auto text-muted hover:text-body transition-colors"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={0}
        >
          {showPassword ? (
            <EyeOff size={iconSizeBySize[size]} aria-hidden="true" />
          ) : (
            <Eye size={iconSizeBySize[size]} aria-hidden="true" />
          )}
        </button>
      ) : null);

    const describedBy =
      [error ? errorId : null, !error && helperText ? helperId : null]
        .filter(Boolean)
        .join(' ') || undefined;

    return (
      <div className={cn(fullWidth ? 'w-full' : 'inline-block', containerClassName)}>
        {label && (
          <Label htmlFor={inputId} required={required} optional={optional} size={size === 'lg' ? 'md' : 'sm'}>
            {label}
          </Label>
        )}

        <div className="relative">
          {leftIcon && (
            <span
              className="absolute left-0 inset-y-0 flex items-center pl-3 text-muted pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            disabled={disabled}
            required={required}
            aria-required={required || undefined}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              'w-full rounded-lg border bg-surface text-heading placeholder:text-muted',
              'transition-colors outline-none',
              'focus:ring-2 focus:ring-offset-0',
              sizeStyles[size],
              Boolean(leftIcon) && iconPaddingLeft[size],
              Boolean(effectiveRightIcon) && iconPaddingRight[size],
              error
                ? 'border-danger focus:border-danger focus:ring-danger/20'
                : 'border-border focus:border-primary focus:ring-primary/20',
              disabled && 'opacity-50 cursor-not-allowed bg-surface-hover',
              className
            )}
            {...props}
          />

          {effectiveRightIcon && (
            <span
              className="absolute right-0 inset-y-0 flex items-center pr-3 text-muted"
              aria-hidden={rightIcon ? 'true' : undefined}
            >
              {effectiveRightIcon}
            </span>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="mt-1.5 text-sm text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';