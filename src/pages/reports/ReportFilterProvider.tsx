import { useState, type ReactNode } from 'react';

import type { BaseReportFilters, ReportScope } from '../../api_service/report_api/reportApi';
import { ReportFilterContext } from './ReportFilterContext';
import { toEndOfDayIso, toStartOfDayIso } from './reportUtils';

// Used for API calls while a custom range is incomplete, so hooks never send an invalid "custom" request.
const FALLBACK_SCOPE: ReportScope = 'month';

interface ReportFilterProviderProps {
  children: ReactNode;
  initialScope?: ReportScope;
}

/**
 * Owns the filter state (date scope, custom dates, outlet) shared by all report components
 * rendered inside it. Wrap the report dashboard once:
 *
 *   <ReportFilterProvider>
 *     <ReportFilterBar />
 *     <SalesSummaryReport />
 *     ...
 *   </ReportFilterProvider>
 */
export const ReportFilterProvider = ({ children, initialScope = 'month' }: ReportFilterProviderProps) => {
  const [scope, setScope] = useState<ReportScope>(initialScope);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [outletId, setOutletId] = useState('');

  const isCustomScope = scope === 'custom';
  const isRangeReady = !isCustomScope || (!!fromDate && !!toDate && fromDate <= toDate);

  const dateFilters: Pick<BaseReportFilters, 'scope' | 'from' | 'to'> = !isCustomScope
    ? { scope }
    : isRangeReady
      ? { scope: 'custom', from: toStartOfDayIso(fromDate), to: toEndOfDayIso(toDate) }
      : { scope: FALLBACK_SCOPE };

  const filters: BaseReportFilters = {
    outletId: outletId || undefined,
    ...dateFilters,
  };

  return (
    <ReportFilterContext.Provider
      value={{ scope, fromDate, toDate, outletId, setScope, setFromDate, setToDate, setOutletId, isRangeReady, filters }}
    >
      {children}
    </ReportFilterContext.Provider>
  );
};
