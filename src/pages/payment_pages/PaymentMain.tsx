import { useState, type ChangeEvent, type ReactNode } from 'react';
import { AlertCircle, Banknote, Eye, FileText, RefreshCw, TrendingUp, Wallet } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { SideModal } from '../../components/ui/SideModal';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import { useGetOutletList } from '../../api_service/outlet_api/outletApi';
import {
  useGetPaymentById,
  useInfiniteListPayments,  type InfinitePaymentListFilters,  type OrderType,  type PaymentListFilters,
  type PaymentMethod,  type PaymentOrderItem,  type PaymentReceipt,  type PaymentScope,
} from '../../api_service/payment_api/paymentApi';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 25;
const TABLE_COLUMN_COUNT = 9; // S.No, Bill, Paid at, Outlet, Customer, Order type, Method, Amount, Actions

type PaymentScopeSelection = PaymentScope | 'custom';

const SCOPE_OPTIONS: { value: PaymentScopeSelection; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

const PAYMENT_METHOD_OPTIONS = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI', value: 'upi' },
  { label: 'Card', value: 'card' },
  { label: 'Split', value: 'split' },
];

const ORDER_TYPE_OPTIONS = [
  { label: 'Dine-in', value: 'dine_in' },
  { label: 'Takeaway', value: 'takeaway' },
  { label: 'Delivery', value: 'delivery' },
  { label: 'Online', value: 'online' },
];

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
  online: 'Online',
};

interface PaymentMethodPresentation {
  label: string;
  badgeClass: string;
  barClass: string;
}

const PAYMENT_METHOD_PRESENTATION: Record<string, PaymentMethodPresentation> = {
  cash: { label: 'Cash', badgeClass: 'bg-success text-white', barClass: 'bg-success' },
  upi: { label: 'UPI', badgeClass: 'bg-primary text-white', barClass: 'bg-primary' },
  card: { label: 'Card', badgeClass: 'bg-info text-white', barClass: 'bg-info' },
  split: { label: 'Split', badgeClass: 'bg-warning text-white', barClass: 'bg-warning' },
};

const getPaymentMethodPresentation = (paymentMethod: string): PaymentMethodPresentation =>
  PAYMENT_METHOD_PRESENTATION[paymentMethod] ?? { label: paymentMethod, badgeClass: 'bg-muted text-white', barClass: 'bg-muted' };

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface OutletListEntry {
  id?: string;
  _id?: string;
  name: string;
}


/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const formatInr = (amount: number) => inrFormatter.format(amount);

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : dateTimeFormatter.format(date);
};

// The backend applies `to` as an exact timestamp, so send the end of the chosen day, not midnight.
const toStartOfDayIso = (dateInput: string) => new Date(`${dateInput}T00:00:00`).toISOString();
const toEndOfDayIso = (dateInput: string) => new Date(`${dateInput}T23:59:59.999`).toISOString();

// Outlet list shape is not guaranteed, so accept a bare array or a wrapped one
const toOutletEntries = (data: unknown): OutletListEntry[] => {
  if (Array.isArray(data)) return data as OutletListEntry[];
  const wrapped = data as { outlets?: OutletListEntry[]; items?: OutletListEntry[]; data?: OutletListEntry[] } | null;
  return wrapped?.outlets ?? wrapped?.items ?? wrapped?.data ?? [];
};

/* -------------------------------------------------------------------------- */
/*  Small presentational pieces                                               */
/* -------------------------------------------------------------------------- */

const PaymentMethodBadge = ({ paymentMethod }: { paymentMethod: string }) => {
  const presentation = getPaymentMethodPresentation(paymentMethod);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${presentation.badgeClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
      {presentation.label}
    </span>
  );
};

const SummaryCard = ({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) => (
  <Card className="flex items-start gap-3 p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</span>
    <div className="min-w-0">
      <p className="text-sm text-muted">{label}</p>
      <p className="truncate text-xl font-semibold text-heading">{value}</p>
      {hint && <p className="truncate text-sm text-muted">{hint}</p>}
    </div>
  </Card>
);

const TableMessageRow = ({ children }: { children: ReactNode }) => (
  <Tr>
    <Td colSpan={TABLE_COLUMN_COUNT}>
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 text-center text-muted">{children}</div>
    </Td>
  </Tr>
);

const DetailField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-sm text-muted">{label}</dt>
    <dd className="break-words font-medium text-heading">{children}</dd>
  </div>
);

