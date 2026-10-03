import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BadgePercent, Plus, Search, X, Pencil, Eye,
  Power, RotateCcw, Trash2, MoreVertical, AlertTriangle,
  CalendarDays, ShoppingBag, Tag, Users, Copy, Timer,
} from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { Dropdown } from '../../components/ui/Dropdown';
import {SideModal} from '../../components/ui/SideModal';
import { useAuthData } from '../../hooks/useAuthData';

import {
  OFFER_INACTIVE_READ_ROLES, OFFER_WRITE_ROLES, OFFER_HARD_DELETE_ROLES,
  useGetOfferList, useGetInactiveOfferList, useGetOfferById, useCreateOffer, 
  useUpdateOffer, useSoftDeleteOffer, useRestoreOffer, useHardDeleteOffer,
} from '../../api_service/offer_api/offerApi';
import type { OfferItem, OfferPayload } from '../../api_service/offer_api/offerApi';
import { useGetMenuCategoryDropdown } from '../../api_service/menuCategory_api/menuCategoryApi';
import { useGetMenuItemDropdown } from '../../api_service/menuItem_api/menuItemApi';

// ── Types & helpers ──────────────────────────────────────────────────────────
// The backend enum for applicableOn is 'all' | 'category' | 'item' (the hook type says 'menu_item')
type Scope = 'all' | 'category' | 'item';
type Tab = 'active' | 'inactive';
type Panel = { type: 'create' } | { type: 'view'; id: string } | { type: 'edit'; id: string } | null;
type Confirm = { kind: 'deactivate' | 'hard'; item: OfferItem } | null;
type Option = { label: string; value: string };
type NameMaps = { categories: Record<string, string>; items: Record<string, string> };

const DISCOUNT_TYPE_OPTIONS: Option[] = [
  { label: 'Percentage (%)', value: 'percentage' },
  { label: 'Flat amount (₹)', value: 'flat' },
];

const SCOPE_OPTIONS: Option[] = [
  { label: 'Entire menu', value: 'all' },
  { label: 'Specific categories', value: 'category' },
  { label: 'Specific items', value: 'item' },
];

const CODE_REGEX = /^[A-Z0-9_-]{3,20}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const inr = (n: number | undefined | null) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDay = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const toDateInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// ids may come back plain or populated
const toId = (v: unknown): string => (typeof v === 'string' ? v : ((v as { _id?: string } | null)?._id ?? ''));
const idsOf = (list: unknown): string[] => (Array.isArray(list) ? list.map(toId).filter(Boolean) : []);
const scopeOf = (o: OfferItem): Scope => (String(o.applicableOn ?? 'all') === 'all' ? 'all' : String(o.applicableOn) === 'category' ? 'category' : 'item');

const statusOf = (o: OfferItem): 'live' | 'upcoming' | 'expired' => {
  const now = Date.now();
  if (now < new Date(o.startDate).getTime()) return 'upcoming';
  if (now > new Date(o.endDate).getTime()) return 'expired';
  return 'live';
};

const timingText = (o: OfferItem) => {
  const s = statusOf(o);
  if (s === 'expired') return `Ended ${fmtDay(o.endDate)}`;
  if (s === 'upcoming') {
    const days = Math.ceil((new Date(o.startDate).getTime() - Date.now()) / DAY_MS);
    return `Starts in ${days} day${days === 1 ? '' : 's'}`;
  }
  const days = Math.ceil((new Date(o.endDate).getTime() - Date.now()) / DAY_MS);
  return days <= 1 ? 'Ends today' : `Ends in ${days} days`;
};

