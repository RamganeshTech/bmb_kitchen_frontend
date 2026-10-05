import { useState } from 'react';

import { Button } from '../../components/ui/Button';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import { useGetItemSalesReport } from '../../api_service/report_api/reportApi';
import { useReportFilters } from './ReportFilterContext';
import { ReportSectionCard } from './ReportParts';
import { formatCount, formatInr } from './reportUtils';

const COLLAPSED_ROW_COUNT = 10;

/**
 * Ranked table of menu items by revenue, with quantity sold and a bar showing each item's
 * revenue relative to the best seller. Shows the top 10 and lets the user expand to all items.
 * The table scrolls sideways on small screens.
 *
 * API: GET /report/v1/:organizationId/items (useGetItemSalesReport)
 * Takes no props. Reads the shared filters from ReportFilterProvider.
 */
export const ItemSalesReport = () => {
  const { filters } = useReportFilters();
  const { data, isLoading, isFetching, error, refetch } = useGetItemSalesReport(filters);
  const [isShowingAllItems, setIsShowingAllItems] = useState(false);

  const allItems = data?.items ?? [];
  const visibleItems = isShowingAllItems ? allItems : allItems.slice(0, COLLAPSED_ROW_COUNT);
  const hasHiddenItems = allItems.length > COLLAPSED_ROW_COUNT;

  return (
    <ReportSectionCard
      title="Item-wise sales"
      description="Menu items ranked by revenue"
      queryState={{ isLoading, isFetching, error, refetch }}
      isEmpty={allItems.length === 0}
      emptyMessage="No items sold in this period."
    >
      <div className="flex flex-col gap-3">
        <TableContainer className="min-h-[300px]" ariaLabel="Item-wise sales" caption="Menu items ranked by revenue">
          <THead>
            <Tr>
              <Th className="w-16">S.No</Th>
              <Th>Item</Th>
              <Th className="text-right">Qty sold</Th>
              <Th className="text-right">Revenue</Th>
              <Th>Compared to top item</Th>
            </Tr>
          </THead>
          <TBody>
            {visibleItems.map((item, rowIndex) => (
              <Tr key={item.menuItemId}>
                <Td>
                  <span className="text-muted">{rowIndex + 1}</span>
                </Td>
                <Td>
                  <span className="min-w-40 font-semibold text-heading">{item.name}</span>
                </Td>
                <Td>
                  <div className="text-right text-heading">{formatCount(item.qtySold)}</div>
                </Td>
                <Td>
                  <div className="text-right font-semibold text-heading">{formatInr(item.revenue)}</div>
                </Td>
                <Td>
                  <div
                    className="h-2 w-32 overflow-hidden rounded-full bg-border"
                    role="img"
                    aria-label={`${item.name} is ${item.sharePercent.toFixed(0)} percent of the top item`}
                  >
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(item.sharePercent, 100)}%` }} />
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </TableContainer>

        {hasHiddenItems && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted">
              Showing {visibleItems.length} of {allItems.length} items
            </p>
            <Button variant="outline" onClick={() => setIsShowingAllItems((isShowingAll) => !isShowingAll)}>
              {isShowingAllItems ? 'Show top 10' : 'Show all items'}
            </Button>
          </div>
        )}
      </div>
    </ReportSectionCard>
  );
};