const TotalsRow = ({ label, value, isEmphasised = false }: { label: string; value: string; isEmphasised?: boolean }) => (
  <div className={`flex items-center justify-between gap-3 ${isEmphasised ? 'border-t border-border pt-3' : ''}`}>
    <span className={isEmphasised ? 'font-semibold text-heading' : 'text-body'}>{label}</span>
    <span className={isEmphasised ? 'text-lg font-semibold text-heading' : 'font-medium text-heading'}>{value}</span>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Receipt modal (read only)                                                 */
/* -------------------------------------------------------------------------- */

const PaymentReceiptModal = ({ orderId, onClose }: { orderId: string; onClose: () => void }) => {
  const { data, isLoading, error, refetch, isFetching } = useGetPaymentById(orderId);
  const receipt = data as unknown as PaymentReceipt | undefined;

  let modalBody: ReactNode;
  if (isLoading) {
    modalBody = (
      <div className="space-y-4" aria-busy="true">
        <div className="h-24 animate-pulse rounded-xl bg-surface-hover" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-hover" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-hover" />
      </div>
    );
  } else if (error || !receipt) {
    modalBody = (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle size={28} className="text-danger" />
        <p className="text-muted">{error?.message ?? 'Could not load this receipt'}</p>
        <Button variant="outline" leftIcon={<RefreshCw size={16} />} isLoading={isFetching} onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    modalBody = (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3 rounded-xl bg-primary-soft p-5">
          <div className="min-w-0">
            <p className="text-sm text-muted">Bill {receipt.billNo || receipt.orderNo}</p>
            <p className="text-3xl font-semibold text-heading">{formatInr(receipt.grandTotal)}</p>
          </div>
          <PaymentMethodBadge paymentMethod={receipt.paymentMethod} />
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
          <DetailField label="Order no">{receipt.orderNo}</DetailField>
          <DetailField label="Paid at">{formatDateTime(receipt.paidAt)}</DetailField>
          <DetailField label="Outlet">{receipt.outletId?.name ?? '—'}</DetailField>
          <DetailField label="Order type">{ORDER_TYPE_LABELS[receipt.orderType] ?? receipt.orderType}</DetailField>
          {receipt.tableId?.name && <DetailField label="Table">{receipt.tableId.name}</DetailField>}
          <DetailField label="Customer">
            {receipt.customerId ? `${receipt.customerId.name} · ${receipt.customerId.phone}` : 'Walk-in'}
          </DetailField>
        </dl>

        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-heading">Items ({receipt.items.length})</h3>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {receipt.items.map((item) => (
              <li key={item._id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className={`font-medium ${item.status === 'cancelled' ? 'text-muted line-through' : 'text-heading'}`}>{item.name}</p>
                  <p className="text-sm text-muted">
                    {item.quantity} × {formatInr(item.price)}
                  </p>
                  {item.notes && <p className="text-sm italic text-muted">{item.notes}</p>}
                </div>
                <p className="shrink-0 font-medium text-heading">{formatInr(item.itemTotal)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-page p-4 text-sm">
          <TotalsRow label="Sub total" value={formatInr(receipt.subTotal)} />
          {receipt.discountAmount > 0 && <TotalsRow label="Discount" value={`- ${formatInr(receipt.discountAmount)}`} />}
          <TotalsRow label={`Tax (${receipt.taxPercent}%)`} value={formatInr(receipt.taxAmount)} />
          {receipt.loyaltyPointsRedeemed > 0 && <TotalsRow label="Loyalty points redeemed" value={String(receipt.loyaltyPointsRedeemed)} />}
          <TotalsRow label="Grand total" value={formatInr(receipt.grandTotal)} isEmphasised />
        </div>
      </div>
    );
  }

  return (
    <SideModal isOpen onClose={onClose} title="Payment receipt">
      <div className="flex flex-col gap-6">
        {modalBody}
        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </SideModal>
  );
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const PaymentMain = () => {
  const [scope, setScope] = useState<PaymentScopeSelection>('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: outletListData } = useGetOutletList();
  const outletOptions = toOutletEntries(outletListData).map((outlet) => ({ label: outlet.name, value: outlet.id ?? outlet._id ?? '' }));

  const isCustomScope = scope === 'custom';
  const isCustomRangeValid = !isCustomScope || (!!fromDate && !!toDate && fromDate <= toDate);

  // The backend falls back to "today" when no scope is sent, so a scope or an explicit range is always passed.
  const dateFilters: Pick<PaymentListFilters, 'scope' | 'from' | 'to'> = !isCustomScope
    ? { scope }
    : isCustomRangeValid
      ? { from: toStartOfDayIso(fromDate), to: toEndOfDayIso(toDate) }
      : { scope: 'today' };

  const filters: InfinitePaymentListFilters = {
    outletId: selectedOutletId || undefined,
    paymentMethod: (paymentMethodFilter || undefined) as PaymentMethod | undefined,
    orderType: (orderTypeFilter || undefined) as OrderType | undefined,
    ...dateFilters,
  };

  const { data, isLoading, error, refetch, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteListPayments(filters, PAGE_SIZE);

  // While a custom range is incomplete the hook falls back to "today", so ignore that data
  // instead of showing today's figures under a custom-range selection.
  const loadedPages = isCustomRangeValid ? (data?.pages ?? []) : [];
  const payments: PaymentOrderItem[] = loadedPages.flatMap((page) => page.payments);
  // The summary covers every matching payment (not just the loaded pages), and the first page is always current.
  const summary = loadedPages[0]?.summary;
  const totalPayments = loadedPages[0]?.total ?? 0;
  const totalCollected = summary?.totalCollected ?? 0;
  const averageBillValue = totalPayments > 0 ? totalCollected / totalPayments : 0;
  const paymentModeBreakdown = Object.entries(summary?.byMode ?? {}).sort(([, a], [, b]) => b.amount - a.amount);

  const hasExtraFilters = !!paymentMethodFilter || !!orderTypeFilter || !!selectedOutletId;
  const clearExtraFilters = () => {
    setPaymentMethodFilter('');
    setOrderTypeFilter('');
    setSelectedOutletId('');
  };

  // ── Table body ──────────────────────────────────────────────────────────────
  let tableRows: ReactNode;
  if (!isCustomRangeValid) {
    tableRows = (
      <TableMessageRow>
        <p>{fromDate && toDate ? 'The start date must be on or before the end date.' : 'Pick a start and end date to see payments.'}</p>
      </TableMessageRow>
    );
  } else if (isLoading) {
    tableRows = <TableMessageRow>Loading payments…</TableMessageRow>;
  } else if (error) {
    tableRows = (
      <TableMessageRow>
        <AlertCircle size={24} className="text-danger" />
        <p>{error.message}</p>
        <Button variant="outline" leftIcon={<RefreshCw size={16} />} onClick={() => refetch()}>
          Try again
        </Button>
      </TableMessageRow>
    );
  } else if (payments.length === 0) {
    tableRows = (
      <TableMessageRow>
        <p>No payments found for these filters.</p>
        {hasExtraFilters && (
          <Button variant="outline" onClick={clearExtraFilters}>
            Clear filters
          </Button>
        )}
      </TableMessageRow>
    );
  } else {
    tableRows = payments.map((payment, rowIndex) => (
      <Tr key={payment._id} ariaLabel={`Payment for bill ${payment.billNo || payment.orderNo}`} onClick={() => setSelectedOrderId(payment._id)}>
        <Td>
          <span className="text-muted">{rowIndex + 1}</span>
        </Td>
        <Td>
          <div className="min-w-32">
            <p className="font-semibold text-heading">{payment.billNo || payment.orderNo}</p>
            {payment.billNo && <p className="text-sm text-muted">{payment.orderNo}</p>}
          </div>
        </Td>
        <Td>{formatDateTime(payment.paidAt)}</Td>
        <Td>{payment.outletId?.name ?? '—'}</Td>
        <Td>
          {payment.customerId ? (
            <div className="min-w-32">
              <p className="text-heading">{payment.customerId.name}</p>
              <p className="text-sm text-muted">{payment.customerId.phone}</p>
            </div>
          ) : (
            <span className="text-muted">Walk-in</span>
          )}
        </Td>
        <Td>{ORDER_TYPE_LABELS[payment.orderType] ?? payment.orderType}</Td>
        <Td>
          <PaymentMethodBadge paymentMethod={payment.paymentMethod} />
        </Td>
        <Td>
          <div className="text-right font-semibold text-heading">{formatInr(payment.grandTotal)}</div>
        </Td>
        <Td>
          <div className="flex items-center justify-end" onClick={(event) => event.stopPropagation()}>
            <Button size="sm" variant="outline" leftIcon={<Eye size={14} />} onClick={() => setSelectedOrderId(payment._id)}>
              View
            </Button>
          </div>
        </Td>
      </Tr>
    ));
  }

  return (
    <div className="flex w-full flex-col gap-5 p-2">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Banknote size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-heading">Payments</h1>
            <p className="text-sm text-muted">Every paid bill across your outlets</p>
          </div>
        </div>
        <Button variant="outline" leftIcon={<RefreshCw size={16} />} isLoading={isFetching && !isFetchingNextPage} loadingText="Refreshing..." onClick={() => refetch()}>
          Refresh
        </Button>
      </header>

      {/* Filters */}
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
          {SCOPE_OPTIONS.map((scopeOption) => (
            <Button
              key={scopeOption.value}
              size="sm"
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
              <Label htmlFor="paymentFromDate">From</Label>
              <Input
                id="paymentFromDate"
                type="date"
                max={toDate || undefined}
                value={fromDate}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setFromDate(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentToDate">To</Label>
              <Input
                id="paymentToDate"
                type="date"
                min={fromDate || undefined}
                value={toDate}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setToDate(event.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SearchSelect
            label="Payment method"
            options={PAYMENT_METHOD_OPTIONS}
            value={paymentMethodFilter}
            placeholder="All methods"
            onChange={(option) => setPaymentMethodFilter(String(option.value))}
            onClear={() => setPaymentMethodFilter('')}
          />
          <SearchSelect
            label="Order type"
            options={ORDER_TYPE_OPTIONS}
            value={orderTypeFilter}
            placeholder="All order types"
            onChange={(option) => setOrderTypeFilter(String(option.value))}
            onClear={() => setOrderTypeFilter('')}
          />
          <SearchSelect
            label="Outlet"
            options={outletOptions}
            value={selectedOutletId}
            placeholder="All outlets"
            onChange={(option) => setSelectedOutletId(String(option.value))}
            onClear={() => setSelectedOutletId('')}
          />
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard icon={<Wallet size={20} />} label="Total collected" value={summary ? formatInr(totalCollected) : '—'} hint="For the selected filters" />
        <SummaryCard icon={<FileText size={20} />} label="Paid bills" value={summary ? String(totalPayments) : '—'} hint="Completed and paid orders" />
        <SummaryCard icon={<TrendingUp size={20} />} label="Average bill" value={summary ? formatInr(averageBillValue) : '—'} hint="Per paid bill" />
      </div>

      {paymentModeBreakdown.length > 0 && (
        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-lg font-semibold text-heading">Collection by payment mode</h2>
            <p className="text-sm text-muted">Share of the total collected for the selected filters</p>
          </div>
          <ul className="flex flex-col gap-4">
            {paymentModeBreakdown.map(([paymentMethod, modeSummary]) => {
              const presentation = getPaymentMethodPresentation(paymentMethod);
              const sharePercent = totalCollected > 0 ? (modeSummary.amount / totalCollected) * 100 : 0;
              return (
                <li key={paymentMethod} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-heading">{presentation.label}</span>
                    <span className="text-sm text-body">
                      <span className="font-semibold text-heading">{formatInr(modeSummary.amount)}</span> · {modeSummary.count} bill
                      {modeSummary.count === 1 ? '' : 's'} · {sharePercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border" role="img" aria-label={`${presentation.label} ${sharePercent.toFixed(0)} percent`}>
                    <div className={`h-full rounded-full ${presentation.barClass}`} style={{ width: `${sharePercent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Table */}
      <div className="flex flex-col gap-3">
        <TableContainer className="min-h-[300px]" ariaLabel="Payments" caption="Paid bills for the selected filters">
          <THead>
            <Tr>
              <Th className="w-16">S.No</Th>
              <Th>Bill</Th>
              <Th>Paid at</Th>
              <Th>Outlet</Th>
              <Th>Customer</Th>
              <Th>Order type</Th>
              <Th>Method</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </THead>
          <TBody>{tableRows}</TBody>
        </TableContainer>

        {payments.length > 0 && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted">
              Showing {payments.length} of {totalPayments} {totalPayments === 1 ? 'payment' : 'payments'}
            </p>
            {hasNextPage && (
              <Button variant="outline" isLoading={isFetchingNextPage} loadingText="Loading..." onClick={() => fetchNextPage()}>
                Load more
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedOrderId && <PaymentReceiptModal key={selectedOrderId} orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
    </div>
  );
};

export default PaymentMain;