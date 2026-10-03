import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    Truck,
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
    VENDOR_INACTIVE_READ_ROLES,
    VENDOR_WRITE_ROLES,
    VENDOR_HARD_DELETE_ROLES,
    useGetVendorList,
    useGetInactiveVendorList,
    useGetVendorById,
    useCreateVendor,
    useUpdateVendor,
    useSoftDeleteVendor,
    useRestoreVendor,
    useHardDeleteVendor,
} from '../../api_service/vendor_api/vendorApi';
import type { VendorItem, VendorPayload } from '../../api_service/vendor_api/vendorApi';

// ── Types & helpers ──────────────────────────────────────────────────────────
type Tab = 'active' | 'inactive';
type Panel = { type: 'create' } | { type: 'view'; id: string } | { type: 'edit'; id: string } | null;
type Confirm = { kind: 'deactivate' | 'hard'; item: VendorItem } | null;

// The list endpoints take no query params, so search and category filter run on the client
const filterVendors = (list: VendorItem[], search: string, category: string) => {
    const q = search.trim().toLowerCase();
    return list.filter((v) => {
        if (category && v.category !== category) return false;
        if (!q) return true;
        return [v.vendorName, v.contactPerson, v.phone, v.gstin, v.vendorNo, v.category].some((f) => String(f ?? '').toLowerCase().includes(q));
    });
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const textareaClass =
    'w-full min-h-[96px] rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

// ── Small building blocks ────────────────────────────────────────────────────
const Field = ({ label, error, children }: { label?: string; error?: string; children: ReactNode }) => (
    <div className="flex flex-col gap-1.5">
        {label && <Label>{label}</Label>}
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
                        <h3 className="text-lg font-semibold text-heading">{hard ? 'Delete permanently?' : 'Deactivate vendor?'}</h3>
                        <p className="mt-1 text-base text-body">
                            {hard
                                ? `"${confirm.item.vendorName}" will be removed for good. This cannot be undone.`
                                : `"${confirm.item.vendorName}" will move to the Inactive tab. You can restore it any time.`}
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
type FormKey = 'vendorName' | 'contactPerson' | 'phone' | 'gstin' | 'category' | 'address' | 'paymentTerms';
type FormState = Record<FormKey, string>;

const OPTIONAL_KEYS: Exclude<FormKey, 'vendorName'>[] = ['contactPerson', 'phone', 'gstin', 'category', 'address', 'paymentTerms'];

const VendorForm = ({
    initial,
    isEdit,
    isPending,
    categories,
    onSubmit,
    onCancel,
}: {
    initial?: VendorItem;
    isEdit: boolean;
    isPending: boolean;
    categories: string[];
    onSubmit: (payload: VendorPayload) => Promise<void>;
    onCancel: () => void;
}) => {
    const [form, setForm] = useState<FormState>({
        vendorName: initial?.vendorName ?? '',
        contactPerson: initial?.contactPerson ?? '',
        phone: initial?.phone ?? '',
        gstin: initial?.gstin ?? '',
        category: initial?.category ?? '',
        address: initial?.address ?? '',
        paymentTerms: initial?.paymentTerms ?? '',
    });
    const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});

    const set = (key: FormKey) => (value: string) => {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: undefined }));
    };

    const validate = () => {
        const e: Partial<Record<FormKey, string>> = {};
        if (!form.vendorName.trim()) e.vendorName = 'Vendor name is required';
        const digits = form.phone.replace(/\D/g, '');
        if (form.phone.trim() && (digits.length < 7 || digits.length > 15)) e.phone = 'Enter a valid phone number';
        if (form.gstin.trim() && !GSTIN_REGEX.test(form.gstin.trim())) e.gstin = 'Enter a valid 15-character GSTIN';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev: FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        const payload: VendorPayload = { vendorName: form.vendorName.trim() };
        // On create, skip empty optionals; on edit, send them so a field can be cleared
        OPTIONAL_KEYS.forEach((k) => {
            const v = form[k].trim();
            if (v || isEdit) payload[k] = v;
        });
        await onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Field label="Vendor name *" error={errors.vendorName}>
                <Input value={form.vendorName} onChange={(e) => set('vendorName')(e.target.value)} placeholder="e.g. Fresh Farms Traders" />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Contact person">
                    <Input value={form.contactPerson} onChange={(e) => set('contactPerson')(e.target.value)} placeholder="Full name" />
                </Field>
                <Field label="Phone" error={errors.phone}>
                    <Input type="tel" value={form.phone}
                        onChange={(e) => set('phone')(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="e.g. 98765 43210" />
                </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="GSTIN" error={errors.gstin}>
                    <Input
                        value={form.gstin}
                        maxLength={15}
                        onChange={(e) => set('gstin')(e.target.value.toUpperCase())}
                        placeholder="15-character GSTIN"
                    />
                </Field>
                <Field label="Category">
                    <Input
                        list="vendor-categories"
                        value={form.category}
                        onChange={(e) => set('category')(e.target.value)}
                        placeholder="Type or pick a category"
                    />
                    <datalist id="vendor-categories">
                        {categories.map((c) => (
                            <option key={c} value={c} />
                        ))}
                    </datalist>
                </Field>
            </div>

            <Field label="Payment terms">
                <Input value={form.paymentTerms} onChange={(e) => set('paymentTerms')(e.target.value)} placeholder="e.g. Net 30, advance, cash on delivery" />
            </Field>

            <Field label="Address">
                <textarea className={textareaClass} value={form.address} onChange={(e) => set('address')(e.target.value)} placeholder="Street, city, state, PIN" />
            </Field>

            <div className="flex justify-end gap-2 border-t border-border pt-5">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                    Cancel
                </Button>
                <Button type="submit" isLoading={isPending} loadingText={isEdit ? 'Saving...' : 'Creating...'}>
                    {isEdit ? 'Save changes' : 'Create vendor'}
                </Button>
            </div>
        </form>
    );
};

// ── Panels that load a single vendor ─────────────────────────────────────────
const PanelMessage = ({ text, error }: { text: string; error?: boolean }) => (
    <p className={`py-10 text-center text-base ${error ? 'text-danger' : 'text-muted'}`}>{text}</p>
);

const ViewPanel = ({ id }: { id: string }) => {
    const { data: vendor, isLoading, error } = useGetVendorById(id);
    if (isLoading) return <PanelMessage text="Loading vendor..." />;
    if (error || !vendor) return <PanelMessage error text={(error as Error)?.message || 'Vendor not found'} />;
    return (
        <div className="flex flex-col gap-4">
            <div>
                <p className="text-sm text-muted">{vendor.vendorNo}</p>
                <h3 className="text-xl font-semibold text-heading">{vendor.vendorName}</h3>
            </div>
            <div>
                <Detail label="Contact person" value={vendor.contactPerson} />
                <Detail label="Phone" value={vendor.phone} />
                <Detail label="GSTIN" value={vendor.gstin} />
                <Detail label="Category" value={vendor.category} />
                <Detail label="Payment terms" value={vendor.paymentTerms} />
                <Detail label="Address" value={vendor.address} />
                <Detail label="Status" value={vendor.isActive === false ? 'Inactive' : 'Active'} />
                <Detail label="Last updated" value={new Date(vendor.updatedAt).toLocaleString('en-IN')} />
            </div>
        </div>
    );
};

const EditPanel = ({
    id,
    isPending,
    categories,
    onSubmit,
    onCancel,
}: {
    id: string;
    isPending: boolean;
    categories: string[];
    onSubmit: (payload: VendorPayload) => Promise<void>;
    onCancel: () => void;
}) => {
    const { data: vendor, isLoading, error } = useGetVendorById(id);
    if (isLoading) return <PanelMessage text="Loading vendor..." />;
    if (error || !vendor) return <PanelMessage error text={(error as Error)?.message || 'Vendor not found'} />;
    return <VendorForm key={vendor._id} initial={vendor} isEdit isPending={isPending} categories={categories} onSubmit={onSubmit} onCancel={onCancel} />;
};

// ── List rendering (shared by both tabs) ─────────────────────────────────────
interface RowActions {
    canWrite: boolean;
    canHardDelete: boolean;
    onView: (item: VendorItem) => void;
    onEdit: (item: VendorItem) => void;
    onDeactivate: (item: VendorItem) => void;
    onRestore: (item: VendorItem) => void;
    onHardDelete: (item: VendorItem) => void;
}

type ActionDef = { label: string; icon: LucideIcon; onClick: () => void; isDanger?: boolean };

const ActionButtons = ({ item, inactive, a }: { item: VendorItem; inactive: boolean; a: RowActions }) => {
    const view: ActionDef = { label: 'View details', icon: Eye, onClick: () => a.onView(item) };

    const rest: ActionDef[] = [];
    if (!inactive && a.canWrite) rest.push({ label: 'Edit vendor', icon: Pencil, onClick: () => a.onEdit(item) });
    if (!inactive && a.canWrite) rest.push({ label: 'Deactivate', icon: Power, onClick: () => a.onDeactivate(item), isDanger: true });
    if (inactive && a.canWrite) rest.push({ label: 'Restore vendor', icon: RotateCcw, onClick: () => a.onRestore(item) });
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
    items: VendorItem[];
    isLoading: boolean;
    error: Error | null;
    inactive: boolean;
    actions: RowActions;
}) => {
    const fallback = isLoading
        ? { text: 'Loading vendors...', sub: '', danger: false }
        : error
            ? { text: error.message, sub: '', danger: true }
            : items.length === 0
                ? {
                    text: inactive ? 'No inactive vendors' : 'No vendors found',
                    sub: inactive ? 'Deactivated vendors will show up here.' : 'Add a vendor or adjust your filters.',
                    danger: false,
                }
                : null;

    return (
        <>
           

            {/* Desktop table (heading always visible) */}
            <TableContainer
                className="rounded-none border-0 shadow-none min-h-[300px]"
                ariaLabel={inactive ? 'Inactive vendors' : 'Active vendors'}
                caption={inactive ? 'List of inactive vendors' : 'List of active vendors'}
            >
                <THead className="text-sm">
                    <tr>
                        <Th>S.No</Th>
                        <Th>Vendor</Th>
                        <Th>Contact</Th>
                        <Th>Category</Th>
                        <Th className="hidden xl:table-cell">GSTIN</Th>
                        <Th className="hidden xl:table-cell">Payment terms</Th>
                        <Th>Actions</Th>
                    </tr>
                </THead>
                <TBody>
                    {fallback ? (
                        <Tr>
                            <Td colSpan={7} className="py-16 text-center">
                                {!fallback.danger && !isLoading && <Truck size={32} className="mx-auto mb-2 text-muted" />}
                                <p className={`text-base font-medium ${fallback.danger ? 'text-danger' : 'text-heading'}`}>{fallback.text}</p>
                                {fallback.sub && <p className="mt-1 text-base text-muted">{fallback.sub}</p>}
                            </Td>
                        </Tr>
                    ) : (
                        items.map((item, idx) => (
                            <Tr key={item._id} onClick={() => actions.onView(item)} ariaLabel={`View vendor: ${item.vendorName}`}>
                                <Td className="text-base text-center">{idx + 1}</Td>
                                <Td className="text-base">
                                    <p className="font-medium text-heading">{item.vendorName}</p>
                                    <p className="text-sm text-muted">{item.vendorNo}</p>
                                </Td>
                                <Td className="text-base">
                                    <p>{item.contactPerson || '—'}</p>
                                    {item.phone && <p className="text-sm text-muted">{item.phone}</p>}
                                </Td>
                                <Td className="text-base">{item.category || '—'}</Td>
                                <Td className="hidden text-base xl:table-cell">{item.gstin || '—'}</Td>
                                <Td className="hidden text-base xl:table-cell">{item.paymentTerms || '—'}</Td>
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
type TabProps = { search: string; category: string; actions: RowActions };

const ActiveTab = ({ search, category, actions }: TabProps) => {
    const { data = [], isLoading, error } = useGetVendorList();
    return <ListContent items={filterVendors(data, search, category)} isLoading={isLoading} error={error as Error | null} inactive={false} actions={actions} />;
};

const InactiveTab = ({ search, category, actions }: TabProps) => {
    const { data = [], isLoading, error } = useGetInactiveVendorList();
    return <ListContent items={filterVendors(data, search, category)} isLoading={isLoading} error={error as Error | null} inactive actions={actions} />;
};

// ── Main page ────────────────────────────────────────────────────────────────
const VendorMain = () => {
    const { currentRole } = useAuthData();
    const role = currentRole as never;
    const canWrite = VENDOR_WRITE_ROLES.includes(role);
    const canSeeInactive = VENDOR_INACTIVE_READ_ROLES.includes(role);
    const canHardDelete = VENDOR_HARD_DELETE_ROLES.includes(role);

    const [tab, setTab] = useState<Tab>('active');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [panel, setPanel] = useState<Panel>(null);
    const [confirm, setConfirm] = useState<Confirm>(null);

    // Same query as the active tab, so this is one request; it feeds the category options
    const { data: activeVendors = [] } = useGetVendorList();
    const categories = [...new Set(activeVendors.map((v) => v.category).filter(Boolean))] as string[];
    const categoryOptions = categories.map((c) => ({ label: c, value: c }));

    const { mutateAsync: createAsync, isPending: creating } = useCreateVendor();
    const { mutateAsync: updateAsync, isPending: updating } = useUpdateVendor();
    const { mutateAsync: softDeleteAsync, isPending: deactivating } = useSoftDeleteVendor();
    const { mutateAsync: restoreAsync } = useRestoreVendor();
    const { mutateAsync: hardDeleteAsync, isPending: hardDeleting } = useHardDeleteVendor();

    const closePanel = () => setPanel(null);
    const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

    const handleCreate = async (payload: VendorPayload) => {
        try {
            await createAsync(payload);
            toast.success('Vendor created');
            closePanel();
        } catch (e) {
            toast.error(errMsg(e, 'Failed to create vendor'));
        }
    };

    const handleUpdate = async (vendorId: string, payload: VendorPayload) => {
        try {
            await updateAsync({ vendorId, data: payload });
            toast.success('Vendor updated');
            closePanel();
        } catch (e) {
            toast.error(errMsg(e, 'Failed to update vendor'));
        }
    };

    const handleRestore = async (item: VendorItem) => {
        try {
            await restoreAsync(item._id);
            toast.success(`${item.vendorName} restored`);
        } catch (e) {
            toast.error(errMsg(e, 'Failed to restore vendor'));
        }
    };

    const handleConfirm = async () => {
        if (!confirm) return;
        const { kind, item } = confirm;
        try {
            if (kind === 'deactivate') {
                await softDeleteAsync(item._id);
                toast.success(`${item.vendorName} deactivated`);
            } else {
                await hardDeleteAsync(item._id);
                toast.success(`${item.vendorName} deleted permanently`);
            }
            setConfirm(null);
        } catch (e) {
            toast.error(errMsg(e, kind === 'deactivate' ? 'Failed to deactivate vendor' : 'Failed to delete vendor'));
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

    const activeFilters = category ? 1 : 0;
    const clearFilters = () => {
        setSearch('');
        setCategory('');
    };

    const panelTitle = panel?.type === 'create' ? 'Add vendor' : panel?.type === 'edit' ? 'Edit vendor' : 'Vendor details';
    const tabProps: TabProps = { search, category, actions };

    return (
        <div className="flex w-full flex-col gap-5 p-2">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Truck size={20} />
                    </span>
                    <div>
                        <h1 className="text-2xl font-semibold text-heading">Vendors</h1>
                        <p className="text-sm text-muted">Manage suppliers, contacts and payment terms</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="lg:hidden" leftIcon={<SlidersHorizontal size={16} />} onClick={() => setShowFilters(true)}>
                        Filters{activeFilters ? ` (${activeFilters})` : ''}
                    </Button>
                    {canWrite && (
                        <Button leftIcon={<Plus size={16} />} onClick={() => setPanel({ type: 'create' })}>
                            Add vendor
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
                                <Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, contact, phone or GSTIN" />
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
                    <VendorForm isEdit={false} isPending={creating} categories={categories} onSubmit={handleCreate} onCancel={closePanel} />
                )}
                {panel?.type === 'edit' && (
                    <EditPanel
                        id={panel.id}
                        isPending={updating}
                        categories={categories}
                        onSubmit={(payload) => handleUpdate(panel.id, payload)}
                        onCancel={closePanel}
                    />
                )}
                {panel?.type === 'view' && <ViewPanel id={panel.id} />}
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

export default VendorMain;