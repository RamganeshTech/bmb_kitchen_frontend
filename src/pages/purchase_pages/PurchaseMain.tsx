import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ShoppingCart, Plus, Eye, CreditCard, RotateCcw, Archive, Trash2, MoreVertical, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect } from '../../components/ui/SearchSelect';
import type { SelectOption } from '../../components/ui/SearchSelect';
import { SideModal } from '../../components/ui/SideModal';
import { Dropdown } from '../../components/ui/Dropdown';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import { useAuthData } from '../../hooks/useAuthData';
import {
  PURCHASE_WRITE_ROLES,
  PURCHASE_HARD_DELETE_ROLES,
  useGetPurchaseList,
  useGetInactivePurchaseList,
  useGetPurchaseById,
  useCreatePurchase,
  useUpdatePurchase,
  useSoftDeletePurchase,
  useRestorePurchase,
  useHardDeletePurchase,
} from '../../api_service/purchase_api/purchaseApi';
import type { CreatePurchasePayload } from '../../api_service/purchase_api/purchaseApi';
import { useGetVendorDropdown } from '../../api_service/vendor_api/vendorApi';
import { useGetInventoryDropdown } from '../../api_service/inventory_api/inventoryApi';

// ── Types & helpers ──────────────────────────────────────────────────────────
type Option = SelectOption;

interface PurchaseRow {
  _id: string;
  purchaseNo?: string;
  vendorId?: any; // populated: { _id, vendorName } or a plain id
  items: any[]; // { inventoryId, quantity, rate }
  totalAmount?: number;
  paymentStatus?: string;
  createdAt?: string;
}

interface InvItem { _id: string; material: string; rate?: number; unit?: string }
interface VendorItem { _id: string; vendorName: string }

type Panel = { mode: 'create' } | { mode: 'view'; id: string } | { mode: 'payment'; id: string } | null;

const PAYMENT_OPTIONS: Option[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Partial', value: 'partial' },
  { label: 'Paid', value: 'paid' },
];
const SORT_OPTIONS: Option[] = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Amount: high to low', value: 'amount_desc' },
  { label: 'Amount: low to high', value: 'amount_asc' },
];

const inr = (n?: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const numStr = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.items ?? d?.data ?? []);
const idOf = (v: any): string => (v && typeof v === 'object' ? v._id : v) ?? '';
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');

const calcTotal = (items: { quantity?: number; rate?: number }[]) => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
const totalOf = (r: PurchaseRow) => r.totalAmount ?? calcTotal(r.items ?? []);
const timeOf = (r: PurchaseRow) => (r.createdAt ? new Date(r.createdAt).getTime() : 0);

const sortRows = (rows: PurchaseRow[], sort: string) => {
  const list = [...rows];
  switch (sort) {
    case 'newest': return list.sort((a, b) => timeOf(b) - timeOf(a));
    case 'oldest': return list.sort((a, b) => timeOf(a) - timeOf(b));
    case 'amount_desc': return list.sort((a, b) => totalOf(b) - totalOf(a));
    case 'amount_asc': return list.sort((a, b) => totalOf(a) - totalOf(b));
    default: return list;
  }
};

