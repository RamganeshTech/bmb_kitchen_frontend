import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    PackageMinus,
    Plus,
    Search,
    SlidersHorizontal,
    X,
    Pencil,
    Eye,
    Power,
    RotateCcw,
    Trash2,
    MoreVertical,
    AlertTriangle,
    Info,
} from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { Dropdown } from '../../components/ui/Dropdown';
import { SideModal } from '../../components/ui/SideModal';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import { useAuthData } from '../../hooks/useAuthData';
import {
    WASTAGE_ADJUSTMENT_INACTIVE_READ_ROLES,
    WASTAGE_ADJUSTMENT_CREATE_ROLES,
    WASTAGE_ADJUSTMENT_WRITE_ROLES,
    WASTAGE_ADJUSTMENT_HARD_DELETE_ROLES,
    useGetWastageAdjustmentList,
    useGetInactiveWastageAdjustmentList,
    useGetWastageAdjustmentById,
    useCreateWastageAdjustment,
    useUpdateWastageAdjustment,
    useSoftDeleteWastageAdjustment,
    useRestoreWastageAdjustment,
    useHardDeleteWastageAdjustment,
} from '../../api_service/wasteAdjustment_api/wasteAdjustmentApi';
import type {
    WastageAdjustmentItem,
    WastageAdjustmentType,
    CreateWastageAdjustmentPayload,
    UpdateWastageAdjustmentPayload,
} from '../../api_service/wasteAdjustment_api/wasteAdjustmentApi';
import { useGetInventoryList, type InventoryItem } from '../../api_service/inventory_api/inventoryApi';

// ── Types & helpers ──────────────────────────────────────────────────────────
// The hook type is missing a few fields the backend stores on each entry
type Log = WastageAdjustmentItem & { wastageNo?: string; action?: 'add' | 'remove'; unit?: string };
type InvRef = { _id: string; material?: string; unit?: string };
type Tab = 'active' | 'inactive';
type Panel = { type: 'create' } | { type: 'view'; id: string } | { type: 'edit'; id: string } | null;
type Confirm = { kind: 'deactivate' | 'hard'; item: Log } | null;

const TYPE_OPTIONS = [
    { label: 'Wastage', value: 'wastage' },
    { label: 'Adjustment', value: 'adjustment' },
];

const num = (n: number | undefined) => (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const fmtDate = (d: string) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

// inventoryId may come back populated ({ _id, material }) or as a plain id: handle both
const resolveItem = (log: Log, inventory: InventoryItem[]) => {
    const ref = log.inventoryId as unknown as InvRef | string | null;
    const id = !ref ? '' : typeof ref === 'string' ? ref : ref._id;
    const found = inventory.find((i) => i._id === id);
    const name = (ref && typeof ref !== 'string' && ref.material) || found?.material || '';
    const unit = log.unit || (ref && typeof ref !== 'string' && ref.unit) || found?.unit || '';
    return { id, name, unit };
};

const signOf = (log: Log) => (log.type === 'adjustment' && log.action === 'add' ? '+' : '−');

// The list hooks are used without query params here, so filtering runs on the client
const filterLogs = (list: Log[], inventory: InventoryItem[], search: string, type: string, inventoryId: string) => {
    const q = search.trim().toLowerCase();
    return list.filter((l) => {
        if (type && l.type !== type) return false;
        const item = resolveItem(l, inventory);
        if (inventoryId && item.id !== inventoryId) return false;
        if (!q) return true;
        return [item.name, l.wastageNo, l.reason].some((f) => String(f ?? '').toLowerCase().includes(q));
    });
};

const TypeBadge = ({ type }: { type: WastageAdjustmentType }) => (
    <span
        className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium ${type === 'wastage' ? 'bg-danger-soft text-danger' : 'bg-info-soft text-info'
            }`}
    >
        {type === 'wastage' ? 'Wastage' : 'Adjustment'}
    </span>
);

// ── Small building blocks ────────────────────────────────────────────────────
const Field = ({ label, hint, error, children }: { label?: string; hint?: string; error?: string; children: ReactNode }) => (
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
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface transition-colors ${danger ? 'text-danger hover:bg-danger-soft' : 'text-body hover:bg-surface-hover hover:text-heading'
            }`}
    >
        {children}
    </button>
);

