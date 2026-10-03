import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ChefHat, Plus, Eye, Pencil, RotateCcw, Archive, Trash2, MoreVertical, SlidersHorizontal, AlertTriangle, UtensilsCrossed } from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect, type SelectOption } from '../../components/ui/SearchSelect';
import { SideModal } from '../../components/ui/SideModal';
import { Dropdown } from '../../components/ui/Dropdown';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import { useAuthData } from '../../hooks/useAuthData';
import {
    RECIPE_COST_WRITE_ROLES,
    RECIPE_COST_HARD_DELETE_ROLES,
    useGetRecipeCostList,
    useGetInactiveRecipeCostList,
    useGetRecipeCostById,
    useCreateRecipeCost,
    useUpdateRecipeCost,
    useSoftDeleteRecipeCost,
    useRestoreRecipeCost,
    useHardDeleteRecipeCost,
} from '../../api_service/recipeCost_api/recipeCostApi';
import type { CreateRecipeCostPayload } from '../../api_service/recipeCost_api/recipeCostApi';
import { useGetActiveMenuItems } from '../../api_service/menuItem_api/menuItemApi';
import { useGetInventoryDropdown } from '../../api_service/inventory_api/inventoryApi';
import { UNIT_OPTIONS } from '../inventory_pages/InventoryMain';

// ── Types & helpers ──────────────────────────────────────────────────────────

interface RecipeRow {
    _id: string;
    recipeCostNo?: string;
    menuItemId?: any; // populated: { _id, name, images: [{ url }] }
    ingredients: any[];
    totalPrice?: number;
    grossMargin?: number;
    sellingPrice?: number;
}

interface InvItem {
    _id: string;
    material: string;
    rate?: number;
    unit?: string;
}

type Panel = { mode: 'create' } | { mode: 'view'; id: string } | { mode: 'edit'; id: string } | null;

const inr = (n?: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const pct = (n?: number) => `${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`;
const numStr = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.items ?? d?.menuItems ?? d?.data ?? []);
const idOf = (v: any): string => (v && typeof v === 'object' ? v._id : v) ?? '';

const calcCost = (ings: { rate?: number; unitValue?: number }[]) => ings.reduce((s, i) => s + (Number(i.rate) || 0) * (Number(i.unitValue) || 0), 0);
const calcMargin = (cost: number, price: number) => (price > 0 ? ((price - cost) / price) * 100 : 0);

const costOf = (r: RecipeRow) => r.totalPrice ?? calcCost(r.ingredients ?? []);
const marginOf = (r: RecipeRow) => r.grossMargin ?? calcMargin(costOf(r), r.sellingPrice ?? 0);
const nameOf = (r: RecipeRow) => r.menuItemId?.name ?? '—';
const imageOf = (r: RecipeRow) => r.menuItemId?.images?.[0]?.url as string | undefined;
const bandOf = (m: number) => (m < 30 ? 'low' : m < 60 ? 'mid' : 'high');

const BAND_OPTIONS: SelectOption[] = [
    { label: 'Below 30%', value: 'low' },
    { label: '30% to 60%', value: 'mid' },
    { label: 'Above 60%', value: 'high' },
];
const SORT_OPTIONS: SelectOption[] = [
    { label: 'Margin: high to low', value: 'margin_desc' },
    { label: 'Margin: low to high', value: 'margin_asc' },
    { label: 'Food cost: high to low', value: 'cost_desc' },
    { label: 'Name A to Z', value: 'name' },
];

const sortRows = (rows: RecipeRow[], sort: string) => {
    const list = [...rows];
    switch (sort) {
        case 'margin_desc': return list.sort((a, b) => marginOf(b) - marginOf(a));
        case 'margin_asc': return list.sort((a, b) => marginOf(a) - marginOf(b));
        case 'cost_desc': return list.sort((a, b) => costOf(b) - costOf(a));
        case 'name': return list.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
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
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface transition-colors ${danger ? 'text-danger hover:bg-danger-soft' : 'text-body hover:bg-surface-hover hover:text-heading'
            }`}
    >
        {children}
    </button>
);

const ItemThumb = ({ url, name, size = 'h-11 w-11' }: { url?: string; name: string; size?: string }) => {
    const [failed, setFailed] = useState(false);
    return url && !failed ? (
        <img src={url} alt={name} onError={() => setFailed(true)} className={`${size} shrink-0 rounded-lg border border-border object-cover`} />
    ) : (
        <span className={`${size} flex shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary`}>
            <UtensilsCrossed size={18} />
        </span>
    );
};

const MarginBadge = ({ value }: { value: number }) => {
    const band = bandOf(value);
    const style = band === 'low' ? 'bg-danger-soft text-danger' : band === 'mid' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success';
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ${style}`}>{pct(value)}</span>;
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

const Stat = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="rounded-lg border border-border bg-page px-3 py-2.5">
        <p className="text-sm text-muted">{label}</p>
        <div className="text-lg font-semibold text-heading">{children}</div>
    </div>
);