// ── Small building blocks ────────────────────────────────────────────────────
const Field = ({ label, hint, error, children }: { label?: string; hint?: string; error?: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    {label && <Label>{label}</Label>}
    {children}
    {hint && !error && <p className="text-sm text-muted">{hint}</p>}
    {error && <p className="text-sm text-danger">{error}</p>}
  </div>
);

const IconAction = ({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface transition-colors ${
      danger ? 'text-danger hover:bg-danger-soft' : 'text-body hover:bg-surface-hover hover:text-heading'
    }`}
  >
    {children}
  </button>
);

const Stat = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="rounded-lg border border-border bg-page px-3 py-2.5">
    <p className="text-sm text-muted">{label}</p>
    <div className="text-lg font-semibold text-heading">{children}</div>
  </div>
);

const StatusBadge = ({ status }: { status?: string }) => {
  const style =
    status === 'paid' ? 'bg-success-soft text-success' : status === 'partial' ? 'bg-info-soft text-info' : 'bg-warning-soft text-warning';
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ${style}`}>{cap(status)}</span>;
};

const ConfirmDialog = ({
  title, message, confirmLabel, isPending, onCancel, onConfirm,
}: { title: string; message: string; confirmLabel: string; isPending: boolean; onCancel: () => void; onConfirm: () => void }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
    <div className="w-full rounded-xl border border-border bg-surface p-6 shadow-xl sm:w-[440px]">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-danger-soft p-2 text-danger">
          <AlertTriangle size={20} />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-heading">{title}</h3>
          <p className="mt-1 text-base text-body">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isPending} loadingText="Please wait...">{confirmLabel}</Button>
      </div>
    </div>
  </div>
);

// ── Create form ──────────────────────────────────────────────────────────────
interface ItemState { key: string; inventoryId: string; quantity: string; rate: string }
const newItem = (): ItemState => ({ key: crypto.randomUUID(), inventoryId: '', quantity: '', rate: '' });