const ConfirmDialog = ({
    confirm,
    itemName,
    isPending,
    onCancel,
    onConfirm,
}: {
    confirm: NonNullable<Confirm>;
    itemName: string;
    isPending: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) => {
    const hard = confirm.kind === 'hard';
    const label = `${confirm.item.wastageNo || 'This entry'}${itemName ? ` (${itemName})` : ''}`;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full rounded-xl border border-border bg-surface p-6 shadow-xl sm:w-[440px]">
                <div className="flex items-start gap-3">
                    <span className="rounded-full bg-danger-soft p-2 text-danger">
                        <AlertTriangle size={20} />
                    </span>
                    <div>
                        <h3 className="text-lg font-semibold text-heading">{hard ? 'Delete permanently?' : 'Deactivate entry?'}</h3>
                        <p className="mt-1 text-base text-body">
                            {hard
                                ? `${label} will be removed for good. This cannot be undone.`
                                : `${label} will move to the Inactive tab. You can restore it any time.`}
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

// ── Create form ──────────────────────────────────────────────────────────────
const CreateForm = ({
    inventory,
    isPending,
    onSubmit,
    onCancel,
}: {
    inventory: InventoryItem[];
    isPending: boolean;
    onSubmit: (payload: CreateWastageAdjustmentPayload) => Promise<void>;
    onCancel: () => void;
}) => {
    const [inventoryId, setInventoryId] = useState('');
    const [type, setType] = useState<WastageAdjustmentType | ''>('wastage');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<{ inventoryId?: string; type?: string; quantity?: string }>({});

    const selected = inventory.find((i) => i._id === inventoryId);
    const inventoryOptions = inventory.map((i) => ({ label: `${i.material} (${num(i.inStock)} ${i.unit})`, value: i._id }));

    const validate = () => {
        const e: typeof errors = {};
        const q = Number(quantity);
        if (!inventoryId) e.inventoryId = 'Choose an inventory item';
        if (!type) e.type = 'Choose a type';
        if (!q || q <= 0) e.quantity = 'Enter a quantity greater than 0';
        else if (selected && q > (selected.inStock ?? 0)) e.quantity = `Only ${num(selected.inStock)} ${selected.unit} in stock`;
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev: FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        const payload: CreateWastageAdjustmentPayload = {
            inventoryId,
            type: type as WastageAdjustmentType,
            quantity: Number(quantity),
        };
        if (reason.trim()) payload.reason = reason.trim();
        await onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Field error={errors.inventoryId}>
                <SearchSelect
                    label="Inventory item *"
                    options={inventoryOptions}
                    value={inventoryId}
                    placeholder="Select an item"
                    onChange={(o) => {
                        setInventoryId(String(o.value));
                        setErrors((e) => ({ ...e, inventoryId: undefined, quantity: undefined }));
                    }}
                    onClear={() => setInventoryId('')}
                />
            </Field>

            <Field error={errors.type} hint="Wastage is spoiled, expired or spilled stock. Adjustment is a manual correction after a recount.">
                <SearchSelect
                    label="Type *"
                    options={TYPE_OPTIONS}
                    value={type}
                    placeholder="Select a type"
                    onChange={(o) => {
                        setType(o.value as WastageAdjustmentType);
                        setErrors((e) => ({ ...e, type: undefined }));
                    }}
                    onClear={() => setType('')}
                />
            </Field>

            <Field
                label={`Quantity${selected ? ` (${selected.unit})` : ''} *`}
                error={errors.quantity}
                hint={selected ? `Available: ${num(selected.inStock)} ${selected.unit}` : undefined}
            >
                <Input
                    type="number"
                    min={0}
                    step="any"
                    value={quantity}
                    onChange={(e) => {
                        setQuantity(e.target.value);
                        setErrors((er) => ({ ...er, quantity: undefined }));
                    }}
                />
            </Field>

            <Field label="Reason">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Expired, spilled, recount difference" />
            </Field>

            <p className="flex items-start gap-2 rounded-lg bg-page px-3 py-2.5 text-sm text-body">
                <Info size={16} className="mt-0.5 shrink-0 text-muted" />
                Saving this entry reduces the item&apos;s stock by the quantity above.
            </p>

            <div className="flex justify-end gap-2 border-t border-border pt-5">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                    Cancel
                </Button>
                <Button type="submit" isLoading={isPending} loadingText="Saving...">
                    Record entry
                </Button>
            </div>
        </form>
    );
};

// ── Edit form (only type and reason can change) ──────────────────────────────
const EditForm = ({
    initial,
    inventory,
    isPending,
    onSubmit,
    onCancel,
}: {
    initial: Log;
    inventory: InventoryItem[];
    isPending: boolean;
    onSubmit: (payload: UpdateWastageAdjustmentPayload) => Promise<void>;
    onCancel: () => void;
}) => {
    const [type, setType] = useState<WastageAdjustmentType | ''>(initial.type);
    const [quantity, setQuantity] = useState(String(initial.quantity));
    const [reason, setReason] = useState(initial.reason ?? '');
    const [errors, setErrors] = useState<{ type?: string; quantity?: string }>({});

    const item = resolveItem(initial, inventory);
    const stockItem = inventory.find((i) => i._id === item.id);
    const available = stockItem?.inStock ?? 0;
    const isAddition = initial.action === 'add';

    // Removal entries can grow by whatever is still in stock; addition entries can't shrink below what was already used
    const maxQty = isAddition ? Infinity : available + initial.quantity;
    const minQty = isAddition ? Math.max(initial.quantity - available, 0) : 0;

    const q = Number(quantity);
    const newStock = available + (isAddition ? q - initial.quantity : initial.quantity - q);
    const qtyChanged = q > 0 && q !== initial.quantity;

    const validate = () => {
        const e: typeof errors = {};
        if (!type) e.type = 'Choose a type';
        if (!q || q <= 0) e.quantity = 'Enter a quantity greater than 0';
        else if (q > maxQty) e.quantity = `At most ${num(maxQty)} ${item.unit} (current stock plus this entry)`;
        else if (q < minQty) e.quantity = `Can't go below ${num(minQty)} ${item.unit}; that stock has already been used`;
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev: FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        // Reason is sent even when empty so it can be cleared; quantity only when it changed
        await onSubmit({
            type: type as WastageAdjustmentType,
            reason: reason.trim(),
            ...(qtyChanged ? { quantity: q } : {}),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="rounded-lg border border-border bg-page p-4">
                <p className="text-sm text-muted">{initial.wastageNo}</p>
                <p className="text-base font-semibold text-heading">{item.name || 'Inventory item'}</p>
                <p className="text-base text-muted">
                    Current stock: {num(available)} {item.unit}
                </p>
            </div>

            <Field error={errors.type}>
                <SearchSelect
                    label="Type *"
                    options={TYPE_OPTIONS}
                    value={type}
                    placeholder="Select a type"
                    onChange={(o) => {
                        setType(o.value as WastageAdjustmentType);
                        setErrors((er) => ({ ...er, type: undefined }));
                    }}
                    onClear={() => setType('')}
                />
            </Field>

            <Field
                label={`Quantity${item.unit ? ` (${item.unit})` : ''} *`}
                error={errors.quantity}
                hint={qtyChanged && !errors.quantity ? `Stock will change from ${num(available)} to ${num(Math.max(newStock, 0))} ${item.unit}` : undefined}
            >
                <Input
                    type="number"
                    min={0}
                    step="any"
                    value={quantity}
                    onChange={(e) => {
                        setQuantity(e.target.value);
                        setErrors((er) => ({ ...er, quantity: undefined }));
                    }}
                />
            </Field>

            <Field label="Reason">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Expired, spilled, recount difference" />
            </Field>

            <p className="flex items-start gap-2 rounded-lg bg-page px-3 py-2.5 text-sm text-body">
                <Info size={16} className="mt-0.5 shrink-0 text-muted" />
                Changing the quantity also updates this item&apos;s stock by the difference.
            </p>

            <div className="flex justify-end gap-2 border-t border-border pt-5">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                    Cancel
                </Button>
                <Button type="submit" isLoading={isPending} loadingText="Saving...">
                    Save changes
                </Button>
            </div>
        </form>
    );
};


// ── Panels that load a single entry ──────────────────────────────────────────
const PanelMessage = ({ text, error }: { text: string; error?: boolean }) => (
    <p className={`py-10 text-center text-base ${error ? 'text-danger' : 'text-muted'}`}>{text}</p>
);

const ViewPanel = ({ id, inventory }: { id: string; inventory: InventoryItem[] }) => {
    const { data, isLoading, error } = useGetWastageAdjustmentById(id);
    if (isLoading) return <PanelMessage text="Loading entry..." />;
    if (error || !data) return <PanelMessage error text={(error as Error)?.message || 'Entry not found'} />;
    const log = data as Log;
    const item = resolveItem(log, inventory);
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-sm text-muted">{log.wastageNo}</p>
                    <h3 className="text-xl font-semibold text-heading">{item.name || 'Inventory item'}</h3>
                </div>
                <TypeBadge type={log.type} />
            </div>
            <div>
                <Detail label="Quantity" value={`${signOf(log)}${num(log.quantity)} ${item.unit}`} />
                <Detail label="Reason" value={log.reason} />
                <Detail label="Recorded on" value={fmtDate(log.createdAt)} />
                <Detail label="Last updated" value={fmtDate(log.updatedAt)} />
            </div>
        </div>
    );
};

const EditPanel = ({
    id,
    inventory,
    isPending,
    onSubmit,
    onCancel,
}: {
    id: string;
    inventory: InventoryItem[];
    isPending: boolean;
    onSubmit: (payload: UpdateWastageAdjustmentPayload) => Promise<void>;
    onCancel: () => void;
}) => {
    const { data, isLoading, error } = useGetWastageAdjustmentById(id);
    if (isLoading) return <PanelMessage text="Loading entry..." />;
    if (error || !data) return <PanelMessage error text={(error as Error)?.message || 'Entry not found'} />;
    return <EditForm key={data._id} initial={data as Log} inventory={inventory} isPending={isPending} onSubmit={onSubmit} onCancel={onCancel} />;
};

// ── List rendering (shared by both tabs) ─────────────────────────────────────
interface RowActions {
    canWrite: boolean;
    canHardDelete: boolean;
    onView: (item: Log) => void;
    onEdit: (item: Log) => void;
    onDeactivate: (item: Log) => void;
    onRestore: (item: Log) => void;
    onHardDelete: (item: Log) => void;
}

type ActionDef = { label: string; icon: LucideIcon; onClick: () => void; isDanger?: boolean };

const ActionButtons = ({ item, inactive, a }: { item: Log; inactive: boolean; a: RowActions }) => {
    const view: ActionDef = { label: 'View details', icon: Eye, onClick: () => a.onView(item) };

    const rest: ActionDef[] = [];
    if (!inactive && a.canWrite) rest.push({ label: 'Edit entry', icon: Pencil, onClick: () => a.onEdit(item) });
    if (!inactive && a.canWrite) rest.push({ label: 'Deactivate entry', icon: Power, onClick: () => a.onDeactivate(item), isDanger: true });
    if (inactive && a.canWrite) rest.push({ label: 'Restore entry', icon: RotateCcw, onClick: () => a.onRestore(item) });
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
    inventory,
    isLoading,
    error,
    inactive,
    actions,
}: {
    items: Log[];
    inventory: InventoryItem[];
    isLoading: boolean;
    error: Error | null;
    inactive: boolean;
    actions: RowActions;
}) => {
    const fallback = isLoading
        ? { text: 'Loading entries...', sub: '', danger: false }
        : error
            ? { text: error.message, sub: '', danger: true }
            : items.length === 0
                ? {
                    text: inactive ? 'No inactive entries' : 'No wastage or adjustment entries found',
                    sub: inactive ? 'Deactivated entries will show up here.' : 'Record an entry or adjust your filters.',
                    danger: false,
                }
                : null;

    const qtyClass = (l: Log) => (signOf(l) === '+' ? 'text-success' : 'text-danger');

    return (
        <>
           

            {/* Desktop table (heading always visible) */}
            <TableContainer
                className="rounded-none border-0 shadow-none !min-h-[300px]"
                ariaLabel={inactive ? 'Inactive wastage and adjustment entries' : 'Active wastage and adjustment entries'}
                caption={inactive ? 'List of inactive wastage and adjustment entries' : 'List of active wastage and adjustment entries'}
            >
                <THead className="text-sm">
                    <tr>
                        <Th>S.No</Th>
                        <Th>Item</Th>
                        <Th>Entry</Th>
                        <Th>Type</Th>
                        <Th className="text-right">Quantity</Th>
                        {/* <Th className="hidden xl:table-cell">Reason</Th> */}
                        <Th>Actions</Th>
                    </tr>
                </THead>
                <TBody>
                    {fallback ? (
                        <Tr>
                            <Td colSpan={6} className="py-16 text-center">
                                {!fallback.danger && !isLoading && <PackageMinus size={32} className="mx-auto mb-2 text-muted" />}
                                <p className={`text-base font-medium ${fallback.danger ? 'text-danger' : 'text-heading'}`}>{fallback.text}</p>
                                {fallback.sub && <p className="mt-1 text-base text-muted">{fallback.sub}</p>}
                            </Td>
                        </Tr>
                    ) : (
                        items.map((log, idx) => {
                            const item = resolveItem(log, inventory);
                            return (
                                <Tr key={log._id} onClick={() => actions.onView(log)} ariaLabel={`View entry: ${log.wastageNo ?? ''} ${item.name}`}>
                                    <Td className="text-base text-heading">{idx + 1}</Td>
                                    <Td className="text-base font-medium text-heading">{item.name || '—'}</Td>

                                    <Td className="text-base">
                                        <p className="font-medium text-heading">{log.wastageNo || '—'}</p>
                                        <p className="text-sm text-muted">{fmtDate(log.createdAt)}</p>
                                    </Td>
                                    <Td>
                                        <TypeBadge type={log.type} />
                                    </Td>
                                    <Td className={`text-right text-base font-medium ${qtyClass(log)}`}>
                                        {signOf(log)}
                                        {num(log.quantity)} <span className="text-muted">{item.unit}</span>
                                    </Td>
                                    {/* <Td className="hidden text-base xl:table-cell">{log.reason || '—'}</Td> */}
                                    <Td>
                                        {/* Keep clicks and keys on action buttons from also opening the row */}
                                        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                            <ActionButtons item={log} inactive={inactive} a={actions} />
                                        </div>
                                    </Td>
                                </Tr>
                            );
                        })
                    )}
                </TBody>
            </TableContainer>
        </>
    );
};

// Each tab owns its hook so the inactive endpoint is never called for roles that can't read it
type TabProps = { search: string; type: string; inventoryId: string; inventory: InventoryItem[]; actions: RowActions };

const ActiveTab = ({ search, type, inventoryId, inventory, actions }: TabProps) => {
    const { data = [], isLoading, error } = useGetWastageAdjustmentList();
    const items = filterLogs(data as Log[], inventory, search, type, inventoryId);
    return <ListContent items={items} inventory={inventory} isLoading={isLoading} error={error as Error | null} inactive={false} actions={actions} />;
};

const InactiveTab = ({ search, type, inventoryId, inventory, actions }: TabProps) => {
    const { data = [], isLoading, error } = useGetInactiveWastageAdjustmentList();
    const items = filterLogs(data as Log[], inventory, search, type, inventoryId);
    return <ListContent items={items} inventory={inventory} isLoading={isLoading} error={error as Error | null} inactive actions={actions} />;
};

// ── Main page ────────────────────────────────────────────────────────────────
const WasteAdjustmentMain = () => {
    const { currentRole } = useAuthData();
    const role = currentRole as never;
    const canCreate = WASTAGE_ADJUSTMENT_CREATE_ROLES.includes(role);
    const canWrite = WASTAGE_ADJUSTMENT_WRITE_ROLES.includes(role);
    const canSeeInactive = WASTAGE_ADJUSTMENT_INACTIVE_READ_ROLES.includes(role);
    const canHardDelete = WASTAGE_ADJUSTMENT_HARD_DELETE_ROLES.includes(role);

    const [tab, setTab] = useState<Tab>('active');
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');
    const [inventoryId, setInventoryId] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [panel, setPanel] = useState<Panel>(null);
    const [confirm, setConfirm] = useState<Confirm>(null);

    // Feeds item names, units and stock in the table, filters and create form
    const { data: inventory = [] } = useGetInventoryList();
    const inventoryFilterOptions = inventory.map((i) => ({ label: i.material, value: i._id }));

    const { mutateAsync: createAsync, isPending: creating } = useCreateWastageAdjustment();
    const { mutateAsync: updateAsync, isPending: updating } = useUpdateWastageAdjustment();
    const { mutateAsync: softDeleteAsync, isPending: deactivating } = useSoftDeleteWastageAdjustment();
    const { mutateAsync: restoreAsync } = useRestoreWastageAdjustment();
    const { mutateAsync: hardDeleteAsync, isPending: hardDeleting } = useHardDeleteWastageAdjustment();

    const closePanel = () => setPanel(null);
    const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

    const handleCreate = async (payload: CreateWastageAdjustmentPayload) => {
        try {
            await createAsync(payload);
            toast.success('Entry recorded and stock updated');
            closePanel();
        } catch (e) {
            toast.error(errMsg(e, 'Failed to record entry'));
        }
    };

    const handleUpdate = async (wastageAdjustmentId: string, payload: UpdateWastageAdjustmentPayload) => {
        try {
            await updateAsync({ wastageAdjustmentId, data: payload });
            toast.success('Entry updated');
            closePanel();
        } catch (e) {
            toast.error(errMsg(e, 'Failed to update entry'));
        }
    };

    const handleRestore = async (item: Log) => {
        try {
            await restoreAsync(item._id);
            toast.success(`${item.wastageNo || 'Entry'} restored`);
        } catch (e) {
            toast.error(errMsg(e, 'Failed to restore entry'));
        }
    };

    const handleConfirm = async () => {
        if (!confirm) return;
        const { kind, item } = confirm;
        const name = item.wastageNo || 'Entry';
        try {
            if (kind === 'deactivate') {
                await softDeleteAsync(item._id);
                toast.success(`${name} deactivated`);
            } else {
                await hardDeleteAsync(item._id);
                toast.success(`${name} deleted permanently`);
            }
            setConfirm(null);
        } catch (e) {
            toast.error(errMsg(e, kind === 'deactivate' ? 'Failed to deactivate entry' : 'Failed to delete entry'));
        }
    };

    const actions: RowActions = {
        canWrite,
        canHardDelete,
        onView: (item) => setPanel({ type: 'view', id: item._id }),
        onEdit: (item) => setPanel({ type: 'edit', id: item._id }),
        onDeactivate: (item) => setConfirm({ kind: 'deactivate', item }),
        onRestore: handleRestore,
        onHardDelete: (item) => setConfirm({ kind: 'hard', item }),
    };

    const activeFilters = [type, inventoryId].filter(Boolean).length;
    const clearFilters = () => {
        setSearch('');
        setType('');
        setInventoryId('');
    };

    const panelTitle = panel?.type === 'create' ? 'Record wastage or adjustment' : panel?.type === 'edit' ? 'Edit entry' : 'Entry details';
    const tabProps: TabProps = { search, type, inventoryId, inventory, actions };

    return (
        <div className="flex w-full flex-col gap-5 p-2">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <PackageMinus size={20} />
                    </span>
                    <div>
                        <h1 className="text-2xl font-semibold text-heading">Wastage &amp; Adjustments</h1>
                        <p className="text-sm text-muted">Log wasted or corrected stock and keep a clear record of it</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="lg:hidden" leftIcon={<SlidersHorizontal size={16} />} onClick={() => setShowFilters(true)}>
                        Filters{activeFilters ? ` (${activeFilters})` : ''}
                    </Button>
                    {canCreate && (
                        <Button leftIcon={<Plus size={16} />} onClick={() => setPanel({ type: 'create' })}>
                            Record entry
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                {/* Filters: 30% on desktop, slide-in drawer on mobile */}
                {showFilters && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setShowFilters(false)} />}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 w-[85%] overflow-y-auto bg-page p-4 shadow-xl transition-transform duration-200 sm:w-96 lg:static lg:z-auto lg:w-[30%] lg:translate-x-0 lg:bg-transparent lg:p-0 lg:shadow-none ${showFilters ? 'translate-x-0' : '-translate-x-full'
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
                                <Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Item, entry number or reason" />
                            </div>
                        </Field>
                        <SearchSelect
                            label="Type"
                            options={TYPE_OPTIONS}
                            value={type}
                            placeholder="All types"
                            onChange={(o) => setType(String(o.value))}
                            onClear={() => setType('')}
                        />
                        <SearchSelect
                            label="Inventory item"
                            options={inventoryFilterOptions}
                            value={inventoryId}
                            placeholder="All items"
                            onChange={(o) => setInventoryId(String(o.value))}
                            onClear={() => setInventoryId('')}
                        />
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
                {panel?.type === 'create' && <CreateForm inventory={inventory} isPending={creating} onSubmit={handleCreate} onCancel={closePanel} />}
                {panel?.type === 'edit' && (
                    <EditPanel
                        id={panel.id}
                        inventory={inventory}
                        isPending={updating}
                        onSubmit={(payload) => handleUpdate(panel.id, payload)}
                        onCancel={closePanel}
                    />
                )}
                {panel?.type === 'view' && <ViewPanel id={panel.id} inventory={inventory} />}
            </SideModal>

            {confirm && (
                <ConfirmDialog
                    confirm={confirm}
                    itemName={resolveItem(confirm.item, inventory).name}
                    isPending={deactivating || hardDeleting}
                    onCancel={() => setConfirm(null)}
                    onConfirm={handleConfirm}
                />
            )}
        </div>
    );
};

export default WasteAdjustmentMain;