// Human-readable "applies to" summary, resolving names where we have them
const appliesTo = (o: OfferItem, maps: NameMaps) => {
  const scope = scopeOf(o);
  if (scope === 'all') return { summary: 'Entire menu', names: [] as string[] };
  const ids = idsOf(scope === 'category' ? o.categoryIds : o.menuItemIds);
  const lookup = scope === 'category' ? maps.categories : maps.items;
  const names = ids.map((id) => lookup[id]).filter(Boolean);
  const count = ids.length;
  const fallback = scope === 'category' ? `${count} categor${count === 1 ? 'y' : 'ies'}` : `${count} item${count === 1 ? '' : 's'}`;
  if (names.length === 0) return { summary: fallback, names };
  const shown = names.slice(0, 2).join(', ');
  return { summary: names.length > 2 ? `${shown} +${names.length - 2} more` : shown, names };
};

const filterOffers = (list: OfferItem[], search: string) => {
  const q = search.trim().toLowerCase();
  if (!q) return list;
  return list.filter((o) => [o.title, o.code, o.offerNo].some((f) => String(f ?? '').toLowerCase().includes(q)));
};

const discountHero = (o: OfferItem) => (o.discountType === 'percentage' ? `${o.discountValue}%` : inr(o.discountValue));

// ── Small building blocks ────────────────────────────────────────────────────
const Field = ({ label, error, hint, children }: { label?: string; error?: string; hint?: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    {label && <Label>{label}</Label>}
    {children}
    {hint && !error && <p className="text-sm text-muted">{hint}</p>}
    {error && <p className="text-sm text-danger">{error}</p>}
  </div>
);

const Detail = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
    <span className="text-base text-muted">{label}</span>
    <span className="text-right text-base font-medium text-heading">{value || '—'}</span>
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

const StatusBadge = ({ offer, inactive }: { offer: OfferItem; inactive: boolean }) => {
  const s = inactive ? 'inactive' : statusOf(offer);
  const styles = {
    live: 'bg-success-soft text-success',
    upcoming: 'bg-info-soft text-info',
    expired: 'bg-danger-soft text-danger',
    inactive: 'bg-page text-muted',
  }[s];
  const label = { live: 'Live', upcoming: 'Upcoming', expired: 'Expired', inactive: 'Inactive' }[s];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium ${styles}`}>{label}</span>;
};

const ConfirmDialog = ({
  confirm,
  isPending,
  onCancel,
  onConfirm,
}: {
  confirm: NonNullable<Confirm>;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const hard = confirm.kind === 'hard';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full rounded-xl border border-border bg-surface p-6 shadow-xl sm:w-[440px]">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-danger-soft p-2 text-danger">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-heading">{hard ? 'Delete permanently?' : 'Deactivate offer?'}</h3>
            <p className="mt-1 text-base text-body">
              {hard
                ? `"${confirm.item.title}" will be removed for good. This cannot be undone.`
                : `"${confirm.item.title}" will stop being available and move to the Inactive tab. You can restore it any time.`}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isPending} loadingText="Working...">
            {hard ? 'Delete permanently' : 'Deactivate'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Pick several options one at a time; chosen ones show as removable chips
const MultiPick = ({
  label,
  options,
  selected,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  placeholder: string;
  error?: string;
  onChange: (ids: string[]) => void;
}) => {
  const remaining = options.filter((o) => !selected.includes(o.value));
  const nameOf = (id: string) => options.find((o) => o.value === id)?.label ?? 'Unavailable';
  return (
    <Field error={error}>
      <SearchSelect
        key={selected.length}
        label={label}
        options={remaining}
        value=""
        placeholder={placeholder}
        onChange={(o) => onChange([...selected, String(o.value)])}
        onClear={() => undefined}
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
              {nameOf(id)}
              <button type="button" aria-label={`Remove ${nameOf(id)}`} onClick={() => onChange(selected.filter((s) => s !== id))}>
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
};

// ── Create / Edit form ───────────────────────────────────────────────────────
interface FormState {
  title: string;
  code: string;
  discountType: string;
  discountValue: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  startDate: string;
  endDate: string;
  applicableOn: Scope;
  categoryIds: string[];
  menuItemIds: string[];
  usageLimit: string;
  perCustomerLimit: string;
}

type ErrorKey = keyof FormState;

const numStr = (v: unknown) => (v === null || v === undefined || v === '' ? '' : String(v));

const OfferForm = ({
  initial,
  isEdit,
  isPending,
  categoryOptions,
  itemOptions,
  onSubmit,
  onCancel,
}: {
  initial?: OfferItem;
  isEdit: boolean;
  isPending: boolean;
  categoryOptions: Option[];
  itemOptions: Option[];
  onSubmit: (payload: OfferPayload) => Promise<void>;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState<FormState>({
    title: initial?.title ?? '',
    code: initial?.code ?? '',
    discountType: initial?.discountType ?? 'percentage',
    discountValue: numStr(initial?.discountValue),
    maxDiscountAmount: numStr(initial?.maxDiscountAmount),
    minOrderAmount: initial?.minOrderAmount ? String(initial.minOrderAmount) : '',
    startDate: toDateInput(initial?.startDate),
    endDate: toDateInput(initial?.endDate),
    applicableOn: initial ? scopeOf(initial) : 'all',
    categoryIds: idsOf(initial?.categoryIds),
    menuItemIds: idsOf(initial?.menuItemIds),
    usageLimit: numStr(initial?.usageLimit),
    perCustomerLimit: numStr(initial?.perCustomerLimit),
  });
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});

  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const isPercent = form.discountType === 'percentage';

  const validate = () => {
    const e: Partial<Record<ErrorKey, string>> = {};
    const value = Number(form.discountValue);
    if (!form.title.trim()) e.title = 'Offer title is required';
    if (form.code && !CODE_REGEX.test(form.code)) e.code = 'Use 3 to 20 letters, numbers, - or _';
    if (!form.discountType) e.discountType = 'Choose a discount type';
    if (!value || value <= 0) e.discountValue = 'Enter a discount greater than 0';
    else if (isPercent && value > 100) e.discountValue = 'Percentage cannot be more than 100';
    if (isPercent && form.maxDiscountAmount && Number(form.maxDiscountAmount) <= 0) e.maxDiscountAmount = 'Enter an amount greater than 0';
    if (form.minOrderAmount && Number(form.minOrderAmount) < 0) e.minOrderAmount = 'Cannot be negative';
    if (!form.startDate) e.startDate = 'Choose a start date';
    if (!form.endDate) e.endDate = 'Choose an end date';
    else if (form.startDate && form.endDate < form.startDate) e.endDate = 'End date cannot be before the start date';
    if (form.applicableOn === 'category' && form.categoryIds.length === 0) e.categoryIds = 'Pick at least one category';
    if (form.applicableOn === 'item' && form.menuItemIds.length === 0) e.menuItemIds = 'Pick at least one item';
    if (form.usageLimit && (!Number.isInteger(Number(form.usageLimit)) || Number(form.usageLimit) < 1)) e.usageLimit = 'Enter a whole number of 1 or more';
    if (form.perCustomerLimit && (!Number.isInteger(Number(form.perCustomerLimit)) || Number(form.perCustomerLimit) < 1))
      e.perCustomerLimit = 'Enter a whole number of 1 or more';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
      startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
      endDate: new Date(`${form.endDate}T23:59:59`).toISOString(),
      applicableOn: form.applicableOn,
      categoryIds: form.applicableOn === 'category' ? form.categoryIds : [],
      menuItemIds: form.applicableOn === 'item' ? form.menuItemIds : [],
    };

    // Optional fields: on create skip empty ones, on edit send null so they can be cleared
    const optional: Record<string, unknown> = {
      code: form.code || null,
      maxDiscountAmount: isPercent && form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      perCustomerLimit: form.perCustomerLimit ? Number(form.perCustomerLimit) : null,
    };
    Object.entries(optional).forEach(([k, v]) => {
      if (v !== null || isEdit) payload[k] = v;
    });

    await onSubmit(payload as unknown as OfferPayload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Offer title *" error={errors.title}>
        <Input value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="e.g. Weekend feast 20% off" />
      </Field>

      <Field label="Coupon code" error={errors.code} hint="Optional. Customers enter this at billing.">
        <Input
          value={form.code}
          maxLength={20}
          onChange={(e) => set('code')(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
          placeholder="e.g. WEEKEND20"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field error={errors.discountType}>
          <SearchSelect
            label="Discount type *"
            options={DISCOUNT_TYPE_OPTIONS}
            value={form.discountType}
            placeholder="Select a type"
            onChange={(o) => set('discountType')(String(o.value))}
            onClear={() => set('discountType')('')}
          />
        </Field>
        <Field label={isPercent ? 'Discount (%) *' : 'Discount amount (₹) *'} error={errors.discountValue}>
          <Input type="number" min={0} step="any" value={form.discountValue} onChange={(e) => set('discountValue')(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Minimum order (₹)" error={errors.minOrderAmount}>
          <Input type="number" min={0} step="any" value={form.minOrderAmount} onChange={(e) => set('minOrderAmount')(e.target.value)} placeholder="No minimum" />
        </Field>
        {isPercent && (
          <Field label="Max discount (₹)" error={errors.maxDiscountAmount}>
            <Input type="number" min={0} step="any" value={form.maxDiscountAmount} onChange={(e) => set('maxDiscountAmount')(e.target.value)} placeholder="No cap" />
          </Field>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Start date *" error={errors.startDate}>
          <Input type="date" value={form.startDate} onChange={(e) => set('startDate')(e.target.value)} />
        </Field>
        <Field label="End date *" error={errors.endDate}>
          <Input type="date" min={form.startDate || undefined} value={form.endDate} onChange={(e) => set('endDate')(e.target.value)} />
        </Field>
      </div>

      <Field>
        <SearchSelect
          label="Applies to"
          options={SCOPE_OPTIONS}
          value={form.applicableOn}
          placeholder="Select where it applies"
          onChange={(o) => set('applicableOn')(o.value as Scope)}
          onClear={() => set('applicableOn')('all')}
        />
      </Field>

      {form.applicableOn === 'category' && (
        <MultiPick
          label="Categories *"
          options={categoryOptions}
          selected={form.categoryIds}
          placeholder="Add a category"
          error={errors.categoryIds}
          onChange={set('categoryIds')}
        />
      )}
      {form.applicableOn === 'item' && (
        <MultiPick
          label="Menu items *"
          options={itemOptions}
          selected={form.menuItemIds}
          placeholder="Add a menu item"
          error={errors.menuItemIds}
          onChange={set('menuItemIds')}
        />
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Total usage limit" error={errors.usageLimit}>
          <Input type="number" min={1} step={1} value={form.usageLimit} onChange={(e) => set('usageLimit')(e.target.value)} placeholder="Unlimited" />
        </Field>
        <Field label="Limit per customer" error={errors.perCustomerLimit}>
          <Input type="number" min={1} step={1} value={form.perCustomerLimit} onChange={(e) => set('perCustomerLimit')(e.target.value)} placeholder="Unlimited" />
        </Field>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText={isEdit ? 'Saving...' : 'Creating...'}>
          {isEdit ? 'Save changes' : 'Create offer'}
        </Button>
      </div>
    </form>
  );
};

// ── Panels that load a single offer ──────────────────────────────────────────
const PanelMessage = ({ text, error }: { text: string; error?: boolean }) => (
  <p className={`py-10 text-center text-base ${error ? 'text-danger' : 'text-muted'}`}>{text}</p>
);

const ViewPanel = ({ id, maps }: { id: string; maps: NameMaps }) => {
  const { data: offer, isLoading, error } = useGetOfferById(id);
  if (isLoading) return <PanelMessage text="Loading offer..." />;
  if (error || !offer) return <PanelMessage error text={(error as Error)?.message || 'Offer not found'} />;
  const inactive = offer.isActive === false;
  const scope = scopeOf(offer);
  const applies = appliesTo(offer, maps);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          {offer.offerNo && <p className="text-sm text-muted">{offer.offerNo}</p>}
          <h3 className="text-xl font-semibold text-heading">{offer.title}</h3>
        </div>
        <StatusBadge offer={offer} inactive={inactive} />
      </div>

      <div className="rounded-xl bg-primary-soft px-5 py-4">
        <p className="text-3xl font-bold text-primary">
          {discountHero(offer)} <span className="text-base font-semibold">OFF</span>
        </p>
        {offer.discountType === 'percentage' && offer.maxDiscountAmount ? (
          <p className="text-base text-body">Up to {inr(offer.maxDiscountAmount)}</p>
        ) : null}
      </div>

      <div>
        <Detail label="Coupon code" value={offer.code} />
        <Detail label="Minimum order" value={offer.minOrderAmount ? inr(offer.minOrderAmount) : 'None'} />
        <Detail label="Valid from" value={fmtDay(offer.startDate)} />
        <Detail label="Valid until" value={fmtDay(offer.endDate)} />
        <Detail label="Total usage limit" value={offer.usageLimit ?? 'Unlimited'} />
        <Detail label="Limit per customer" value={offer.perCustomerLimit ?? 'Unlimited'} />
        <Detail label="Created" value={fmtDateTime(offer.createdAt)} />
        <Detail label="Last updated" value={fmtDateTime(offer.updatedAt)} />
      </div>

      <div>
        <p className="mb-2 text-base text-muted">Applies to</p>
        {scope === 'all' ? (
          <p className="text-base font-medium text-heading">Entire menu</p>
        ) : applies.names.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {applies.names.map((n) => (
              <span key={n} className="rounded-full bg-page px-3 py-1 text-sm font-medium text-heading">
                {n}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-base font-medium text-heading">{applies.summary}</p>
        )}
      </div>
    </div>
  );
};

const EditPanel = ({
  id,
  isPending,
  categoryOptions,
  itemOptions,
  onSubmit,
  onCancel,
}: {
  id: string;
  isPending: boolean;
  categoryOptions: Option[];
  itemOptions: Option[];
  onSubmit: (payload: OfferPayload) => Promise<void>;
  onCancel: () => void;
}) => {
  const { data: offer, isLoading, error } = useGetOfferById(id);
  if (isLoading) return <PanelMessage text="Loading offer..." />;
  if (error || !offer) return <PanelMessage error text={(error as Error)?.message || 'Offer not found'} />;
  return (
    <OfferForm
      key={offer._id}
      initial={offer}
      isEdit
      isPending={isPending}
      categoryOptions={categoryOptions}
      itemOptions={itemOptions}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
};

// ── Cards ────────────────────────────────────────────────────────────────────
interface CardActions {
  canWrite: boolean;
  canHardDelete: boolean;
  onView: (item: OfferItem) => void;
  onEdit: (item: OfferItem) => void;
  onDeactivate: (item: OfferItem) => void;
  onRestore: (item: OfferItem) => void;
  onHardDelete: (item: OfferItem) => void;
}

type ActionDef = { label: string; icon: LucideIcon; onClick: () => void; isDanger?: boolean };

const ActionButtons = ({ item, inactive, a }: { item: OfferItem; inactive: boolean; a: CardActions }) => {
  const view: ActionDef = { label: 'View details', icon: Eye, onClick: () => a.onView(item) };

  const rest: ActionDef[] = [];
  if (!inactive && a.canWrite) rest.push({ label: 'Edit offer', icon: Pencil, onClick: () => a.onEdit(item) });
  if (!inactive && a.canWrite) rest.push({ label: 'Deactivate offer', icon: Power, onClick: () => a.onDeactivate(item), isDanger: true });
  if (inactive && a.canWrite) rest.push({ label: 'Restore offer', icon: RotateCcw, onClick: () => a.onRestore(item) });
  if (inactive && a.canHardDelete) rest.push({ label: 'Delete permanently', icon: Trash2, onClick: () => a.onHardDelete(item), isDanger: true });

  // More than two actions: only View stays inline, everything else goes in the dropdown
  const collapse = rest.length + 1 > 2;
  const inline = collapse ? [view] : [view, ...rest];

  return (
    <div className="flex items-center gap-1.5">
      {inline.map(({ label, icon: Icon, onClick, isDanger }) => (
        <IconAction key={label} label={label} danger={isDanger} onClick={onClick}>
          <Icon size={18} />
        </IconAction>
      ))}
      {collapse && (
        <Dropdown
          align="right"
          triggerLabel="More actions"
          trigger={
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-body transition-colors hover:bg-surface-hover hover:text-heading">
              <MoreVertical size={18} />
            </span>
          }
          items={rest.map(({ label, icon: Icon, onClick, isDanger }) => ({
            label,
            icon: <Icon size={16} />,
            onClick,
            isDanger,
          }))}
        />
      )}
    </div>
  );
};

const MetaRow = ({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) => (
  <li className="flex items-start gap-2.5 text-base text-body">
    <Icon size={18} className="mt-0.5 shrink-0 text-muted" />
    <span className="min-w-0">{children}</span>
  </li>
);

const OfferCard = ({ offer, inactive, maps, actions }: { offer: OfferItem; inactive: boolean; maps: NameMaps; actions: CardActions }) => {
  const applies = appliesTo(offer, maps);
  const limits = [
    offer.usageLimit ? `${offer.usageLimit} total uses` : '',
    offer.perCustomerLimit ? `${offer.perCustomerLimit} per customer` : '',
  ].filter(Boolean);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(String(offer.code));
      toast.success('Coupon code copied');
    } catch {
      toast.error('Could not copy the code');
    }
  };

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md ${inactive ? 'opacity-90' : ''}`}>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-lg bg-primary-soft px-4 py-2.5">
            <p className="text-3xl font-bold leading-tight text-primary">{discountHero(offer)}</p>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Off</p>
          </div>
          <StatusBadge offer={offer} inactive={inactive} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-heading">{offer.title}</h3>
          {offer.offerNo && <p className="text-sm text-muted">{offer.offerNo}</p>}
        </div>

        {offer.code && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-page px-3 py-2">
            <span className="font-mono text-base font-semibold tracking-wider text-heading">{offer.code}</span>
            <button
              type="button"
              aria-label="Copy coupon code"
              title="Copy coupon code"
              onClick={copyCode}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-heading"
            >
              <Copy size={16} />
            </button>
          </div>
        )}

        <ul className="flex flex-col gap-2.5">
          <MetaRow icon={CalendarDays}>
            {fmtDay(offer.startDate)} to {fmtDay(offer.endDate)}
          </MetaRow>
          <MetaRow icon={Tag}>{applies.summary}</MetaRow>
          {(offer.minOrderAmount || (offer.discountType === 'percentage' && offer.maxDiscountAmount)) && (
            <MetaRow icon={ShoppingBag}>
              {[
                offer.minOrderAmount ? `Min order ${inr(offer.minOrderAmount)}` : '',
                offer.discountType === 'percentage' && offer.maxDiscountAmount ? `up to ${inr(offer.maxDiscountAmount)} off` : '',
              ]
                .filter(Boolean)
                .join(', ')}
            </MetaRow>
          )}
          {limits.length > 0 && <MetaRow icon={Users}>{limits.join(' • ')}</MetaRow>}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-page px-5 py-3">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          <Timer size={16} />
          {inactive ? 'Deactivated' : timingText(offer)}
        </span>
        <ActionButtons item={offer} inactive={inactive} a={actions} />
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl border border-border bg-surface p-5">
    <div className="flex justify-between">
      <div className="h-16 w-24 rounded-lg bg-page" />
      <div className="h-7 w-20 rounded-full bg-page" />
    </div>
    <div className="mt-4 h-5 w-2/3 rounded bg-page" />
    <div className="mt-2 h-4 w-1/3 rounded bg-page" />
    <div className="mt-6 space-y-3">
      <div className="h-4 w-full rounded bg-page" />
      <div className="h-4 w-4/5 rounded bg-page" />
      <div className="h-4 w-3/5 rounded bg-page" />
    </div>
  </div>
);

