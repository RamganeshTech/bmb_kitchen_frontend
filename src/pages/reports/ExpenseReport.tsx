import { ListChecks, ReceiptText } from 'lucide-react';

import { useGetExpenseReport, type ExpenseGroupSummary } from '../../api_service/report_api/reportApi';
import { useReportFilters } from './ReportFilterContext';
import { ReportBreakdownList, ReportSectionCard, ReportStatCard, type ReportBreakdownRow } from './ReportParts';
import { calculateSharePercent, formatCount, formatInr } from './reportUtils';

const toBreakdownRows = (groups: ExpenseGroupSummary[], getGroupName: (group: ExpenseGroupSummary) => string | undefined, totalExpenses: number): ReportBreakdownRow[] =>
  groups.map((group) => {
    const groupName = getGroupName(group) ?? 'Uncategorised';
    return {
      key: groupName,
      label: groupName,
      amount: group.amount,
      count: group.count,
      sharePercent: calculateSharePercent(group.amount, totalExpenses),
    };
  });

/**
 * Expense overview for the selected filters: total spent, number of entries, and where the
 * money went by category and by payment mode.
 *
 * API: GET /report/v1/:organizationId/expenses (useGetExpenseReport)
 * Takes no props. Reads the shared filters from ReportFilterProvider.
 */
export const ExpenseReport = () => {
  const { filters } = useReportFilters();
  const { data, isLoading, isFetching, error, refetch } = useGetExpenseReport(filters);

  const totalExpenses = data?.totalExpenses ?? 0;
  const categoryRows = toBreakdownRows(data?.byCategory ?? [], (group) => group.category, totalExpenses);
  const paymentModeRows = toBreakdownRows(data?.byPaymentMode ?? [], (group) => group.mode, totalExpenses);

  return (
    <ReportSectionCard
      title="Expenses"
      description="Money spent for the selected filters"
      queryState={{ isLoading, isFetching, error, refetch }}
      isEmpty={!!data && data.totalEntries === 0}
      emptyMessage="No expenses recorded in this period."
    >
      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ReportStatCard icon={<ReceiptText size={20} />} label="Total expenses" value={formatInr(data.totalExpenses)} />
            <ReportStatCard icon={<ListChecks size={20} />} label="Expense entries" value={formatCount(data.totalEntries)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-heading">By category</h3>
              <ReportBreakdownList rows={categoryRows} countSingular="entry" countPlural="entries" />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-heading">By payment mode</h3>
              <ReportBreakdownList rows={paymentModeRows} countSingular="entry" countPlural="entries" />
            </div>
          </div>
        </div>
      )}
    </ReportSectionCard>
  );
};