const PurchaseForm = ({
  vendors, inventory, isPending, onSubmit, onCancel,
}: {
  vendors: VendorItem[];
  inventory: InvItem[];
  isPending: boolean;
  onSubmit: (payload: CreatePurchasePayload) => Promise<void>;
  onCancel: () => void;
}) => {
  const [vendorId, setVendorId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [items, setItems] = useState<ItemState[]>([newItem()]);
  const [vendorError, setVendorError] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const vendorOptions: Option[] = vendors.map((v) => ({ label: v.vendorName, value: v._id }));
  const inventoryOptions: Option[] = inventory.map((i) => ({ label: i.material, value: i._id }));

  const patchItem = (key: string, patch: Partial<ItemState>) => {
    setItems((l) => l.map((i) => (i.key === key ? { ...i, ...patch } : i)));
    setRowErrors((r) => ({ ...r, [key]: '' }));
  };

  const pickInventory = (key: string, id: string) => {
    const inv = inventory.find((x) => x._id === id);
    patchItem(key, { inventoryId: id, rate: numStr(inv?.rate) });
  };

  const validate = () => {
    const re: Record<string, string> = {};
    const seen = new Set<string>();
    items.forEach((i) => {
      if (!i.inventoryId) re[i.key] = 'Select an item';
      else if (seen.has(i.inventoryId)) re[i.key] = 'This item is already added';
      else if (!(Number(i.quantity) > 0)) re[i.key] = 'Enter a quantity greater than 0';
      else if (i.rate === '' || Number(i.rate) < 0) re[i.key] = 'Enter a valid rate';
      if (i.inventoryId) seen.add(i.inventoryId);
    });
    setVendorError(vendorId ? '' : 'Select a vendor');
    setRowErrors(re);
    return !!vendorId && Object.keys(re).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    await onSubmit({
      vendorId,
      paymentStatus,
      items: items.map((i) => ({ inventoryId: i.inventoryId, quantity: Number(i.quantity), rate: Number(i.rate) })),
    });
  };

  const total = calcTotal(items.map((i) => ({ quantity: Number(i.quantity), rate: Number(i.rate) })));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Vendor *" error={vendorError}>
        <SearchSelect
          label=""
          options={vendorOptions}
          value={vendorId}
          placeholder="Select a vendor"
          onChange={(o) => { setVendorId(String(o.value)); setVendorError(''); }}
          onClear={() => setVendorId('')}
        />
      </Field>

      <Field label="Payment status">
        <SearchSelect
          label=""
          options={PAYMENT_OPTIONS}
          value={paymentStatus}
          placeholder="Payment status"
          onChange={(o) => setPaymentStatus(String(o.value))}
          onClear={() => setPaymentStatus('pending')}
        />
      </Field>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Items *</Label>
          <Button type="button" variant="outline" size="sm" leftIcon={<Plus size={16} />} onClick={() => setItems((l) => [...l, newItem()])}>
            Add item
          </Button>
        </div>

        {items.map((i) => {
          const unit = inventory.find((x) => x._id === i.inventoryId)?.unit;
          return (
            <div key={i.key} className="flex flex-col gap-3 rounded-lg border border-border bg-page p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <SearchSelect
                    label=""
                    options={inventoryOptions}
                    value={i.inventoryId}
                    placeholder="Select item"
                    onChange={(o) => pickInventory(i.key, String(o.value))}
                    onClear={() => patchItem(i.key, { inventoryId: '', rate: '' })}
                  />
                </div>
                {items.length > 1 && (
                  <IconAction danger label="Remove item" onClick={() => setItems((l) => l.filter((x) => x.key !== i.key))}>
                    <Trash2 size={18} />
                  </IconAction>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={unit ? `Quantity (${unit})` : 'Quantity'}>
                  <Input type="number" min={0} step="any" value={i.quantity} onChange={(e) => patchItem(i.key, { quantity: e.target.value })} placeholder="e.g. 10" />
                </Field>
                <Field label={unit ? `Rate (₹ per ${unit})` : 'Rate (₹)'}>
                  <Input type="number" min={0} step="any" value={i.rate} onChange={(e) => patchItem(i.key, { rate: e.target.value })} />
                </Field>
              </div>
              {rowErrors[i.key] ? (
                <p className="text-sm text-danger">{rowErrors[i.key]}</p>
              ) : (
                <p className="text-sm text-muted">Amount: {inr((Number(i.quantity) || 0) * (Number(i.rate) || 0))}</p>
              )}
            </div>
          );
        })}
      </div>

      <Stat label="Total amount">{inr(total)}</Stat>

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" isLoading={isPending} loadingText="Saving...">Create purchase</Button>
      </div>
    </form>
  );
};

// ── Payment status form (the only field a purchase allows to be edited) ──────
const PaymentForm = ({
  initial, isPending, onSubmit, onCancel,
}: { initial?: string; isPending: boolean; onSubmit: (status: string) => Promise<void>; onCancel: () => void }) => {
  const [status, setStatus] = useState(initial ?? 'pending');
  return (
    <form
      onSubmit={async (ev: FormEvent) => {
        ev.preventDefault();
        await onSubmit(status);
      }}
      className="flex flex-col gap-5"
    >
      <Field label="Payment status" hint="Items and quantities can't be changed after a purchase is created, because stock was already updated.">
        <SearchSelect
          label=""
          options={PAYMENT_OPTIONS}
          value={status}
          placeholder="Payment status"
          onChange={(o) => setStatus(String(o.value))}
          onClear={() => setStatus('pending')}
        />
      </Field>
      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" isLoading={isPending} loadingText="Saving...">Save</Button>
      </div>
    </form>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const PurchaseMain = () => {
  const { currentRole } = useAuthData();
  const canWrite = PURCHASE_WRITE_ROLES.includes(currentRole as never);
  const canHardDelete = PURCHASE_HARD_DELETE_ROLES.includes(currentRole as never);

  const [tab, setTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'hard'; row: PurchaseRow } | null>(null);

  const activeQ = useGetPurchaseList();
  const inactiveQ = useGetInactivePurchaseList();
  const vendorQ = useGetVendorDropdown();
  const inventoryQ = useGetInventoryDropdown();
  const detailQ = useGetPurchaseById(panel?.mode === 'view' ? panel.id : undefined);

  const { mutateAsync: createAsync, isPending: creating } = useCreatePurchase();
  const { mutateAsync: updateAsync, isPending: updating } = useUpdatePurchase();
  const { mutateAsync: softDeleteAsync, isPending: softDeleting } = useSoftDeletePurchase();
  const { mutateAsync: restoreAsync } = useRestorePurchase();
  const { mutateAsync: hardDeleteAsync, isPending: hardDeleting } = useHardDeletePurchase();

  const query = tab === 'active' ? activeQ : inactiveQ;
  const allRows: PurchaseRow[] = toArray(query.data);
  const vendors: VendorItem[] = toArray(vendorQ.data);
  const inventory: InvItem[] = toArray(inventoryQ.data);
  const vendorMap = new Map(vendors.map((v) => [v._id, v.vendorName]));
  const invMap = new Map(inventory.map((i) => [i._id, i]));

  const vendorNameOf = (r: PurchaseRow) => (r.vendorId && typeof r.vendorId === 'object' ? r.vendorId.vendorName : vendorMap.get(r.vendorId)) ?? '—';
  const itemName = (i: any): string => (i.inventoryId && typeof i.inventoryId === 'object' ? i.inventoryId.material : invMap.get(i.inventoryId)?.material) ?? '—';
  const itemUnit = (i: any): string => (i.inventoryId && typeof i.inventoryId === 'object' ? i.inventoryId.unit : invMap.get(i.inventoryId)?.unit) ?? '';

  const vendorFilterOptions: Option[] = vendors.map((v) => ({ label: v.vendorName, value: v._id }));

  const q = search.trim().toLowerCase();
  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;

  const rows = sortRows(
    allRows.filter((r) => {
      if (q && !(r.purchaseNo ?? '').toLowerCase().includes(q) && !vendorNameOf(r).toLowerCase().includes(q)) return false;
      if (status && r.paymentStatus !== status) return false;
      if (vendorFilter && idOf(r.vendorId) !== vendorFilter) return false;
      if (fromTime !== null && timeOf(r) < fromTime) return false;
      if (toTime !== null && timeOf(r) > toTime) return false;
      return true;
    }),
    sort
  );

  const baseRow = panel && panel.mode !== 'create' ? [...toArray(activeQ.data), ...toArray(inactiveQ.data)].find((r: PurchaseRow) => r._id === panel.id) : undefined;
  const detail = detailQ.data as PurchaseRow | undefined;
  const viewRow: PurchaseRow | undefined = detail ? { ...detail, vendorId: typeof detail.vendorId === 'object' ? detail.vendorId : baseRow?.vendorId ?? detail.vendorId } : baseRow;

  const hasFilters = !!(search || status || vendorFilter || from || to || sort);
  const clearFilters = () => { setSearch(''); setStatus(''); setVendorFilter(''); setFrom(''); setTo(''); setSort(''); };

  const handleCreate = async (payload: CreatePurchasePayload) => {
    try {
      await createAsync(payload);
      toast.success('Purchase created and stock updated');
      setPanel(null);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to create purchase'));
    }
  };

  const handlePayment = async (paymentStatus: string) => {
    if (panel?.mode !== 'payment') return;
    try {
      await updateAsync({ purchaseId: panel.id, paymentStatus });
      toast.success('Payment status updated');
      setPanel(null);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to update payment status'));
    }
  };

  const handleRestore = async (row: PurchaseRow) => {
    try {
      await restoreAsync(row._id);
      toast.success(`${row.purchaseNo ?? 'Purchase'} restored`);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to restore purchase'));
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.kind === 'deactivate') {
        await softDeleteAsync(confirm.row._id);
        toast.success(`${confirm.row.purchaseNo ?? 'Purchase'} deactivated`);
      } else {
        await hardDeleteAsync(confirm.row._id);
        toast.success(`${confirm.row.purchaseNo ?? 'Purchase'} deleted permanently`);
      }
      setConfirm(null);
    } catch (e) {
      toast.error(errMsg(e, 'Action failed'));
    }
  };

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-base font-medium transition-colors ${active ? 'bg-primary-soft text-heading' : 'text-muted hover:text-heading'}`;

  return (
    <div className="flex w-full flex-col gap-3 p-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ShoppingCart size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-heading">Purchases</h1>
            <p className="text-sm text-muted">Goods bought from vendors. Stock is updated when a purchase is created</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="lg:hidden">
            <Button variant="outline" leftIcon={<SlidersHorizontal size={16} />} onClick={() => setFiltersOpen((v) => !v)}>
              Filters
            </Button>
          </div>
          {canWrite && (
            <Button leftIcon={<Plus size={16} />} onClick={() => setPanel({ mode: 'create' })}>
              Add purchase
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-4">
        {/* Filters: 25% */}
        <aside className={`${filtersOpen ? 'flex' : 'hidden'} flex-col overflow-hidden rounded-xl border border-border bg-page lg:col-span-1 lg:flex`}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-heading">Filters</h2>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-sm font-medium text-primary hover:underline">
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-col gap-4 p-4">
            <Field label="Search">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Purchase no. or vendor" />
            </Field>
            <Field label="Vendor">
              <SearchSelect label="" options={vendorFilterOptions} value={vendorFilter} placeholder="All vendors" onChange={(o) => setVendorFilter(String(o.value))} onClear={() => setVendorFilter('')} />
            </Field>
            <Field label="Payment status">
              <SearchSelect label="" options={PAYMENT_OPTIONS} value={status} placeholder="All statuses" onChange={(o) => setStatus(String(o.value))} onClear={() => setStatus('')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To">
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
            <Field label="Sort by">
              <SearchSelect label="" options={SORT_OPTIONS} value={sort} placeholder="Default order" onChange={(o) => setSort(String(o.value))} onClear={() => setSort('')} />
            </Field>
          </div>
        </aside>

        {/* List: 75% */}
        <section className="min-w-0 rounded-xl border border-border bg-surface shadow-sm lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-1">
              <button type="button" className={tabClass(tab === 'active')} onClick={() => setTab('active')}>Active</button>
              {canWrite && <button type="button" className={tabClass(tab === 'inactive')} onClick={() => setTab('inactive')}>Inactive</button>}
            </div>
            <p className="text-sm text-muted">{rows.length} of {allRows.length} purchases</p>
          </div>

          <TableContainer ariaLabel="Purchases" caption="Purchases from vendors" className="min-h-[300px]">
            <THead>
              <Tr>
                <Th className='text-center'>S.No</Th>
                <Th>Purchase</Th>
                <Th>Vendor</Th>
                <Th>Items</Th>
                <Th>Total</Th>
                <Th>Payment</Th>
                <Th>Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {query.isLoading ? (
                <Tr>
                  <Td colSpan={7}>
                    <div className="flex h-40 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  </Td>
                </Tr>
              ) : query.error ? (
                <Tr>
                  <Td colSpan={7}><p className="py-10 text-center text-base font-medium text-danger">{(query.error as Error).message}</p></Td>
                </Tr>
              ) : rows.length === 0 ? (
                <Tr>
                  <Td colSpan={7}>
                    <p className="py-10 text-center text-base text-muted">
                      {allRows.length === 0 ? (tab === 'active' ? 'No purchases yet.' : 'No inactive purchases.') : 'No purchases match these filters.'}
                    </p>
                  </Td>
                </Tr>
              ) : (
                rows.map((r, idx) => (
                  <Tr key={r._id} ariaLabel={`View ${r.purchaseNo ?? 'purchase'}`} onClick={() => setPanel({ mode: 'view', id: r._id })}>
                    <Td className="text-base font-medium text-center">{idx + 1}</Td>
                    <Td>
                      <p className="text-base font-medium text-heading">{r.purchaseNo ?? '—'}</p>
                      <p className="text-sm text-muted">{fmtDate(r.createdAt)}</p>
                    </Td>
                    <Td>{vendorNameOf(r)}</Td>
                    <Td>{r.items?.length ?? 0}</Td>
                    <Td>{inr(totalOf(r))}</Td>
                    <Td><StatusBadge status={r.paymentStatus} /></Td>
                    <Td>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {tab === 'active' ? (
                          <>
                            <IconAction label="View" onClick={() => setPanel({ mode: 'view', id: r._id })}>
                              <Eye size={18} />
                            </IconAction>
                            {canWrite && (
                              <Dropdown
                                triggerLabel="More actions"
                                trigger={
                                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-body hover:bg-surface-hover">
                                    <MoreVertical size={18} />
                                  </span>
                                }
                                items={[
                                  { label: 'Update payment', icon: <CreditCard size={16} />, onClick: () => setPanel({ mode: 'payment', id: r._id }) },
                                  { label: 'Deactivate', icon: <Archive size={16} />, isDanger: true, onClick: () => setConfirm({ kind: 'deactivate', row: r }) },
                                ]}
                              />
                            )}
                          </>
                        ) : (
                          <>
                            <IconAction label="Restore" onClick={() => handleRestore(r)}>
                              <RotateCcw size={18} />
                            </IconAction>
                            {canHardDelete && (
                              <IconAction danger label="Delete permanently" onClick={() => setConfirm({ kind: 'hard', row: r })}>
                                <Trash2 size={18} />
                              </IconAction>
                            )}
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))
              )}
            </TBody>
          </TableContainer>
        </section>
      </div>

      {/* Side panel: view / create / payment */}
      <SideModal
        isOpen={!!panel}
        onClose={() => setPanel(null)}
        title={panel?.mode === 'create' ? 'New purchase' : panel?.mode === 'payment' ? 'Update payment' : 'Purchase details'}
      >
        {panel?.mode === 'view' && viewRow && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-xl font-semibold text-heading">{viewRow.purchaseNo ?? 'Purchase'}</h3>
              <p className="text-base text-muted">{vendorNameOf(viewRow)} · {fmtDate(viewRow.createdAt)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Total amount">{inr(totalOf(viewRow))}</Stat>
              <Stat label="Payment"><StatusBadge status={viewRow.paymentStatus} /></Stat>
            </div>
            <TableContainer ariaLabel="Purchased items" caption="Items in this purchase">
              <THead>
                <Tr>
                  <Th>Item</Th>
                  <Th>Qty</Th>
                  <Th>Rate</Th>
                  <Th>Amount</Th>
                </Tr>
              </THead>
              <TBody>
                {(viewRow.items ?? []).map((i: any, idx: number) => (
                  <Tr key={idx}>
                    <Td>{itemName(i)}</Td>
                    <Td>{i.quantity} {itemUnit(i)}</Td>
                    <Td>{inr(i.rate)}</Td>
                    <Td>{inr((i.quantity || 0) * (i.rate || 0))}</Td>
                  </Tr>
                ))}
              </TBody>
            </TableContainer>
            {canWrite && tab === 'active' && (
              <div className="flex justify-end border-t border-border pt-5">
                <Button leftIcon={<CreditCard size={16} />} onClick={() => setPanel({ mode: 'payment', id: viewRow._id })}>
                  Update payment
                </Button>
              </div>
            )}
          </div>
        )}

        {panel?.mode === 'view' && !viewRow && (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {panel?.mode === 'create' && (
          <PurchaseForm vendors={vendors} inventory={inventory} isPending={creating} onSubmit={handleCreate} onCancel={() => setPanel(null)} />
        )}

        {panel?.mode === 'payment' && baseRow && (
          <PaymentForm key={panel.id} initial={baseRow.paymentStatus} isPending={updating} onSubmit={handlePayment} onCancel={() => setPanel(null)} />
        )}
      </SideModal>

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'deactivate' ? 'Deactivate purchase?' : 'Delete permanently?'}
          message={
            confirm.kind === 'deactivate'
              ? `${confirm.row.purchaseNo ?? 'This purchase'} will move to Inactive. You can restore it later.`
              : `${confirm.row.purchaseNo ?? 'This purchase'} will be deleted for good. This cannot be undone.`
          }
          confirmLabel={confirm.kind === 'deactivate' ? 'Deactivate' : 'Delete'}
          isPending={softDeleting || hardDeleting}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};

export default PurchaseMain;