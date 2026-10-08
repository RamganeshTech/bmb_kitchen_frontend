import { useState } from 'react';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import type { FormEvent, ReactNode } from 'react';
import {
    Boxes, Plus, Search, SlidersHorizontal, X,
    Pencil, Eye, PackagePlus, Power, RotateCcw, Trash2, AlertTriangle,
    MoreVertical,
    type LucideIcon,
} from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
// import { Card } from '../../components/ui/Card';
// import { Dropdown } from '../../components/ui/Dropdown';
import { useAuthData } from '../../hooks/useAuthData';
import {
    INVENTORY_INACTIVE_READ_ROLES, INVENTORY_WRITE_ROLES,INVENTORY_ADJUST_ROLES,
    INVENTORY_HARD_DELETE_ROLES, useGetInventoryList, useGetInactiveInventoryList,
    useGetInventoryById, useCreateInventory, useUpdateInventory,
    useAdjustInventoryStock,
    useSoftDeleteInventory,
    useRestoreInventory,
    useHardDeleteInventory,
} from '../../api_service/inventory_api/inventoryApi';
import type { InventoryItem, InventoryPayload } from '../../api_service/inventory_api/inventoryApi';
import useDebounce from '../../hooks/useDebounce';
import { SideModal } from '../../components/ui/SideModal';
import { useGetVendorDropdown } from '../../api_service/vendor_api/vendorApi';
import { SearchSelect } from '../../components/ui/SearchSelect';
import InfoTooltip from '../../components/ui/InfoTooltip';
import { Dropdown } from '../../components/ui/Dropdown';



// ── Constants & helpers ──────────────────────────────────────────────────────
export const UNIT_OPTIONS = ['kg', 'g', 'l', 'ml', 'pcs', 'packet', 'box', 'dozen'].map((u) => ({ label: u, value: u }));

const STOCK_OPTIONS = [
    { label: 'All items', value: 'all' },
    { label: 'Low or out of stock', value: 'low' },
    { label: 'Out of stock only', value: 'out' },
];

type StockFilter = 'all' | 'low' | 'out';
type Tab = 'active' | 'inactive';
type Panel =
    | { type: 'create' }
    | { type: 'view'; id: string }
    | { type: 'edit'; id: string }
    | { type: 'adjust'; item: InventoryItem }
    | null;
type Confirm = { kind: 'deactivate' | 'hard'; item: InventoryItem } | null;
type VendorRow = { _id: string; vendorName: string };

const inr = (n: number | undefined) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const num = (n: number | undefined) => (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

// The API populates vendorId with { _id, vendorName }; the hook type still says string.
const getVendor = (item: InventoryItem) => {
    const v = item.vendorId as unknown as VendorRow | string | null | undefined;
    if (!v) return { id: '', name: '' };
    return typeof v === 'string' ? { id: v, name: '' } : { id: v._id, name: v.vendorName };
};

const stockStatus = (item: InventoryItem): 'out' | 'low' | 'ok' => {
    if ((item.inStock ?? 0) <= 0) return 'out';
    if ((item.inStock ?? 0) <= (item.minLevel ?? 0)) return 'low';
    return 'ok';
};

const StockBadge = ({ item }: { item: InventoryItem }) => {
    const s = stockStatus(item);
    const styles = {
        out: 'bg-danger-soft text-danger',
        low: 'bg-warning-soft text-warning',
        ok: 'bg-success-soft text-success',
    }[s];
    const label = { out: 'Out of stock', low: 'Low stock', ok: 'In stock' }[s];
    return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium ${styles}`}>{label}</span>;
};

// ── Small building blocks ────────────────────────────────────────────────────
const Field = ({ label, hint, error, children }: { label?: string; hint?: ReactNode; error?: string; children: ReactNode }) => (
    <div className="flex flex-col gap-1.5">
        {label && (
            <div className="flex items-center gap-1.5">
                <Label>{label}</Label>
                {hint}
            </div>
        )}
        {children}
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
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface transition-colors ${danger ? 'text-danger hover:bg-danger-soft' : 'text-body hover:bg-surface-hover hover:text-heading'
            }`}
    >
        {children}
    </button>
);

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
                        <h3 className="text-lg font-semibold text-heading">{hard ? 'Delete permanently?' : 'Deactivate item?'}</h3>
                        <p className="mt-1 text-base text-body">
                            {hard
                                ? `"${confirm.item.material}" will be removed for good. This cannot be undone.`
                                : `"${confirm.item.material}" will move to the Inactive tab. You can restore it any time.`}
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

