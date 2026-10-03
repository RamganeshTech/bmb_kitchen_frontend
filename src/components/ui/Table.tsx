// components/ui/Table.tsx
import type { HTMLAttributes, KeyboardEvent, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface TableContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Accessible label for the scrollable table region — required if there's no visible heading nearby */
  ariaLabel?: string;
  /** Visually hidden table caption for screen readers, e.g. "List of active construction projects" */
  caption?: string;
}

export const TableContainer: React.FC<TableContainerProps> = ({
  children,
  className,
  ariaLabel,
  caption,
  ...props
}) => (
  <div
    role="region"
    aria-label={ariaLabel}
    tabIndex={0}
    className={cn(
      'w-full overflow-x-auto rounded-xl border border-border bg-surface shadow-sm',
      'focus:outline-none focus:ring-2 focus:ring-primary/20',
      className
    )}
    {...props}
  >
    <table className="w-full text-left border-collapse whitespace-nowrap">
      {caption && <caption className="sr-only">{caption}</caption>}
      {children}
    </table>
  </div>
);

export const THead: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <thead
    className={cn(
      'bg-surface-muted text-muted text-xs uppercase tracking-wider font-medium border-b border-border',
      className
    )}
  >
    {children}
  </thead>
);

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  className?: string;
}

export const Th: React.FC<ThProps> = ({ children, className, scope = 'col', ...props }) => (
  <th scope={scope} className={cn('px-4 sm:px-6 py-3', className)} {...props}>
    {children}
  </th>
);

export const TBody: React.FC<{ children: ReactNode, className?:string }> = ({ children, className }) => (
  <tbody className={`${className} divide-y divide-border`}>{children}</tbody>
);

interface TrProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  /** Accessible label describing what activating this row does, e.g. "View project: Riverside Tower" */
  ariaLabel?: string;
}

export const Tr: React.FC<TrProps> = ({ children, className, onClick, ariaLabel }) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <tr
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? ariaLabel : undefined}
      className={cn(
        'transition-colors duration-150 outline-none',
        onClick && 'cursor-pointer hover:bg-surface-hover focus:bg-surface-hover focus:ring-2 focus:ring-inset focus:ring-primary/20',
        !onClick && 'hover:bg-surface-hover/50',
        className
      )}
    >
      {children}
    </tr>
  );
};

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  className?: string;
}

export const Td: React.FC<TdProps> = ({
  children,
  colSpan,
  className,
}) => (
  <td colSpan={colSpan} className={cn('px-4 sm:px-6 py-4 text-sm  text-body', className)}>
    {children}
  </td>
);