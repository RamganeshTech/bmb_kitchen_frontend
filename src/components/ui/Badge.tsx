// components/ui/Badge.tsx
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'accent';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-hover text-body border-border',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  accent: 'bg-primary-soft/10 text-primary border-accent/20',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
};

export function Badge({
  variant = 'default',
  size = 'md',
  icon,
  children,
  className,
  role,
  ...props
}: BadgeProps) {
  return (
    <span
      role={role ?? 'status'}
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}