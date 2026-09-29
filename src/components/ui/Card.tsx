// components/ui/Card.tsx
import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => (
  <div
    className={cn(
      'bg-surface border border-border rounded-xl shadow-sm overflow-visible',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  /** Heading level for correct document outline — default h3 since Card usually sits inside a page that already has h1/h2 */
  as?: ElementType;
  /** Connects this header's title to the Card's region for screen readers via aria-labelledby on the parent if needed */
  id?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
  as: HeadingTag = 'h3',
  id,
}) => (
  <div
    className={cn(
      'px-4 sm:px-6 py-4 border-b border-border flex justify-between items-start gap-4',
      className
    )}
  >
    <div className="min-w-0">
      <HeadingTag id={id} className="text-base font-semibold text-heading truncate">
        {title}
      </HeadingTag>
      {subtitle && (
        <p className="text-sm text-muted mt-0.5">{subtitle}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => (
  <div className={cn('p-4 sm:p-6', className)}>{children}</div>
);