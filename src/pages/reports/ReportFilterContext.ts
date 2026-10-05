import { createContext, useContext } from 'react';

import type { BaseReportFilters, ReportScope } from '../../api_service/report_api/reportApi';

/**
 * Shared filter state for every report component (date scope, custom range, outlet).
 *
 * Report components never receive filters or data through props. Each one calls
 * `useReportFilters()` to read the same filters and passes them to its own API hook.
 * Because all components with the same filters share one react-query cache key,
 * several components using the same API trigger only one network request.
 */
export interface ReportFilterContextValue {
  scope: ReportScope;
  fromDate: string;
  toDate: string;
  outletId: string;
  setScope: (scope: ReportScope) => void;
  setFromDate: (fromDate: string) => void;
  setToDate: (toDate: string) => void;
  setOutletId: (outletId: string) => void;
  /** False while "Custom range" is selected but the dates are missing or in the wrong order. */
  isRangeReady: boolean;
  /** Filters in the exact shape the report API hooks expect. Always safe to pass to a hook. */
  filters: BaseReportFilters;
}

export const ReportFilterContext = createContext<ReportFilterContextValue | null>(null);

export const useReportFilters = (): ReportFilterContextValue => {
  const reportFilterContext = useContext(ReportFilterContext);
  if (!reportFilterContext) {
    throw new Error('useReportFilters must be used inside <ReportFilterProvider>');
  }
  return reportFilterContext;
};
