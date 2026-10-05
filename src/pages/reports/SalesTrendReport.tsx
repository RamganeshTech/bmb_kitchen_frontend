import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useGetSalesReport } from '../../api_service/report_api/reportApi';
import { useReportFilters } from './ReportFilterContext';
import { ReportSectionCard } from './ReportParts';
import { formatCompactNumber, formatInr, formatShortDate } from './reportUtils';

/**
 * Bar chart of sales per day for the selected filters. Responsive: the chart
 * resizes to its container, so it works from phones to wide screens.
 *
 * API: GET /report/v1/:organizationId/sales (useGetSalesReport), the `dailyTrend` field.
 * Shares one network request with SalesSummaryReport and SalesOrderTypeReport.
 * Takes no props. Reads the shared filters from ReportFilterProvider.
 */
export const SalesTrendReport = () => {
  const { filters } = useReportFilters();
  const { data, isLoading, isFetching, error, refetch } = useGetSalesReport(filters);

  const chartData = (data?.dailyTrend ?? []).map((trendItem) => ({
    dateLabel: formatShortDate(trendItem.date),
    sales: trendItem.sales,
    bills: trendItem.bills,
  }));

  return (
    <ReportSectionCard
      title="Sales trend"
      description="Sales collected per day"
      queryState={{ isLoading, isFetching, error, refetch }}
      isEmpty={chartData.length === 0}
      emptyMessage="No sales in this period."
    >
      <div className="h-72 w-full" role="img" aria-label="Bar chart of daily sales">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} stroke="var(--color-muted)" fontSize={12} />
            <YAxis
              width={48}
              tickLine={false}
              axisLine={false}
              stroke="var(--color-muted)"
              fontSize={12}
              tickFormatter={(value: number) => formatCompactNumber(value)}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-hover)' }}
              contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}
              formatter={(value) => [formatInr(Number(value)), 'Sales']}
            />
            <Bar dataKey="sales" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ReportSectionCard>
  );
};
