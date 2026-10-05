import { useState } from 'react';
import { ChevronLeft, ChevronRight, Landmark, Receipt } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import { useGetGstSummaryReport } from '../../api_service/report_api/reportApi';
import { useReportFilters } from './ReportFilterContext';
import { ReportSectionCard, ReportStatCard } from './ReportParts';
import { formatDateTime, formatInr } from './reportUtils';

const GST_PAGE_SIZE = 25;

/**
 * GST report for the selected filters: taxable value, CGST, SGST and total GST, followed by a
 * paginated bill-by-bill table. The table scrolls sideways on small screens.
 *
 * Pagination belongs to this component. It goes back to page 1 whenever the shared filters change.
 *
 * API: GET /report/v1/:organizationId/gst-summary (useGetGstSummaryReport)
 * Takes no props. Reads the shared filters from ReportFilterProvider.
 */
export const GstSummaryReport = () => {
  const { filters } = useReportFilters();

  // The page is stored together with the filters it was chosen for, so changing filters resets it to 1.
  const filterKey = JSON.stringify(filters);
  const [pagination, setPagination] = useState({ filterKey, page: 1 });
  const currentPage = pagination.filterKey === filterKey ? pagination.page : 1;
  const goToPage = (page: number) => setPagination({ filterKey, page });

  const { data, isLoading, isFetching, error, refetch } = useGetGstSummaryReport({ ...filters, page: currentPage, limit: GST_PAGE_SIZE });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const firstRowNumber = data ? (data.page - 1) * data.limit : 0;

  return (
    <ReportSectionCard
      title="GST summary"
      description="Tax collected on paid bills"
      queryState={{ isLoading, isFetching, error, refetch }}
      isEmpty={!!data && data.total === 0}
      emptyMessage="No paid bills in this period."
    >
      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStatCard icon={<Receipt size={20} />} label="Taxable value" value={formatInr(data.taxableValue)} />
            <ReportStatCard icon={<Landmark size={20} />} label="CGST" value={formatInr(data.cgst)} />
            <ReportStatCard icon={<Landmark size={20} />} label="SGST" value={formatInr(data.sgst)} />
            <ReportStatCard
              icon={<Landmark size={20} />}
              label="Total GST"
              value={formatInr(data.totalGST)}
              hint={data.gstRatePercent !== null ? `Current default rate ${data.gstRatePercent}%` : undefined}
            />
          </div>

          <div className="flex flex-col gap-3">
            <TableContainer className="min-h-[300px]" ariaLabel="GST bills" caption="Paid bills with their GST breakdown">
              <THead>
                <Tr>
                  <Th className="w-16">S.No</Th>
                  <Th>Bill</Th>
                  <Th>Paid at</Th>
                  <Th className="text-right">Sub total</Th>
                  <Th className="text-right">Discount</Th>
                  <Th className="text-right">Taxable value</Th>
                  <Th className="text-right">CGST</Th>
                  <Th className="text-right">SGST</Th>
                  <Th className="text-right">Grand total</Th>
                </Tr>
              </THead>
              <TBody>
                {data.bills.map((bill, rowIndex) => (
                  <Tr key={`${bill.orderNo}-${rowIndex}`}>
                    <Td>
                      <span className="text-muted">{firstRowNumber + rowIndex + 1}</span>
                    </Td>
                    <Td>
                      <div className="min-w-32">
                        <p className="font-semibold text-heading">{bill.billNo || bill.orderNo}</p>
                        {bill.billNo && <p className="text-sm text-muted">{bill.orderNo}</p>}
                      </div>
                    </Td>
                    <Td>{formatDateTime(bill.paidAt)}</Td>
                    <Td>
                      <div className="text-right">{formatInr(bill.subTotal)}</div>
                    </Td>
                    <Td>
                      <div className="text-right">{formatInr(bill.discountAmount)}</div>
                    </Td>
                    <Td>
                      <div className="text-right">{formatInr(bill.taxableValue)}</div>
                    </Td>
                    <Td>
                      <div className="text-right">{formatInr(bill.cgst)}</div>
                    </Td>
                    <Td>
                      <div className="text-right">{formatInr(bill.sgst)}</div>
                    </Td>
                    <Td>
                      <div className="text-right font-semibold text-heading">{formatInr(bill.grandTotal)}</div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableContainer>

            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted">
                Page {data.page} of {totalPages} · {data.total} {data.total === 1 ? 'bill' : 'bills'}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" leftIcon={<ChevronLeft size={14} />} disabled={data.page <= 1} onClick={() => goToPage(data.page - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" rightIcon={<ChevronRight size={14} />} disabled={data.page >= totalPages} onClick={() => goToPage(data.page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportSectionCard>
  );
};