// ── Create / edit form ───────────────────────────────────────────────────────
interface IngState { key: string; inventoryId: string; unit: string; rate: string; unitValue: string }
const newIng = (): IngState => ({ key: crypto.randomUUID(), inventoryId: '', unit: '', rate: '', unitValue: '' });

const RecipeForm = ({
    initial, menuOptions, inventory, isPending, onSubmit, onCancel,
}: {
    initial?: RecipeRow;
    menuOptions: SelectOption[];
    inventory: InvItem[];
    isPending: boolean;
    onSubmit: (payload: CreateRecipeCostPayload) => Promise<void>;
    onCancel: () => void;
}) => {
    const [menuItemId, setMenuItemId] = useState(idOf(initial?.menuItemId));
    const [sellingPrice, setSellingPrice] = useState(numStr(initial?.sellingPrice));
    const [ings, setIngs] = useState<IngState[]>(
        initial?.ingredients?.length
            ? initial.ingredients.map((i) => ({
                key: crypto.randomUUID(),
                inventoryId: idOf(i.inventoryId),
                unit: i.unit ?? '',
                rate: numStr(i.rate),
                unitValue: numStr(i.unitValue),
            }))
            : [newIng()]
    );
    const [errors, setErrors] = useState<{ menuItemId?: string; sellingPrice?: string }>({});
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

    const inventoryOptions: SelectOption[] = inventory.map((i) => ({ label: i.material, value: i._id }));

    const patchIng = (key: string, patch: Partial<IngState>) => {
        setIngs((l) => l.map((i) => (i.key === key ? { ...i, ...patch } : i)));
        setRowErrors((r) => ({ ...r, [key]: '' }));
    };

    const pickInventory = (key: string, id: string) => {
        const inv = inventory.find((x) => x._id === id);        
        patchIng(key, { inventoryId: id, unit: inv?.unit ?? '', rate: numStr(inv?.rate) });
    };

   
    const validate = () => {
        const e: typeof errors = {};
        const re: Record<string, string> = {};
        if (!menuItemId) e.menuItemId = 'Select a menu item';
        if (sellingPrice !== '' && Number(sellingPrice) < 0) e.sellingPrice = 'Enter 0 or more';
        const seen = new Set<string>();
        ings.forEach((i) => {
            if (!i.inventoryId) re[i.key] = 'Select an ingredient';
            else if (seen.has(i.inventoryId)) re[i.key] = 'This ingredient is already added';
            else if (!i.unit.trim()) re[i.key] = 'Unit is required';
            else if (!(Number(i.unitValue) > 0)) re[i.key] = 'Enter a quantity greater than 0';
            else if (i.rate === '' || Number(i.rate) < 0) re[i.key] = 'Enter a valid rate';
            if (i.inventoryId) seen.add(i.inventoryId);
        });
        setErrors(e);
        setRowErrors(re);
        return Object.keys(e).length === 0 && Object.keys(re).length === 0;
    };

    const handleSubmit = async (ev: FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        const payload: CreateRecipeCostPayload = {
            menuItemId,
            ingredients: ings.map((i) => ({ inventoryId: i.inventoryId, unit: i.unit.trim(), rate: Number(i.rate), unitValue: Number(i.unitValue) })),
        };
        if (sellingPrice !== '') payload.sellingPrice = Number(sellingPrice);
        await onSubmit(payload);
    };

    const cost = calcCost(ings.map((i) => ({ rate: Number(i.rate), unitValue: Number(i.unitValue) })));
    const price = Number(sellingPrice) || 0;

    

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Field label="Menu item *" error={errors.menuItemId}>
                <SearchSelect
                    label=""
                    options={menuOptions}
                    value={menuItemId}
                    placeholder="Select a menu item"
                    onChange={(o: SelectOption) => {
                        setMenuItemId(String(o.value));
                        setErrors((er) => ({ ...er, menuItemId: undefined }));
                    }}
                    onClear={() => setMenuItemId('')}
                />
            </Field>

            <Field label="Selling price (₹)" error={errors.sellingPrice} hint="Optional. Used to work out the gross margin.">
                <Input type="number" min={0} step="any" value={sellingPrice} onChange={(e) => { setSellingPrice(e.target.value); setErrors((er) => ({ ...er, sellingPrice: undefined })); }} placeholder="e.g. 250" />
            </Field>

            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <Label>Ingredients *</Label>
                    <Button type="button" variant="outline" size="sm" leftIcon={<Plus size={16} />} onClick={() => setIngs((l) => [...l, newIng()])}>
                        Add ingredient
                    </Button>
                </div>

                {ings.map((i) => (
                    <div key={i.key} className="flex flex-col gap-3 rounded-lg border border-border bg-page p-3">
                        <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <SearchSelect
                                    label=""
                                    options={inventoryOptions}
                                    value={i.inventoryId}
                                    placeholder="Select ingredient"
                                    onChange={(o: SelectOption) => pickInventory(i.key, String(o.value))}
                                    onClear={() => patchIng(i.key, { inventoryId: '', unit: '', rate: '' })}
                                />
                            </div>
                            {ings.length > 1 && (
                                <IconAction danger label="Remove ingredient" onClick={() => setIngs((l) => l.filter((x) => x.key !== i.key))}>
                                    <Trash2 size={18} />
                                </IconAction>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Unit">
                                <SearchSelect
                                    label=""
                                    options={UNIT_OPTIONS}
                                    value={i.unit}
                                    placeholder="Unit"
                                    onChange={(o) => patchIng(i.key, { unit: String(o.value) })}
                                    onClear={() => patchIng(i.key, { unit: '' })}
                                />
                            </Field>
                            <Field label="Rate (₹)">
                                <Input type="number" min={0} step="any" value={i.rate} onChange={(e) => patchIng(i.key, { rate: e.target.value })} />
                            </Field>
                            <Field label="Qty used">
                                <Input type="number" min={0} step="any" value={i.unitValue} onChange={(e) => patchIng(i.key, { unitValue: e.target.value })} placeholder="0.25" />
                            </Field>
                        </div>
                        {rowErrors[i.key] ? (
                            <p className="text-sm text-danger">{rowErrors[i.key]}</p>
                        ) : (
                            <p className="text-sm text-muted">Cost: {inr((Number(i.rate) || 0) * (Number(i.unitValue) || 0))}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Stat label="Food cost">{inr(cost)}</Stat>
                <Stat label="Gross margin">{price > 0 ? pct(calcMargin(cost, price)) : '—'}</Stat>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-5">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
                <Button type="submit" isLoading={isPending} loadingText="Saving...">{initial ? 'Save changes' : 'Create recipe cost'}</Button>
            </div>
        </form>
    );
};

// ── Main page ────────────────────────────────────────────────────────────────
const RecipeCostMain = () => {
    const { currentRole } = useAuthData();
    const canWrite = RECIPE_COST_WRITE_ROLES.includes(currentRole as never);
    const canHardDelete = RECIPE_COST_HARD_DELETE_ROLES.includes(currentRole as never);

    const [tab, setTab] = useState<'active' | 'inactive'>('active');
    const [search, setSearch] = useState('');
    const [band, setBand] = useState('');
    const [sort, setSort] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [panel, setPanel] = useState<Panel>(null);
    const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'hard'; row: RecipeRow } | null>(null);

    const activeQ = useGetRecipeCostList();
    const inactiveQ = useGetInactiveRecipeCostList();
    const menuQ = useGetActiveMenuItems();
    const inventoryQ = useGetInventoryDropdown();
    const detailQ = useGetRecipeCostById(panel?.mode === 'view' ? panel.id : undefined);

    const { mutateAsync: createAsync, isPending: creating } = useCreateRecipeCost();
    const { mutateAsync: updateAsync, isPending: updating } = useUpdateRecipeCost();
    const { mutateAsync: softDeleteAsync, isPending: softDeleting } = useSoftDeleteRecipeCost();
    const { mutateAsync: restoreAsync } = useRestoreRecipeCost();
    const { mutateAsync: hardDeleteAsync, isPending: hardDeleting } = useHardDeleteRecipeCost();

    const query = tab === 'active' ? activeQ : inactiveQ;
    const allRows: RecipeRow[] = toArray(query.data);
    const activeRows: RecipeRow[] = toArray(activeQ.data);
    const inventory: InvItem[] = toArray(inventoryQ.data);
    const invMap = new Map(inventory.map((i) => [i._id, i]));

    const q = search.trim().toLowerCase();
    const rows = sortRows(
        allRows.filter((r) => {
            if (q && !nameOf(r).toLowerCase().includes(q) && !(r.recipeCostNo ?? '').toLowerCase().includes(q)) return false;
            if (band && bandOf(marginOf(r)) !== band) return false;
            return true;
        }),
        sort
    );

    const editingId = panel?.mode === 'edit' ? panel.id : undefined;
    const takenMenuIds = new Set(activeRows.filter((r) => r._id !== editingId).map((r) => idOf(r.menuItemId)));
    const menuOptions: SelectOption[] = toArray(menuQ.data)
        .filter((m: any) => !takenMenuIds.has(m._id))
        .map((m: any) => ({ label: m.name, value: m._id }));

    const baseRow = panel && panel.mode !== 'create' ? [...activeRows, ...toArray(inactiveQ.data)].find((r: RecipeRow) => r._id === panel.id) : undefined;
    const detail = detailQ.data as RecipeRow | undefined;
    const viewRow: RecipeRow | undefined = detail ? { ...detail, menuItemId: typeof detail.menuItemId === 'object' ? detail.menuItemId : baseRow?.menuItemId } : baseRow;

    const ingName = (i: any): string => (i.inventoryId && typeof i.inventoryId === 'object' ? i.inventoryId.material : invMap.get(i.inventoryId)?.material) ?? '—';

    const hasFilters = !!(search || band || sort);
    const clearFilters = () => { setSearch(''); setBand(''); setSort(''); };

    const handleSave = async (payload: CreateRecipeCostPayload) => {
        try {
            if (panel?.mode === 'edit') {
                await updateAsync({ recipeCostId: panel.id, ...payload });
                toast.success('Recipe cost updated');
            } else {
                await createAsync(payload);
                toast.success('Recipe cost created');
            }
            setPanel(null);
        } catch (e) {
            toast.error(errMsg(e, 'Failed to save recipe cost'));
        }
    };

    const handleRestore = async (row: RecipeRow) => {
        try {
            await restoreAsync(row._id);
            toast.success(`${nameOf(row)} restored`);
        } catch (e) {
            toast.error(errMsg(e, 'Failed to restore recipe cost'));
        }
    };

    const handleConfirm = async () => {
        if (!confirm) return;
        try {
            if (confirm.kind === 'deactivate') {
                await softDeleteAsync(confirm.row._id);
                toast.success(`${nameOf(confirm.row)} deactivated`);
            } else {
                await hardDeleteAsync(confirm.row._id);
                toast.success(`${nameOf(confirm.row)} deleted permanently`);
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
                        <ChefHat size={20} />
                    </span>
                    <div>
                        <h1 className="text-2xl font-semibold text-heading">Recipes &amp; Food Cost</h1>
                        <p className="text-sm text-muted">Ingredient cost and gross margin for every menu item</p>
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
                            Add recipe cost
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-4">
                {/* Filters: 25% */}
                <aside className={`${filtersOpen ? 'flex' : 'hidden'} flex-col overflow-hidden rounded-xl border border-border bg-page lg:col-span-1 lg:flex`}>
                    <div className="flex items-center justify-between border-b border-border  px-4 py-3">
                        <h2 className="text-base font-semibold text-heading">Filters</h2>
                        {hasFilters && (
                            <button type="button" onClick={clearFilters} className="text-sm font-medium text-primary hover:underline">
                                Clear all
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col gap-4 p-4">
                        <Field label="Search">
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Item name or recipe no." />
                        </Field>
                        <Field label="Gross margin">
                            <SearchSelect label="" options={BAND_OPTIONS} value={band} placeholder="All margins"
                                onChange={(o: SelectOption) => setBand(String(o.value))} onClear={() => setBand('')} />
                        </Field>
                        <Field label="Sort by">
                            <SearchSelect label="" options={SORT_OPTIONS} value={sort} placeholder="Default order"
                                onChange={(o: SelectOption) => setSort(String(o.value))} onClear={() => setSort('')} />
                        </Field>
                    </div>
                </aside>

                {/* List: 75% */}
                <section className="min-w-0 rounded-xl  lg:col-span-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                        <div className="flex items-center gap-1">
                            <button type="button" className={tabClass(tab === 'active')} onClick={() => setTab('active')}>Active</button>
                            {canWrite && <button type="button" className={tabClass(tab === 'inactive')} onClick={() => setTab('inactive')}>Inactive</button>}
                        </div>
                        <p className="text-sm text-muted">{rows.length} of {allRows.length} recipes</p>
                    </div>

                    <TableContainer ariaLabel="Recipe costs" 
                    className='min-h-[300px]'
                    caption="Recipe costs and gross margins">
                        <THead>
                            <Tr>
                                <Th>S.No</Th>
                                <Th>Menu item</Th>
                                <Th>Ingredients</Th>
                                <Th>Food cost</Th>
                                <Th>Selling price</Th>
                                <Th>Margin</Th>
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
                                            {allRows.length === 0 ? (tab === 'active' ? 'No recipe costs yet.' : 'No inactive recipe costs.') : 'No recipes match these filters.'}
                                        </p>
                                    </Td>
                                </Tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <Tr key={r._id} ariaLabel={`View ${nameOf(r)}`} onClick={() => setPanel({ mode: 'view', id: r._id })}>
                                        <Td>{idx + 1}</Td>
                                        <Td>
                                            <div className="flex items-center gap-3">
                                                <ItemThumb url={imageOf(r)} name={nameOf(r)} />
                                                <div className="min-w-0">
                                                    <p className="truncate text-base font-medium text-heading">{nameOf(r)}</p>
                                                    <p className="text-sm text-muted">{r.recipeCostNo}</p>
                                                </div>
                                            </div>
                                        </Td>
                                        <Td>{r.ingredients?.length ?? 0}</Td>
                                        <Td>{inr(costOf(r))}</Td>
                                        <Td>{r.sellingPrice ? inr(r.sellingPrice) : '—'}</Td>
                                        <Td>{r.sellingPrice ? <MarginBadge value={marginOf(r)} /> : '—'}</Td>
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
                                                                    { label: 'Edit', icon: <Pencil size={16} />, onClick: () => setPanel({ mode: 'edit', id: r._id }) },
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

            {/* Side panel: view / create / edit */}
            <SideModal
                isOpen={!!panel}
                onClose={() => setPanel(null)}
                title={panel?.mode === 'create' ? 'New recipe cost' : panel?.mode === 'edit' ? 'Edit recipe cost' : 'Recipe cost'}
            >
                {panel?.mode === 'view' && viewRow && (
                    <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-4">
                            <ItemThumb url={imageOf(viewRow)} name={nameOf(viewRow)} size="h-20 w-20" />
                            <div>
                                <h3 className="text-xl font-semibold text-heading">{nameOf(viewRow)}</h3>
                                <p className="text-sm text-muted">{viewRow.recipeCostNo}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Stat label="Food cost">{inr(costOf(viewRow))}</Stat>
                            <Stat label="Selling price">{viewRow.sellingPrice ? inr(viewRow.sellingPrice) : '—'}</Stat>
                            <Stat label="Margin">{viewRow.sellingPrice ? <MarginBadge value={marginOf(viewRow)} /> : '—'}</Stat>
                        </div>
                        <TableContainer ariaLabel="Ingredients" caption="Ingredients used">
                            <THead>
                                <Tr>
                                    <Th>Ingredient</Th>
                                    <Th>Qty</Th>
                                    <Th>Rate</Th>
                                    <Th>Cost</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {(viewRow.ingredients ?? []).map((i: any, idx: number) => (
                                    <Tr key={idx}>
                                        <Td>{ingName(i)}</Td>
                                        <Td>{i.unitValue} {i.unit}</Td>
                                        <Td>{inr(i.rate)}/{i.unit}</Td>
                                        <Td>{inr((i.rate || 0) * (i.unitValue || 0))}</Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </TableContainer>
                        {canWrite && tab === 'active' && (
                            <div className="flex justify-end border-t border-border pt-5">
                                <Button leftIcon={<Pencil size={16} />} onClick={() => setPanel({ mode: 'edit', id: viewRow._id })}>Edit</Button>
                            </div>
                        )}
                    </div>
                )}

                {panel?.mode === 'view' && !viewRow && (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                )}

                {(panel?.mode === 'create' || (panel?.mode === 'edit' && baseRow)) && (
                    <RecipeForm
                        key={panel.mode === 'edit' ? panel.id : 'new'}
                        initial={panel.mode === 'edit' ? baseRow : undefined}
                        menuOptions={menuOptions}
                        inventory={inventory}
                        isPending={creating || updating}
                        onSubmit={handleSave}
                        onCancel={() => setPanel(null)}
                    />
                )}
            </SideModal>

            {confirm && (
                <ConfirmDialog
                    title={confirm.kind === 'deactivate' ? 'Deactivate recipe cost?' : 'Delete permanently?'}
                    message={
                        confirm.kind === 'deactivate'
                            ? `"${nameOf(confirm.row)}" will move to Inactive. You can restore it later.`
                            : `"${nameOf(confirm.row)}" will be deleted for good. This cannot be undone.`
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

export default RecipeCostMain;