const OffersGrid = ({
  items,
  isLoading,
  error,
  inactive,
  maps,
  actions,
  onCreate,
  hasSearch,
}: {
  items: OfferItem[];
  isLoading: boolean;
  error: Error | null;
  inactive: boolean;
  maps: NameMaps;
  actions: CardActions;
  onCreate?: () => void;
  hasSearch: boolean;
}) => {
  if (isLoading)
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );

  if (error)
    return (
      <div className="rounded-xl border border-border bg-surface px-4 py-16 text-center">
        <p className="text-base font-medium text-danger">{error.message}</p>
      </div>
    );

  if (items.length === 0)
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 py-16 text-center">
        <BadgePercent size={36} className="text-muted" />
        <p className="text-lg font-semibold text-heading">
          {hasSearch ? 'No offers match your search' : inactive ? 'No inactive offers' : 'No offers yet'}
        </p>
        <p className="text-base text-muted">
          {hasSearch ? 'Try a different title or code.' : inactive ? 'Deactivated offers will show up here.' : 'Create your first offer to start giving discounts.'}
        </p>
        {!inactive && !hasSearch && onCreate && (
          <div className="mt-3">
            <Button leftIcon={<Plus size={16} />} onClick={onCreate}>
              Add offer
            </Button>
          </div>
        )}
      </div>
    );

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((o) => (
        <OfferCard key={o._id} offer={o} inactive={inactive} maps={maps} actions={actions} />
      ))}
    </div>
  );
};

