// components/ui/Breadcrumbs.tsx
import type { ReactNode } from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  collapseOnMobile?: boolean;
}

function Crumb({ item, isCurrent }: { item: BreadcrumbItem; isCurrent: boolean }) {
  const label = (
    <span className="flex items-center gap-1.5 min-w-0">
      {item.icon && <span aria-hidden="true">{item.icon}</span>}
      <span className="truncate">{item.label}</span>
    </span>
  );

  if (isCurrent) {
    return (
      <span aria-current="page" className="text-sm font-medium text-heading min-w-0">
        {label}
      </span>
    );
  }

  const linkClasses =
    'text-sm text-muted hover:text-primary transition-colors min-w-0 rounded px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';

  if (item.href) {
    return (
      <a href={item.href} className={linkClasses}>
        {label}
      </a>
    );
  }

  if (item.onClick) {
    return (
      <button type="button" onClick={item.onClick} className={linkClasses}>
        {label}
      </button>
    );
  }

  return <span className="text-sm text-muted min-w-0">{label}</span>;
}

function CrumbList({ items }: { items: BreadcrumbItem[] }) {
  return (
    <>
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;
        return (
          <li key={item.label} className="flex items-center min-w-0">
            <Crumb item={item} isCurrent={isCurrent} />
            {!isCurrent && (
              <ChevronRight size={14} className="mx-1.5 sm:mx-2 text-muted shrink-0" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </>
  );
}

export function Breadcrumbs({ items, className, collapseOnMobile = true }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  const isCollapsible = collapseOnMobile && items.length > 3;
  const first = items[0];
  const last = items[items.length - 1];

  return (
    <nav aria-label="Breadcrumb" className={cn('w-full', className)}>
      {/* Desktop / short paths: full list */}
      <ol className={cn('items-center flex-nowrap overflow-x-auto', isCollapsible ? 'hidden sm:flex' : 'flex')}>
        <CrumbList items={items} />
      </ol>

      {/* Mobile collapsed view: first + ... + last */}
      {isCollapsible && (
        <ol className="flex sm:hidden items-center flex-nowrap">
          <li className="flex items-center min-w-0">
            <Crumb item={first} isCurrent={false} />
            <ChevronRight size={14} className="mx-1.5 text-muted shrink-0" aria-hidden="true" />
          </li>
          <li className="flex items-center shrink-0" aria-hidden="true">
            <MoreHorizontal size={14} className="text-muted" />
            <ChevronRight size={14} className="mx-1.5 text-muted shrink-0" />
          </li>
          <li className="flex items-center min-w-0">
            <Crumb item={last} isCurrent={true} />
          </li>
        </ol>
      )}
    </nav>
  );
}