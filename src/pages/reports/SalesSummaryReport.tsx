import { Ban, FileText, Landmark, Receipt, Tag, TrendingUp, Wallet } from 'lucide-react';

import { useGetSalesReport } from '../../api_service/report_api/reportApi';
import { useReportFilters } from './ReportFilterContext';
import { ReportSectionCard, ReportStatCard } from './ReportParts';
import { formatCount, formatInr } from './reportUtils';

/**
 * Headline sales numbers for the selected filters: gross sales, taxable value, GST, discounts,
 * paid bills, average bill and cancelled orders.
 *
 * API: GET /report/v1/:organizationId/sales (useGetSalesReport)
 * Takes no props. Reads the shared filters from ReportFilterProvider.
 */
export const SalesSummaryReport = () => {
  const { filters } = useReportFilters();
  const { data, isLoading, isFetching, error, refetch } = useGetSalesReport(filters);

  return (
    <ReportSectionCard title="Sales summary" description="Paid bills for the selected filters" queryState={{ isLoading, isFetching, error, refetch }}>
      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ReportStatCard icon={<Wallet size={20} />} label="Gross sales" value={formatInr(data.grossSales)} hint="Including tax" />
          <ReportStatCard icon={<Receipt size={20} />} label="Taxable value" value={formatInr(data.taxableValue)} hint="After discounts" />
          <ReportStatCard icon={<Landmark size={20} />} label="Total GST" value={formatInr(data.totalGST)} />
          <ReportStatCard icon={<Tag size={20} />} label="Discounts given" value={formatInr(data.totalDiscounts)} />
          <ReportStatCard icon={<FileText size={20} />} label="Paid bills" value={formatCount(data.totalBills)} />
          <ReportStatCard icon={<TrendingUp size={20} />} label="Average bill" value={formatInr(data.avgBillValue)} hint="Per paid bill" />
          <ReportStatCard icon={<Ban size={20} />} label="Cancelled orders" value={formatCount(data.cancelledOrders)} />
        </div>
      )}
    </ReportSectionCard>
  );
};