// ── Create / Edit form ───────────────────────────────────────────────────────
interface FormState {
    material: string;
    category: string;
    unit: string;
    rate: string;
    inStock: string;
    minLevel: string;
    vendorId: string;
}

const InventoryForm = ({
    initial,
    isEdit,
    isPending,
    categories,
    vendorOptions,
    onSubmit,
    onCancel,
}: {
    initial?: InventoryItem;
    isEdit: boolean;
    isPending: boolean;
    categories: string[];
    vendorOptions: { label: string; value: string }[];
    onSubmit: (payload: InventoryPayload) => Promise<void>;
    onCancel: () => void;
}) => {
    const [form, setForm] = useState<FormState>({
        material: initial?.material ?? '',
        category: initial?.category ?? '',
        unit: initial?.unit ?? '',
        rate: initial ? String(initial.rate) : '',
        inStock: initial ? String(initial.inStock ?? 0) : '0',
        minLevel: initial ? String(initial.minLevel ?? 0) : '0',
        vendorId: initial ? getVendor(initial).id : '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

    const set = (key: keyof FormState) => (value: string) => {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: undefined }));
    };

    const validate = () => {
        const e: Partial<Record<keyof FormState, string>> = {};
        if (!form.material.trim()) e.material = 'Material name is required';
        if (!form.unit) e.unit = 'Choose a unit';
        if (form.rate === '' || Number(form.rate) < 0) e.rate = 'Enter a valid rate';
        if (Number(form.inStock) < 0) e.inStock = 'Cannot be negative';
        if (Number(form.minLevel) < 0) e.minLevel = 'Cannot be negative';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev: FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        const payload: InventoryPayload = {
            material: form.material.trim(),
            category: form.category.trim(),
            unit: form.unit,
            rate: Number(form.rate),
            inStock: Number(form.inStock || 0),
            minLevel: Number(form.minLevel || 0),
        };
        if (form.vendorId) payload.vendorId = form.vendorId;
        // Clearing an existing vendor needs an explicit null
        else if (isEdit && initial && getVendor(initial).id) (payload as Record<string, unknown>).vendorId = null;
        await onSubmit(payload);
    };

    const minLevelNum = Number(form.minLevel);
    const stockNum = Number(form.inStock);
    const startsLow = form.minLevel !== '' && minLevelNum > 0 && minLevelNum >= stockNum;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Field label="Material *" error={errors.material}>
                <Input value={form.material} onChange={(e) => set('material')(e.target.value)} placeholder="e.g. Basmati rice" />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Category">
                    <Input
                        list="inventory-categories"
                        value={form.category}
                        onChange={(e) => set('category')(e.target.value)}
                        placeholder="Type or pick a category"
                    />
                    <datalist id="inventory-categories">
                        {categories.map((c) => (
                            <option key={c} value={c} />
                        ))}
                    </datalist>
                </Field>
               
                <Field error={errors.unit}>
                    <SearchSelect
                        label="Unit *"
                        options={UNIT_OPTIONS}
                        value={form.unit}
                        placeholder="Select a unit"
                        onChange={(o) => set('unit')(String(o.value))}
                        onClear={() => set('unit')('')}
                    />
                </Field>
            </div>

            <Field label="Rate (₹ per unit) *" error={errors.rate}>
                <Input type="number" min={0} step="any" value={form.rate} onChange={(e) => set('rate')(e.target.value)} />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                    label={isEdit ? 'In stock' : 'Opening stock'}
                    error={errors.inStock}
                    hint={
                        <InfoTooltip
                            position="left"
                            title="In stock"
                            description="The quantity you currently have on hand. To record a purchase, wastage or recount later, use Adjust stock so the change is logged with a reason."
                              popupClassName="!top-full !bottom-auto !left-0 !right-auto mt-2 w-64 translate-x-0! translate-y-0!"
                        />
                    }
                >
                    <Input type="number" min={0} step="any" value={form.inStock} onChange={(e) => set('inStock')(e.target.value)} />
                </Field>
                <Field
                    label="Min level"
                    error={errors.minLevel}
                    hint={
                        <InfoTooltip
                            position="left"
                            title="Min level"
                            description="Your low-stock alert level. When the quantity in stock falls to this number or below, the item is flagged as Low stock so you can reorder in time. Keep it below your normal stock."
                        />
                    }
                >
                    <Input type="number" min={0} step="any" value={form.minLevel} onChange={(e) => set('minLevel')(e.target.value)} />
                </Field>
            </div>

            {startsLow && (
                <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-sm text-warning">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    Min level is at or above the stock quantity, so this item will show as Low stock right away.
                </p>
            )}

            <Field>
                <SearchSelect
                    label="Vendor"
                    options={vendorOptions}
                    value={form.vendorId}
                    placeholder="Select a vendor"
                    onChange={(o) => set('vendorId')(String(o.value))}
                    onClear={() => set('vendorId')('')}
                />
            </Field>

            <div className="flex justify-end gap-2 border-t border-border pt-5">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                    Cancel
                </Button>
                <Button type="submit" isLoading={isPending} loadingText={isEdit ? 'Saving...' : 'Creating...'}>
                    {isEdit ? 'Save changes' : 'Create item'}
                </Button>
            </div>
        </form>
    );
};

