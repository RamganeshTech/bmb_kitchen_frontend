// components/ui/Label.tsx
import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
  size?: 'sm' | 'md';
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, optional, size = 'md', ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block font-medium text-heading mb-1.5',
          size === 'sm' ? 'text-sm' : 'text-base',
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-danger ml-0.5" aria-hidden="true">
            *
          </span>
        )}
        {optional && (
          <span className="text-muted font-normal ml-1.5 text-xs">
            (optional)
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = 'Label';