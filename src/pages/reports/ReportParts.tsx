import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatCount, formatInr } from './reportUtils';
import { useReportFilters } from './ReportFilterContext';

/* -------------------------------------------------------------------------- */
/*  Shared building blocks. Every report component is composed from these so  */
/*  loading, error, empty states and spacing behave the same everywhere.      */
/* -------------------------------------------------------------------------- */

/** The subset of a react-query result that ReportSectionCard needs. Pass the hook result straight in. */
export interface ReportQueryState {
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => unknown;
}

interface ReportSectionCardProps {
  title: string;
  description?: string;
  queryState: ReportQueryState;
  /** When true the empty message is shown instead of the children. */
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

/**
 * The card every report component renders inside. It draws the title and description and
 * decides what the body shows: a "pick a valid date range" message, a loading skeleton,
 * an error with a retry button, an empty message, or the report content itself.
 */
export const ReportSectionCard = ({ title, description, queryState, isEmpty = false, emptyMessage = 'No data for the selected filters.', children }: ReportSectionCardProps) => {
  const { isRangeReady } = useReportFilters();
  const { isLoading, isFetching, error, refetch } = queryState;

  let body: ReactNode;
  if (!isRangeReady) {
    body = <ReportMessage>Pick a valid start and end date to see this report.</ReportMessage>;
  } else if (isLoading) {
    body = <div className="h-40 animate-pulse rounded-xl bg-surface-hover" aria-busy="true" />;
  } else if (error) {
    body = (
      <ReportMessage>
        <AlertCircle size={24} className="text-danger" />
        <p>{error.message}</p>
        <Button variant="outline" leftIcon={<RefreshCw size={16} />} isLoading={isFetching} onClick={() => refetch()}>
          Try again
        </Button>
      </ReportMessage>
    );
  } else if (isEmpty) {
    body = <ReportMessage>{emptyMessage}</ReportMessage>;
  } else {
    body = children;
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-heading">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
        {isRangeReady && isFetching && !isLoading && <span className="shrink-0 text-sm text-muted">Updating…</span>}
      </div>
      {body}
    </Card>
  );
};

/** Centered message block used inside a report card for range, error and empty states. */
export const ReportMessage = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 px-4 text-center text-muted">{children}</div>
);

/** A single headline number with an icon, label and optional hint. Used in report stat grids. */
export const ReportStatCard = ({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) => (
  <div className="flex items-start gap-3 rounded-xl border border-border p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</span>
    <div className="min-w-0">
      <p className="text-sm text-muted">{label}</p>
      <p className="truncate text-xl font-semibold text-heading">{value}</p>
      {hint && <p className="truncate text-sm text-muted">{hint}</p>}
    </div>
  </div>
);

export interface ReportBreakdownRow {
  key: string;
  label: string;
  amount: number;
  count: number;
  sharePercent: number;
}

interface ReportBreakdownListProps {
  rows: ReportBreakdownRow[];
  countSingular: string;
  countPlural: string;
}

/**
 * A ranked list where each row shows a label, its amount, its count and its share of the total
 * as a progress bar. Used for order types, payment modes and expense groupings.
 */
export const ReportBreakdownList = ({ rows, countSingular, countPlural }: ReportBreakdownListProps) => (
  <ul className="flex flex-col gap-4">
    {rows.map((row) => (
      <li key={row.key} className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="font-medium text-heading">{row.label}</span>
          <span className="text-sm text-body">
            <span className="font-semibold text-heading">{formatInr(row.amount)}</span> · {formatCount(row.count)} {row.count === 1 ? countSingular : countPlural} ·{' '}
            {row.sharePercent.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border" role="img" aria-label={`${row.label} ${row.sharePercent.toFixed(0)} percent`}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(row.sharePercent, 100)}%` }} />
        </div>
      </li>
    ))}
  </ul>
);