// ── Adjust stock form ────────────────────────────────────────────────────────
const AdjustForm = ({
    item,
    isPending,
    onSubmit,
    onCancel,
}: {
    item: InventoryItem;
    isPending: boolean;
    onSubmit: (action: 'add' | 'remove', quantity: number, reason: string) => Promise<void>;
    onCancel: () => void;
}) => {
    const [action, setAction] = useState<'add' | 'remove'>('add');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (ev: FormEvent) => {
        ev.preventDefault();
        const q = Number(quantity);
        if (!q || q <= 0) return setError('Enter a quantity greater than 0');
        if (action === 'remove' && q > (item.inStock ?? 0)) return setError(`Only ${num(item.inStock)} ${item.unit} in stock`);
        setError('');
        await onSubmit(action, q, reason.trim());
    };

    const after = (item.inStock ?? 0) + (action === 'add' ? 1 : -1) * (Number(quantity) || 0);

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="rounded-lg border border-border bg-page p-4">
                <p className="text-base font-semibold text-heading">{item.material}</p>
                <p className="text-base text-muted">
                    Current stock: {num(item.inStock)} {item.unit}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {(['add', 'remove'] as const).map((a) => (
                    <button
                        key={a}
                        type="button"
                        onClick={() => setAction(a)}
                        className={`rounded-lg border px-3 py-2.5 text-base font-medium transition-colors ${action === a ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-heading hover:bg-surface-hover'
                            }`}
                    >
                        {a === 'add' ? 'Add stock' : 'Remove stock'}
                    </button>
                ))}
            </div>

            <Field label={`Quantity (${item.unit}) *`} error={error}>
                <Input type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </Field>
            <Field label="Reason">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Spoilage, recount, received" />
            </Field>

            {Number(quantity) > 0 && (
                <p className="text-base text-body">
                    New stock:{' '}
                    <span className="font-semibold text-heading">
                        {num(Math.max(after, 0))} {item.unit}
                    </span>
                </p>
            )}

            <div className="flex justify-end gap-2 border-t border-border pt-5">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                    Cancel
                </Button>
                <Button type="submit" isLoading={isPending} loadingText="Updating...">
                    Update stock
                </Button>
            </div>
        </form>
    );
};

