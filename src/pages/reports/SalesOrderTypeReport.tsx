import { useGetSalesReport } from '../../api_service/report_api/reportApi';
import { useReportFilters } from './ReportFilterContext';
import { ReportBreakdownList, ReportSectionCard, type ReportBreakdownRow } from './ReportParts';
import { calculateSharePercent, formatOrderTypeLabel } from './reportUtils';

/**
 * Shows how sales are split across order types (dine-in, takeaway, delivery, online),
 * with each type's amount, bill count and share of total sales.
 *
 * API: GET /report/v1/:organizationId/sales (useGetSalesReport), the `orderTypeSplit` field.
 * Shares one network request with SalesSummaryReport and SalesTrendReport.
 * Takes no props. Reads the shared filters from ReportFilterProvider.
 */
export const SalesOrderTypeReport = () => {
  const { filters } = useReportFilters();
  const { data, isLoading, isFetching, error, refetch } = useGetSalesReport(filters);

  const orderTypeEntries = Object.entries(data?.orderTypeSplit ?? {}).sort(([, a], [, b]) => b.amount - a.amount);
  const totalSales = orderTypeEntries.reduce((sum, [, split]) => sum + split.amount, 0);

  const breakdownRows: ReportBreakdownRow[] = orderTypeEntries.map(([orderType, split]) => ({
    key: orderType,
    label: formatOrderTypeLabel(orderType),
    amount: split.amount,
    count: split.count,
    sharePercent: calculateSharePercent(split.amount, totalSales),
  }));

  return (
    <ReportSectionCard
      title="Sales by order type"
      description="Share of sales for each way customers ordered"
      queryState={{ isLoading, isFetching, error, refetch }}
      isEmpty={breakdownRows.length === 0}
      emptyMessage="No paid bills in this period."
    >
      <ReportBreakdownList rows={breakdownRows} countSingular="bill" countPlural="bills" />
    </ReportSectionCard>
  );
};
