import { Wallet } from 'lucide-react';

import { useGetPaymentModeReport } from '../../api_service/report_api/reportApi';
import { useReportFilters } from './ReportFilterContext';
import { ReportBreakdownList, ReportSectionCard, ReportStatCard, type ReportBreakdownRow } from './ReportParts';
import { formatInr, formatPaymentModeLabel } from './reportUtils';

/**
 * Total collected for the selected filters and how it splits across payment modes
 * (cash, UPI, card, split), with each mode's amount, bill count and share.
 *
 * API: GET /report/v1/:organizationId/payments-summary (useGetPaymentModeReport), the `byMode` field.
 * Takes no props. Reads the shared filters from ReportFilterProvider.
 */
export const PaymentModeReport = () => {
  const { filters } = useReportFilters();
  const { data, isLoading, isFetching, error, refetch } = useGetPaymentModeReport(filters);

  const breakdownRows: ReportBreakdownRow[] = (data?.byMode ?? []).map((modeSummary) => ({
    key: modeSummary.mode,
    label: formatPaymentModeLabel(modeSummary.mode),
    amount: modeSummary.amount,
    count: modeSummary.count,
    sharePercent: modeSummary.sharePercent,
  }));

  return (
    <ReportSectionCard
      title="Collection by payment mode"
      description="How customers paid"
      queryState={{ isLoading, isFetching, error, refetch }}
      isEmpty={breakdownRows.length === 0}
      emptyMessage="No payments collected in this period."
    >
      {data && (
        <div className="flex flex-col gap-5">
          <ReportStatCard icon={<Wallet size={20} />} label="Total collected" value={formatInr(data.totalCollected)} hint="For the selected filters" />
          <ReportBreakdownList rows={breakdownRows} countSingular="bill" countPlural="bills" />
        </div>
      )}
    </ReportSectionCard>
  );
};