// ── Panels that load a single item ───────────────────────────────────────────
const PanelMessage = ({ text, error }: { text: string; error?: boolean }) => (
    <p className={`py-10 text-center text-base ${error ? 'text-danger' : 'text-muted'}`}>{text}</p>
);

const ViewPanel = ({ id }: { id: string }) => {
    const { data: item, isLoading, error } = useGetInventoryById(id);
    if (isLoading) return <PanelMessage text="Loading item..." />;
    if (error || !item) return <PanelMessage error text={(error as Error)?.message || 'Item not found'} />;
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-sm text-muted">{item.inventoryNo as string}</p>
                    <h3 className="text-xl font-semibold text-heading">{item.material}</h3>
                </div>
                <StockBadge item={item} />
            </div>
            <div>
                <Detail label="Category" value={item.category} />
                <Detail label="Unit" value={item.unit} />
                <Detail label="In stock" value={`${num(item.inStock)} ${item.unit}`} />
                <Detail label="Min level" value={`${num(item.minLevel)} ${item.unit}`} />
                <Detail label="Rate" value={`${inr(item.rate)} / ${item.unit}`} />
                <Detail label="Stock value" value={inr(item.value as number)} />
                <Detail label="Vendor" value={getVendor(item).name} />
                <Detail label="Status" value={item.isActive === false ? 'Inactive' : 'Active'} />
                <Detail label="Last updated" value={new Date(item.updatedAt).toLocaleString('en-IN')} />
            </div>
        </div>
    );
};

const EditPanel = ({
    id,
    isPending,
    categories,
    vendorOptions,
    onSubmit,
    onCancel,
}: {
    id: string;
    isPending: boolean;
    categories: string[];
    vendorOptions: { label: string; value: string }[];
    onSubmit: (payload: InventoryPayload) => Promise<void>;
    onCancel: () => void;
}) => {
    const { data: item, isLoading, error } = useGetInventoryById(id);
    if (isLoading) return <PanelMessage text="Loading item..." />;
    if (error || !item) return <PanelMessage error text={(error as Error)?.message || 'Item not found'} />;
    return (
        <InventoryForm
            key={item._id}
            initial={item}
            isEdit
            isPending={isPending}
            categories={categories}
            vendorOptions={vendorOptions}
            onSubmit={onSubmit}
            onCancel={onCancel}
        />
    );
};

// ── List rendering (shared by both tabs) ─────────────────────────────────────
interface RowActions {
    canWrite: boolean;
    canAdjust: boolean;
    canHardDelete: boolean;
    onView: (item: InventoryItem) => void;
    onEdit: (item: InventoryItem) => void;
    onAdjust: (item: InventoryItem) => void;
    onDeactivate: (item: InventoryItem) => void;
    onRestore: (item: InventoryItem) => void;
    onHardDelete: (item: InventoryItem) => void;
}

// const ActionButtons = ({ item, inactive, a }: { item: InventoryItem; inactive: boolean; a: RowActions }) => (
//   <div className="flex items-center gap-1.5">
//     <IconAction label="View details" onClick={() => a.onView(item)}>
//       <Eye size={18} />
//     </IconAction>
//     {!inactive && a.canWrite && (
//       <IconAction label="Edit item" onClick={() => a.onEdit(item)}>
//         <Pencil size={18} />
//       </IconAction>
//     )}
//     {!inactive && a.canAdjust && (
//       <IconAction label="Adjust stock" onClick={() => a.onAdjust(item)}>
//         <PackagePlus size={18} />
//       </IconAction>
//     )}
//     {!inactive && a.canWrite && (
//       <IconAction danger label="Deactivate item" onClick={() => a.onDeactivate(item)}>
//         <Power size={18} />
//       </IconAction>
//     )}
//     {inactive && a.canWrite && (
//       <IconAction label="Restore item" onClick={() => a.onRestore(item)}>
//         <RotateCcw size={18} />
//       </IconAction>
//     )}
//     {inactive && a.canHardDelete && (
//       <IconAction danger label="Delete permanently" onClick={() => a.onHardDelete(item)}>
//         <Trash2 size={18} />
//       </IconAction>
//     )}
//   </div>
// );