// Each tab owns its hook so the inactive endpoint is never called for roles that can't read it
type TabProps = { search: string; maps: NameMaps; actions: CardActions; onCreate?: () => void };

const ActiveTab = ({ search, maps, actions, onCreate }: TabProps) => {
  const { data = [], isLoading, error } = useGetOfferList();
  return (
    <OffersGrid
      items={filterOffers(data, search)}
      isLoading={isLoading}
      error={error as Error | null}
      inactive={false}
      maps={maps}
      actions={actions}
      onCreate={onCreate}
      hasSearch={!!search.trim()}
    />
  );
};

const InactiveTab = ({ search, maps, actions }: TabProps) => {
  const { data = [], isLoading, error } = useGetInactiveOfferList();
  return (
    <OffersGrid
      items={filterOffers(data, search)}
      isLoading={isLoading}
      error={error as Error | null}
      inactive
      maps={maps}
      actions={actions}
      hasSearch={!!search.trim()}
    />
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const OfferMain = () => {
  const { currentRole } = useAuthData();
  const role = currentRole as never;
  const canWrite = OFFER_WRITE_ROLES.includes(role);
  const canSeeInactive = OFFER_INACTIVE_READ_ROLES.includes(role);
  const canHardDelete = OFFER_HARD_DELETE_ROLES.includes(role);

  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  // Names for "applies to" and the category / item pickers
  const { data: categories = [] } = useGetMenuCategoryDropdown();
  const { data: menuItems = [] } = useGetMenuItemDropdown();
  const categoryOptions: Option[] = (categories as { _id: string; name: string }[]).map((c) => ({ label: c.name, value: c._id }));
  const itemOptions: Option[] = (menuItems as { _id: string; name: string }[]).map((i) => ({ label: i.name, value: i._id }));

  const maps: NameMaps = {
    categories: Object.fromEntries(categoryOptions.map((o) => [o.value, o.label])),
    items: Object.fromEntries(itemOptions.map((o) => [o.value, o.label])),
  };

  const { mutateAsync: createAsync, isPending: creating } = useCreateOffer();
  const { mutateAsync: updateAsync, isPending: updating } = useUpdateOffer();
  const { mutateAsync: softDeleteAsync, isPending: deactivating } = useSoftDeleteOffer();
  const { mutateAsync: restoreAsync } = useRestoreOffer();
  const { mutateAsync: hardDeleteAsync, isPending: hardDeleting } = useHardDeleteOffer();

  const closePanel = () => setPanel(null);
  const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

  const handleCreate = async (payload: OfferPayload) => {
    try {
      await createAsync(payload);
      toast.success('Offer created');
      closePanel();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to create offer'));
    }
  };

  const handleUpdate = async (offerId: string, payload: OfferPayload) => {
    try {
      await updateAsync({ offerId, data: payload });
      toast.success('Offer updated');
      closePanel();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to update offer'));
    }
  };

  const handleRestore = async (item: OfferItem) => {
    try {
      await restoreAsync(item._id);
      toast.success(`${item.title} restored`);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to restore offer'));
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const { kind, item } = confirm;
    try {
      if (kind === 'deactivate') {
        await softDeleteAsync(item._id);
        toast.success(`${item.title} deactivated`);
      } else {
        await hardDeleteAsync(item._id);
        toast.success(`${item.title} deleted permanently`);
      }
      setConfirm(null);
    } catch (e) {
      toast.error(errMsg(e, kind === 'deactivate' ? 'Failed to deactivate offer' : 'Failed to delete offer'));
    }
  };

  const actions: CardActions = {
    canWrite,
    canHardDelete,
    onView: (item) => setPanel({ type: 'view', id: item._id }),
    onEdit: (item) => setPanel({ type: 'edit', id: item._id }),
    onDeactivate: (item) => setConfirm({ kind: 'deactivate', item }),
    onRestore: handleRestore,
    onHardDelete: (item) => setConfirm({ kind: 'hard', item }),
  };

  const panelTitle = panel?.type === 'create' ? 'Add offer' : panel?.type === 'edit' ? 'Edit offer' : 'Offer details';
  const tabProps: TabProps = { search, maps, actions, onCreate: canWrite ? () => setPanel({ type: 'create' }) : undefined };

  return (
    <div className="flex w-full flex-col gap-5 p-4 md:p-6">
      {/* Header with search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <BadgePercent size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-heading">Offers</h1>
            <p className="text-sm text-muted">Create discounts and coupon codes for your menu</p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or code" />
          </div>
          {canWrite && (
            <Button leftIcon={<Plus size={16} />} onClick={() => setPanel({ type: 'create' })}>
              Add offer
            </Button>
          )}
        </div>
      </div>

      {canSeeInactive && (
        <div className="flex gap-1 border-b border-border">
          {(['active', 'inactive'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-5 py-2.5 text-base font-medium transition-colors ${
                tab === t ? 'border-primary font-semibold text-heading' : 'border-transparent text-muted hover:text-heading'
              }`}
            >
              {t === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      )}

      {tab === 'active' || !canSeeInactive ? <ActiveTab {...tabProps} /> : <InactiveTab {...tabProps} />}

      {/* Side panel */}
      <SideModal isOpen={!!panel} onClose={closePanel} title={panelTitle}>
        {panel?.type === 'create' && (
          <OfferForm
            isEdit={false}
            isPending={creating}
            categoryOptions={categoryOptions}
            itemOptions={itemOptions}
            onSubmit={handleCreate}
            onCancel={closePanel}
          />
        )}
        {panel?.type === 'edit' && (
          <EditPanel
            id={panel.id}
            isPending={updating}
            categoryOptions={categoryOptions}
            itemOptions={itemOptions}
            onSubmit={(payload) => handleUpdate(panel.id, payload)}
            onCancel={closePanel}
          />
        )}
        {panel?.type === 'view' && <ViewPanel id={panel.id} maps={maps} />}
      </SideModal>

      {confirm && (
        <ConfirmDialog
          confirm={confirm}
          isPending={deactivating || hardDeleting}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};

export default OfferMain;