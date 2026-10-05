import type { ChangeEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect } from '../../components/ui/SearchSelect';
// TODO: confirm this path
import { useGetOutletList } from '../../api_service/outlet_api/outletApi';
import { useReportFilters } from './ReportFilterContext';
import { REPORT_SCOPE_OPTIONS } from './reportUtils';

interface OutletListEntry {
  id?: string;
  _id?: string;
  name: string;
}

// Outlet list shape is not guaranteed, so accept a bare array or a wrapped one
const toOutletEntries = (data: unknown): OutletListEntry[] => {
  if (Array.isArray(data)) return data as OutletListEntry[];
  const wrapped = data as { outlets?: OutletListEntry[]; items?: OutletListEntry[]; data?: OutletListEntry[] } | null;
  return wrapped?.outlets ?? wrapped?.items ?? wrapped?.data ?? [];
};

/**
 * The control panel of the report dashboard. Lets the user pick a date scope
 * (today / week / month / year / custom range) and an outlet.
 *
 * It does not fetch any report. It only writes to the shared filter state
 * (see ReportFilterProvider); every report component reacts to those changes on its own.
 * Place it once, above the report components.
 */
export const ReportFilterBar = () => {
  const { scope, fromDate, toDate, outletId, setScope, setFromDate, setToDate, setOutletId } = useReportFilters();
  const { data: outletListData } = useGetOutletList();

  const outletOptions = toOutletEntries(outletListData).map((outlet) => ({ label: outlet.name, value: outlet.id ?? outlet._id ?? '' }));
  const isCustomScope = scope === 'custom';

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Report date range">
        {REPORT_SCOPE_OPTIONS.map((scopeOption) => (
          <Button
            key={scopeOption.value}
            size="sm"
            className="shrink-0"
            variant={scope === scopeOption.value ? 'primary' : 'outline'}
            aria-pressed={scope === scopeOption.value}
            onClick={() => setScope(scopeOption.value)}
          >
            {scopeOption.label}
          </Button>
        ))}
      </div>

      {isCustomScope && (
        <div className="grid grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reportFromDate">From</Label>
            <Input
              id="reportFromDate"
              type="date"
              max={toDate || undefined}
              value={fromDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setFromDate(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reportToDate">To</Label>
            <Input
              id="reportToDate"
              type="date"
              min={fromDate || undefined}
              value={toDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setToDate(event.target.value)}
            />
          </div>
        </div>
      )}

      <div className="sm:max-w-sm">
        <SearchSelect
          label="Outlet"
          options={outletOptions}
          value={outletId}
          placeholder="All outlets"
          onChange={(option) => setOutletId(String(option.value))}
          onClear={() => setOutletId('')}
        />
      </div>
    </Card>
  );
};