type ActionDef = { label: string; icon: LucideIcon; onClick: () => void; isDanger?: boolean };

const ActionButtons = ({ item, inactive, a }: { item: InventoryItem; inactive: boolean; a: RowActions }) => {
    const view: ActionDef = { label: 'View details', icon: Eye, onClick: () => a.onView(item) };

    const rest: ActionDef[] = [];
    if (!inactive && a.canWrite) rest.push({ label: 'Edit item', icon: Pencil, onClick: () => a.onEdit(item) });
    if (!inactive && a.canAdjust) rest.push({ label: 'Adjust stock', icon: PackagePlus, onClick: () => a.onAdjust(item) });
    if (!inactive && a.canWrite) rest.push({ label: 'Deactivate item', icon: Power, onClick: () => a.onDeactivate(item), isDanger: true });
    if (inactive && a.canWrite) rest.push({ label: 'Restore item', icon: RotateCcw, onClick: () => a.onRestore(item) });
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

const ListContent = ({
    items,
    isLoading,
    error,
    inactive,
    actions,
}: {
    items: InventoryItem[];
    isLoading: boolean;
    error: Error | null;
    inactive: boolean;
    actions: RowActions;
}) => {
    const fallback = isLoading
        ? { text: 'Loading inventory...', sub: '', danger: false }
        : error
            ? { text: error.message, sub: '', danger: true }
            : items.length === 0
                ? {
                    text: inactive ? 'No inactive items' : 'No inventory items found',
                    sub: inactive ? 'Deactivated items will show up here.' : 'Add an item or adjust your filters.',
                    danger: false,
                }
                : null;

    return (
        <>
            {/* Desktop table (heading always visible) */}
            <TableContainer
                className="rounded-none border-0 shadow-none !min-h-[300px] "
                ariaLabel={inactive ? 'Inactive inventory items' : 'Active inventory items'}
                caption={inactive ? 'List of inactive inventory items' : 'List of active inventory items'}
            >
                <THead className="text-sm">
                    <tr>
                        <Th>S.No</Th>  
                        <Th>Material</Th>
                        <Th>Category</Th>
                        <Th className="text-right">In stock</Th>
                        <Th className="hidden text-right xl:table-cell">Min level</Th>
                        <Th className="text-right">Rate</Th>
                        <Th className="text-right">Value</Th>
                        <Th className="hidden xl:table-cell">Vendor</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                    </tr>
                </THead>
                <TBody>
                    {fallback ? (
                        <Tr>
                            <Td colSpan={10} className="py-16 text-center">
                                {!fallback.danger && !isLoading && <Boxes size={32} className="mx-auto mb-2 text-muted" />}
                                <p className={`text-base font-medium ${fallback.danger ? 'text-danger' : 'text-heading'}`}>{fallback.text}</p>
                                {fallback.sub && <p className="mt-1 text-base text-muted">{fallback.sub}</p>}
                            </Td>
                        </Tr>
                    ) : (
                        items.map((item, idx) => (
                            <Tr key={item._id} onClick={() => actions.onView(item)} ariaLabel={`View item: ${item.material}`}>
                                <Td className="text-base text-center">{idx + 1}</Td>  

                                <Td className="text-base">
                                    <p className="font-medium text-heading">{item.material}</p>
                                    <p className="text-sm text-muted">{item.inventoryNo as string}</p>
                                </Td>
                                <Td className="text-base">{item.category || '—'}</Td>
                                <Td className="text-right text-base text-heading">
                                    {num(item.inStock)} <span className="text-muted">{item.unit}</span>
                                </Td>
                                <Td className="hidden text-right text-base xl:table-cell">{num(item.minLevel)}</Td>
                                <Td className="text-right text-base">{inr(item.rate)}</Td>
                                <Td className="text-right text-base text-heading">{inr(item.value as number)}</Td>
                                <Td className="hidden text-base xl:table-cell">{getVendor(item).name || '—'}</Td>
                                <Td>
                                    {inactive ? (
                                        <span className="inline-flex rounded-full bg-page px-2.5 py-1 text-sm font-medium text-muted">Inactive</span>
                                    ) : (
                                        <StockBadge item={item} />
                                    )}
                                </Td>
                                <Td>
                                    {/* Keep clicks and keys on action buttons from also opening the row */}
                                    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                        <ActionButtons item={item} inactive={inactive} a={actions} />
                                    </div>
                                </Td>
                            </Tr>
                        ))
                    )}
                </TBody>
            </TableContainer>
        </>
    );
};

// Each tab owns its hook so the inactive endpoint is never called for roles that can't read it
type TabProps = {
    params: Record<string, string>;
    stockFilter: StockFilter;
    actions: RowActions;
};

const ActiveTab = ({ params, stockFilter, actions }: TabProps) => {
    const { data = [], isLoading, error } = useGetInventoryList(params);
    const lowCount = data.filter((i) => stockStatus(i) !== 'ok').length;
    const totalValue = data.reduce((sum, i) => sum + ((i.value as number) || 0), 0);
    const items = data.filter((i) => (stockFilter === 'all' ? true : stockFilter === 'out' ? stockStatus(i) === 'out' : stockStatus(i) !== 'ok'));

    return (
        <>
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                {[
                    { label: 'Items', value: String(data.length) },
                    { label: 'Low / out of stock', value: String(lowCount) },
                    { label: 'Stock value', value: inr(totalValue) },
                ].map((s) => (
                    <div key={s.label} className="px-4 py-3.5">
                        <p className="text-sm text-muted">{s.label}</p>
                        <p className="truncate text-lg font-semibold text-heading sm:text-xl">{s.value}</p>
                    </div>
                ))}
            </div>
            <ListContent items={items} isLoading={isLoading} error={error as Error | null} inactive={false} actions={actions} />
        </>
    );
};

const InactiveTab = ({ params, actions }: TabProps) => {
    const { data = [], isLoading, error } = useGetInactiveInventoryList(params);
    return <ListContent items={data} isLoading={isLoading} error={error as Error | null} inactive actions={actions} />;
};

// ── Main page ────────────────────────────────────────────────────────────────
const InventoryMain = () => {
    const { currentRole } = useAuthData();
    const role = currentRole as never;
    const canWrite = INVENTORY_WRITE_ROLES.includes(role);
    const canAdjust = INVENTORY_ADJUST_ROLES.includes(role);
    const canSeeInactive = INVENTORY_INACTIVE_READ_ROLES.includes(role);
    const canHardDelete = INVENTORY_HARD_DELETE_ROLES.includes(role);

    const [tab, setTab] = useState<Tab>('active');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [stockFilter, setStockFilter] = useState<StockFilter>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [panel, setPanel] = useState<Panel>(null);
    const [confirm, setConfirm] = useState<Confirm>(null);

    const debouncedSearch = useDebounce(search, 400);

    const params: Record<string, string> = {};
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (category) params.category = category;
    if (vendorId) params.vendorId = vendorId;

    const { data: vendors = [] } = useGetVendorDropdown();
    const vendorOptions = (vendors as VendorRow[]).map((v) => ({ label: v.vendorName, value: v._id }));

    // Unfiltered list feeds the category options
    const { data: allItems = [] } = useGetInventoryList();
    const categories = [...new Set(allItems.map((i) => i.category).filter(Boolean))] as string[];
    const categoryOptions = categories.map((c) => ({ label: c, value: c }));

    const { mutateAsync: createAsync, isPending: creating } = useCreateInventory();
    const { mutateAsync: updateAsync, isPending: updating } = useUpdateInventory();
    const { mutateAsync: adjustAsync, isPending: adjusting } = useAdjustInventoryStock();
    const { mutateAsync: softDeleteAsync, isPending: deactivating } = useSoftDeleteInventory();
    const { mutateAsync: restoreAsync } = useRestoreInventory();
    const { mutateAsync: hardDeleteAsync, isPending: hardDeleting } = useHardDeleteInventory();

    const closePanel = () => setPanel(null);
    const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

    const handleCreate = async (payload: InventoryPayload) => {
        try {
            await createAsync(payload);
            toast.success('Inventory item created');
            closePanel();
        } catch (e) {
            toast.error(errMsg(e, 'Failed to create item'));
        }
    };

    const handleUpdate = async (inventoryId: string, payload: InventoryPayload) => {
        try {
            await updateAsync({ inventoryId, data: payload });
            toast.success('Inventory item updated');
            closePanel();
        } catch (e) {
            toast.error(errMsg(e, 'Failed to update item'));
        }
    };

    const handleAdjust = async (item: InventoryItem, action: 'add' | 'remove', quantity: number, reason: string) => {
        try {
            await adjustAsync({ inventoryId: item._id, action, quantity, reason: reason || undefined });
            toast.success(`Stock ${action === 'add' ? 'added' : 'removed'} successfully`);
            closePanel();
        } catch (e) {
            toast.error(errMsg(e, 'Failed to adjust stock'));
        }
    };

    const handleRestore = async (item: InventoryItem) => {
        try {
            await restoreAsync(item._id);
            toast.success(`${item.material} restored`);
        } catch (e) {
            toast.error(errMsg(e, 'Failed to restore item'));
        }
    };

    const handleConfirm = async () => {
        if (!confirm) return;
        const { kind, item } = confirm;
        try {
            if (kind === 'deactivate') {
                await softDeleteAsync(item._id);
                toast.success(`${item.material} deactivated`);
            } else {
                await hardDeleteAsync(item._id);
                toast.success(`${item.material} deleted permanently`);
            }
            setConfirm(null);
        } catch (e) {
            toast.error(errMsg(e, kind === 'deactivate' ? 'Failed to deactivate item' : 'Failed to delete item'));
        }
    };

    const actions: RowActions = {
        canWrite,
        canAdjust,
        canHardDelete,
        onView: (item) => setPanel({ type: 'view', id: item._id }),
        onEdit: (item) => setPanel({ type: 'edit', id: item._id }),
        onAdjust: (item) => setPanel({ type: 'adjust', item }),
        onDeactivate: (item) => setConfirm({ kind: 'deactivate', item }),
        onRestore: handleRestore,
        onHardDelete: (item) => setConfirm({ kind: 'hard', item }),
    };

    const activeFilters = [category, vendorId, stockFilter !== 'all' ? stockFilter : ''].filter(Boolean).length;
    const clearFilters = () => {
        setSearch('');
        setCategory('');
        setVendorId('');
        setStockFilter('all');
    };

    const panelTitle =
        panel?.type === 'create' ? 'Add inventory item' : panel?.type === 'edit' ? 'Edit inventory item' : panel?.type === 'adjust' ? 'Adjust stock' : 'Item details';

    const tabProps: TabProps = { params, stockFilter, actions };

    return (
        <div className="flex w-full flex-col gap-5 p-2">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Boxes size={20} />
                    </span>
                    <div>
                        <h1 className="text-2xl font-semibold text-heading">Inventory</h1>
                        <p className="text-sm text-muted">Track raw materials, stock levels and value</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="lg:hidden" leftIcon={<SlidersHorizontal size={16} />} onClick={() => setShowFilters(true)}>
                        Filters{activeFilters ? ` (${activeFilters})` : ''}
                    </Button>
                    {canWrite && (
                        <Button leftIcon={<Plus size={16} />} onClick={() => setPanel({ type: 'create' })}>
                            Add item
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                {/* Filters: 30% on desktop, slide-in drawer on mobile */}
                {showFilters && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setShowFilters(false)} />}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 w-[85%] overflow-y-auto bg-page p-4 shadow-xl transition-transform duration-200 sm:w-96 lg:static lg:z-auto lg:w-[23%] lg:translate-x-0 lg:bg-transparent lg:p-0 lg:shadow-none ${showFilters ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    <div className="flex flex-col gap-5 rounded-xl border border-border bg-page p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-heading">Filters</h2>
                            <div className="flex items-center gap-3">
                                {(activeFilters > 0 || search) && (
                                    <button type="button" onClick={clearFilters} className="text-sm font-medium text-primary hover:text-primary-hover">
                                        Clear all
                                    </button>
                                )}
                                <button type="button" aria-label="Close filters" className="text-muted lg:hidden" onClick={() => setShowFilters(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <Field label="Search">
                            <div className="relative">
                                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                <Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Material name" />
                            </div>
                        </Field>
                        <SearchSelect
                            label="Category"
                            options={categoryOptions}
                            value={category}
                            placeholder="All categories"
                            onChange={(o) => setCategory(String(o.value))}
                            onClear={() => setCategory('')}
                        />
                        <SearchSelect
                            label="Vendor"
                            options={vendorOptions}
                            value={vendorId}
                            placeholder="All vendors"
                            onChange={(o) => setVendorId(String(o.value))}
                            onClear={() => setVendorId('')}
                        />
                        {tab === 'active' && (
                            <SearchSelect
                                label="Stock level"
                                options={STOCK_OPTIONS}
                                value={stockFilter}
                                placeholder="All items"
                                onChange={(o) => setStockFilter(o.value as StockFilter)}
                                onClear={() => setStockFilter('all')}
                            />
                        )}
                        <div className="lg:hidden">
                            <Button fullWidth onClick={() => setShowFilters(false)}>
                                Show results
                            </Button>
                        </div>
                    </div>
                </aside>

                {/* Table area: 70% on desktop */}
                <section className="min-w-0 flex-1 lg:w-[70%]">
                    <div className="overflow-hidden rounded-xl border border-border bg-surface">
                        {canSeeInactive && (
                            <div className="flex gap-1 border-b border-border px-3 pt-2">
                                {(['active', 'inactive'] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setTab(t)}
                                        className={`-mb-px border-b-2 px-5 py-2.5 text-base font-medium transition-colors ${tab === t ? 'border-primary font-semibold text-heading' : 'border-transparent text-muted hover:text-heading'
                                            }`}
                                    >
                                        {t === 'active' ? 'Active' : 'Inactive'}
                                    </button>
                                ))}
                            </div>
                        )}
                        {tab === 'active' || !canSeeInactive ? <ActiveTab {...tabProps} /> : <InactiveTab {...tabProps} />}
                    </div>
                </section>
            </div>

            {/* Side panel */}
            <SideModal isOpen={!!panel} onClose={closePanel} title={panelTitle}>
                {panel?.type === 'create' && (
                    <InventoryForm
                        isEdit={false}
                        isPending={creating}
                        categories={categories}
                        vendorOptions={vendorOptions}
                        onSubmit={handleCreate}
                        onCancel={closePanel}
                    />
                )}
                {panel?.type === 'edit' && (
                    <EditPanel
                        id={panel.id}
                        isPending={updating}
                        categories={categories}
                        vendorOptions={vendorOptions}
                        onSubmit={(payload) => handleUpdate(panel.id, payload)}
                        onCancel={closePanel}
                    />
                )}
                {panel?.type === 'view' && <ViewPanel id={panel.id} />}
                {panel?.type === 'adjust' && (
                    <AdjustForm
                        item={panel.item}
                        isPending={adjusting}
                        onSubmit={(action, quantity, reason) => handleAdjust(panel.item, action, quantity, reason)}
                        onCancel={closePanel}
                    />
                )}
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

export default InventoryMain;



