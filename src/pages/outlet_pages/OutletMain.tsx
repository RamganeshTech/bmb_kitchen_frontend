import {
    memo, useCallback, useEffect, useMemo,
    useState, type ChangeEvent, type FormEvent, type ReactNode,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    AlertCircle, ArrowLeft, Ban, Check, Loader2,
    MapPin, Pencil, Phone, Plus, RefreshCw, RotateCcw, Search, Store, Trash2,
} from 'lucide-react';

import { toast } from '../../components/ui/toast/Toast';
import { Card } from '../../components/ui/Card';
import { Label } from '../../components/ui/Label';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthData } from '../../hooks/useAuthData';
import {
    clearCurrentOutlet,
    selectCurrentOutlet,
    setCurrentOutlet,
} from '../../features/slices/outletSlice';
// TODO: fix this path to where your outlet hooks file lives
import {
    OUTLET_HARD_DELETE_ROLES,
    OUTLET_INACTIVE_READ_ROLES,
    OUTLET_WRITE_ROLES,
    useCreateOutlet,
    useGetInactiveOutlets,
    useGetOutletById,
    useGetOutletList,
    useHardDeleteOutlet,
    useRestoreOutlet,
    useSoftDeleteOutlet,
    useUpdateOutlet,
    type OutletPayload,
} from '../../api_service/outlet_api/outletApi';

/* -------------------------------------------------------------------------- */
/*  Types & helpers                                                           */
/* -------------------------------------------------------------------------- */

interface OutletData {
    _id: string;
    outletNo?: string;
    name: string;
    code?: string;
    address?: string | null;
    phone?: string | null;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

type Mode = 'view' | 'create' | 'edit';
type Tab = 'active' | 'inactive';
type Confirm = 'deactivate' | 'delete' | null;

// const PHONE_REGEX = /^\+?[\d\s-]{7,15}$/;
const PHONE_REGEX = /^\d{7,15}$/;
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatDate = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : dateFormatter.format(d);
};

// The list endpoints return `any`, so accept a bare array or a wrapped one
const toOutletArray = (data: unknown): OutletData[] => {
    if (Array.isArray(data)) return data as OutletData[];
    const wrapped = data as { outlets?: OutletData[]; items?: OutletData[]; data?: OutletData[] } | null;
    return wrapped?.outlets ?? wrapped?.items ?? wrapped?.data ?? [];
};

const toCurrent = (o: OutletData) => ({ _id: o._id, name: o.name, code: o.code });

/* -------------------------------------------------------------------------- */
/*  Small presentational pieces                                               */
/* -------------------------------------------------------------------------- */

const CodeBadge = memo(function CodeBadge({ code, active = true, large = false }: { code?: string; active?: boolean; large?: boolean }) {
    return (
        <span
            className={`flex shrink-0 items-center justify-center rounded-lg font-semibold ${large ? 'h-14 w-14 text-base' : 'h-10 w-10 text-xs'
                } ${active ? 'bg-primary-soft text-primary' : 'bg-surface-hover text-muted'}`}
        >
            {code || 'OUT'}
        </span>
    );
});

const InfoRow = memo(function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
    return (
        <div className="flex gap-3 py-3.5">
            <span className="mt-0.5 text-muted">{icon}</span>
            <div className="min-w-0">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-0.5 whitespace-pre-line break-words text-sm font-medium text-heading">{children}</dd>
            </div>
        </div>
    );
});

const PanelMessage = ({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) => (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">{icon}</span>
        <div>
            <h3 className="text-sm font-semibold text-heading">{title}</h3>
            {text && <p className="mt-1 text-sm text-muted">{text}</p>}
        </div>
        {action}
    </div>
);

/* -------------------------------------------------------------------------- */
/*  Outlet list (left panel)                                                  */
/* -------------------------------------------------------------------------- */

interface ListViewProps {
    outlets: OutletData[];
    isLoading: boolean;
    errorMessage?: string;
    onRetry: () => void;
    selectedId: string | null;
    currentId?: string;
    onSelect: (id: string) => void;
    emptyTitle: string;
    emptyText: string;
    inactive?: boolean;
}

const OutletListView = memo(function OutletListView(props: ListViewProps) {
    const { outlets, isLoading, errorMessage, onRetry, selectedId, currentId, onSelect, emptyTitle, emptyText, inactive } = props;

    if (isLoading) {
        return (
            <div className="space-y-2 p-3" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-hover" />
                ))}
            </div>
        );
    }
    if (errorMessage) {
        return (
            <PanelMessage
                icon={<AlertCircle className="h-5 w-5" />}
                title="Could not load outlets"
                text={errorMessage}
                action={
                    <Button leftIcon={<RefreshCw className="mr-2 h-4 w-4" />} type="button" variant="outline" onClick={onRetry}>

                        Try again
                    </Button>
                }
            />
        );
    }
    if (!outlets.length) {
        return <PanelMessage icon={<Store className="h-5 w-5" />} title={emptyTitle} text={emptyText} />;
    }

    return (
        <ul className="space-y-1 p-2">
            {outlets.map((o) => {
                const selected = o._id === selectedId;
                return (
                    <li key={o._id}>
                        <button
                            type="button"
                            onClick={() => onSelect(o._id)}
                            aria-current={selected}
                            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${selected ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-surface-hover'
                                }`}
                        >
                            <CodeBadge code={o.code} active={!inactive} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-heading" title={o.name}>
                                    {o.name}
                                </span>
                                <span className="block truncate text-xs text-muted">{o.phone || o.outletNo || 'No phone added'}</span>
                            </span>
                            {o._id === currentId && (
                                <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Current</span>
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
});

// Mounted only while the Inactive tab is open, so that request is lazy
const InactiveList = ({ query, ...rest }: { query: string } & Pick<ListViewProps, 'selectedId' | 'currentId' | 'onSelect'>) => {
    const { data, isLoading, error, refetch } = useGetInactiveOutlets();
    const outlets = useMemo(() => filterOutlets(toOutletArray(data), query), [data, query]);
    return (
        <OutletListView
            {...rest}
            outlets={outlets}
            isLoading={isLoading}
            errorMessage={error?.message}
            onRetry={() => refetch()}
            emptyTitle="No inactive outlets"
            emptyText="Outlets you deactivate will appear here."
            inactive
        />
    );
};

const filterOutlets = (outlets: OutletData[], query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return outlets;
    return outlets.filter((o) => [o.name, o.code, o.outletNo].some((v) => v?.toLowerCase().includes(q)));
};

/* -------------------------------------------------------------------------- */
/*  Create / edit form                                                        */
/* -------------------------------------------------------------------------- */

interface FormState { name: string; code: string; phone: string; address: string }
type FormErrors = Partial<Record<keyof FormState, string>>;

const OutletForm = memo(function OutletForm({
    outlet,
    isPending,
    onSubmit,
    onCancel,
}: {
    outlet?: OutletData;
    isPending: boolean;
    onSubmit: (payload: Partial<OutletPayload>) => Promise<void>;
    onCancel: () => void;
}) {
    const initial = useMemo<FormState>(
        () => ({ name: outlet?.name ?? '', code: outlet?.code ?? '', phone: outlet?.phone ?? '', address: outlet?.address ?? '' }),
        [outlet]
    );
    const [form, setForm] = useState<FormState>(initial);
    const [errors, setErrors] = useState<FormErrors>({});

    const isEdit = !!outlet;
    const isDirty = (Object.keys(form) as (keyof FormState)[]).some((k) => form[k].trim() !== initial[k]);

    const handleChange = (key: keyof FormState) => (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const value = e.target.value;

        if (key === 'phone' && !/^\d*$/.test(value)) {
            return;
        }

        const nextValue =
            key === 'code'
                ? value.toUpperCase().slice(0, 5)
                : value;

        setForm((prev) => ({ ...prev, [key]: nextValue }));

        setErrors((prev) =>
            prev[key] ? { ...prev, [key]: undefined } : prev
        );
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const next: FormErrors = {};
        if (!form.name.trim()) next.name = 'Enter the outlet name';
        if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim())) next.phone = 'Enter a valid phone number';
        setErrors(next);
        if (Object.keys(next).length) return;

        const payload: Partial<OutletPayload> = {};
        (Object.keys(form) as (keyof FormState)[]).forEach((k) => {
            const value = form[k].trim();
            if (isEdit ? value !== initial[k] : value) payload[k] = value;
        });
        await onSubmit(payload);
    };

    const err = (key: keyof FormState) => (errors[key] ? <p className="mt-1.5 text-xs text-danger">{errors[key]}</p> : null);

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5 p-6">
            <div>
                <h2 className="text-lg font-semibold text-heading">{isEdit ? 'Edit outlet' : 'New outlet'}</h2>
                <p className="mt-1 text-sm text-muted">
                    {isEdit ? 'Changes apply everywhere this outlet is used.' : 'Add a branch, kitchen or counter that takes orders.'}
                </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
                <div>
                    <Label htmlFor="outlet-name">Outlet name</Label>
                    <Input id="outlet-name" value={form.name} onChange={handleChange('name')} placeholder="Anna Nagar branch" className={errors.name ? 'border-danger' : ''} autoFocus />
                    {err('name')}
                </div>
                <div>
                    <Label htmlFor="outlet-code">Short code</Label>
                    <Input id="outlet-code" value={form.code} onChange={handleChange('code')} placeholder="ANG" maxLength={5} className="uppercase" />
                    <p className="mt-1.5 text-xs text-muted">Up to 5 letters, shown on bills.</p>
                </div>
            </div>

            <div>
                <Label htmlFor="outlet-phone">Phone (optional)</Label>
                <Input id="outlet-phone" value={form.phone} onChange={handleChange('phone')} placeholder="9876543210" className={errors.phone ? 'border-danger' : ''} />
                {err('phone')}
            </div>

            <div>
                <Label htmlFor="outlet-address">Address (optional)</Label>
                <textarea
                    id="outlet-address"
                    rows={3}
                    value={form.address}
                    onChange={handleChange('address')}
                    placeholder="Street, area, city"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                    Cancel
                </Button>
                <Button type="submit" isLoading={isPending} disabled={isPending || (isEdit && !isDirty)}>
                    {isEdit ? (
                        'Save changes'
                    ) : (
                        'Create outlet'
                    )}
                </Button>
            </div>
        </form>
    );
});

/* -------------------------------------------------------------------------- */
/*  Outlet detail (right panel) - fetched with useGetOutletById               */
/* -------------------------------------------------------------------------- */

interface DetailProps {
    outletId: string;
    currentId?: string;
    canWrite: boolean;
    canHardDelete: boolean;
    onBack: () => void;
    onEdit: () => void;
    onDeactivated: () => void;
    onRestored: () => void;
    onDeleted: () => void;
}

const OutletDetail = ({ outletId, currentId, canWrite, canHardDelete, onBack, onEdit, onDeactivated, onRestored, onDeleted }: DetailProps) => {
    const dispatch = useDispatch();
    const { data, isLoading, error, refetch, isFetching } = useGetOutletById(outletId);
    const outlet = data as OutletData | undefined;

    const { mutateAsync: deactivateAsync, isPending: isDeactivating } = useSoftDeleteOutlet();
    const { mutateAsync: restoreAsync, isPending: isRestoring } = useRestoreOutlet();
    const { mutateAsync: deleteAsync, isPending: isDeleting } = useHardDeleteOutlet();

    const [confirm, setConfirm] = useState<Confirm>(null);
    const busy = isDeactivating || isRestoring || isDeleting;

    useEffect(() => setConfirm(null), [outletId]);

    const handleDeactivate = async () => {
        try {
            await deactivateAsync(outletId);
            toast.success('Outlet deactivated');
            setConfirm(null);
            onDeactivated();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to deactivate outlet');
        }
    };

    const handleRestore = async () => {
        try {
            await restoreAsync(outletId);
            toast.success('Outlet restored');
            onRestored();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to restore outlet');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteAsync(outletId);
            toast.success('Outlet deleted permanently');
            onDeleted();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete outlet');
            setConfirm(null);
        }
    };

    const handleMakeCurrent = () => {
        if (!outlet) return;
        dispatch(setCurrentOutlet(toCurrent(outlet)));
        toast.success(`${outlet.name} is now your current outlet`);
    };

    if (isLoading) {
        return (
            <div className="space-y-4 p-6" aria-busy="true">
                <div className="h-16 w-2/3 animate-pulse rounded-lg bg-surface-hover" />
                <div className="h-40 animate-pulse rounded-lg bg-surface-hover" />
            </div>
        );
    }
    if (error || !outlet) {
        return (
            <PanelMessage
                icon={<AlertCircle className="h-5 w-5" />}
                title="Could not load outlet"
                text={error?.message}
                action={
                    <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Try again
                    </Button>
                }
            />
        );
    }

    const isCurrent = outlet._id === currentId;

    return (
        <div>
            <div className="flex items-start gap-4 p-6">
                <button type="button" onClick={onBack} aria-label="Back to outlets" className="mt-1 text-muted hover:text-heading lg:hidden">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <CodeBadge code={outlet.code} active={outlet.isActive} large />
                <div className="min-w-0 flex-1">
                    <h2 className="break-words text-xl font-semibold text-heading">{outlet.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${outlet.isActive ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
                                }`}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full ${outlet.isActive ? 'bg-success' : 'bg-danger'}`} />
                            {outlet.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {isCurrent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                                <Check className="h-3 w-3" /> Current outlet
                            </span>
                        )}
                        {outlet.outletNo && <span className="text-xs text-muted">{outlet.outletNo}</span>}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 border-y border-border px-6 py-3">
                {outlet.isActive && !isCurrent && (
                    <Button type="button" onClick={handleMakeCurrent} leftIcon={<Store className="mr-2 h-4 w-4" />} disabled={busy}>

                        Set as current outlet
                    </Button>
                )}
                {canWrite && outlet.isActive && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onEdit}
                        disabled={busy}
                        leftIcon={<Pencil className="h-4 w-4" />}
                    >
                        Edit
                    </Button>
                )}
                {canWrite && !outlet.isActive && (
                    <Button type="button"
                        leftIcon={<RotateCcw className="mr-2 h-4 w-4" />}
                        isLoading={isRestoring}
                        onClick={handleRestore} disabled={busy}>
                        Restore
                    </Button>
                )}
                {canWrite && outlet.isActive && (
                    <Button type="button" variant="outline"
                        leftIcon={<Ban className="mr-2 h-4 w-4" />}
                        onClick={() => setConfirm('deactivate')} disabled={busy}>
                        Deactivate
                    </Button>
                )}
                {canHardDelete && (
                    <Button type="button" variant="outline"
                        leftIcon={<Trash2 className="mr-2 h-4 w-4" />}
                        onClick={() => setConfirm('delete')} disabled={busy} className="ml-auto text-danger">

                        Delete
                    </Button>
                )}
            </div>

            {confirm && (
                <div role="alertdialog" aria-live="polite" className="mx-6 mt-5 rounded-lg border border-danger bg-danger-soft p-4">
                    <p className="text-sm font-medium text-heading">
                        {confirm === 'delete' ? `Delete ${outlet.name} permanently?` : `Deactivate ${outlet.name}?`}
                    </p>
                    <p className="mt-1 text-sm text-body">
                        {confirm === 'delete'
                            ? 'This cannot be undone. Outlets that already have orders cannot be deleted; deactivate them instead.'
                            : 'It will stop appearing in outlet pickers. You can restore it any time.'}
                    </p>
                    <div className="mt-3 flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
                            Keep outlet
                        </Button>
                        <Button type="button"
                            isLoading={busy}
                            onClick={confirm === 'delete' ? handleDelete : handleDeactivate} disabled={busy}>
                            {/* {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} */}
                            {confirm === 'delete' ? 'Delete outlet' : 'Deactivate'}
                        </Button>
                    </div>
                </div>
            )}

            <dl className="divide-y divide-border px-6">
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone">{outlet.phone || 'Not added'}</InfoRow>
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address">{outlet.address || 'Not added'}</InfoRow>
                <div className="grid grid-cols-2 gap-4 py-3.5">
                    <div>
                        <dt className="text-xs text-muted">Created</dt>
                        <dd className="mt-0.5 text-sm font-medium text-heading">{formatDate(outlet.createdAt)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted">Last updated</dt>
                        <dd className="mt-0.5 text-sm font-medium text-heading">{formatDate(outlet.updatedAt)}</dd>
                    </div>
                </div>
            </dl>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const OutletMain = () => {
    const dispatch = useDispatch();
    const { currentRole } = useAuthData();
    const currentOutlet = useSelector(selectCurrentOutlet);

    const canWrite = OUTLET_WRITE_ROLES.includes(currentRole);
    const canSeeInactive = OUTLET_INACTIVE_READ_ROLES.includes(currentRole);
    const canHardDelete = OUTLET_HARD_DELETE_ROLES.includes(currentRole);

    const [tab, setTab] = useState<Tab>('active');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mode, setMode] = useState<Mode>('view');

    const activeQuery = useGetOutletList();
    const { mutateAsync: createOutletAsync, isPending: isCreating } = useCreateOutlet();
    const { mutateAsync: updateOutletAsync, isPending: isUpdating } = useUpdateOutlet();

    const activeOutlets = useMemo(() => toOutletArray(activeQuery.data), [activeQuery.data]);
    const filteredActive = useMemo(() => filterOutlets(activeOutlets, query), [activeOutlets, query]);

    // Keep the Redux current outlet valid: pick a default, follow renames, drop when none remain
    useEffect(() => {
        if (!activeQuery.isSuccess) return;
        if (!activeOutlets.length) {
            if (currentOutlet) dispatch(clearCurrentOutlet());
            return;
        }
        const match = activeOutlets.find((o) => o._id === currentOutlet?._id);
        if (!match) dispatch(setCurrentOutlet(toCurrent(activeOutlets[0])));
        else if (match.name !== currentOutlet?.name || match.code !== currentOutlet?.code) dispatch(setCurrentOutlet(toCurrent(match)));
    }, [activeQuery.isSuccess, activeOutlets, currentOutlet, dispatch]);

    const handleSelect = useCallback((id: string) => {
        setSelectedId(id);
        setMode('view');
    }, []);

    const handleNew = () => {
        setSelectedId(null);
        setMode('create');
    };

    const handleTab = (next: Tab) => {
        setTab(next);
        setSelectedId(null);
        setMode('view');
    };

    const handleCreate = async (payload: Partial<OutletPayload>) => {
        try {
            const res = await createOutletAsync(payload as OutletPayload);
            toast.success('Outlet created successfully');
            const createdId = res?.data?._id as string | undefined;
            setSelectedId(createdId ?? null);
            setMode('view');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to create outlet');
        }
    };

    const handleUpdate = async (payload: Partial<OutletPayload>) => {
        if (!selectedId) return;
        try {
            await updateOutletAsync({ outletId: selectedId, data: payload });
            toast.success('Outlet updated successfully');
            setMode('view');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update outlet');
        }
    };

    // The edit form needs the outlet record; it is already cached by the detail panel
    const editTarget = useMemo(
        () => activeOutlets.find((o) => o._id === selectedId),
        [activeOutlets, selectedId]
    );

    const hasRightContent = mode !== 'view' || !!selectedId;

    return (
        <div className="mx-auto w-full">
            <header className="mb-6 flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-heading">Outlets</h1>
                    <p className="text-sm text-muted">Manage your branches and choose the one you are working in.</p>
                </div>
                {canWrite && (
                    <Button type="button"
                        leftIcon={<Plus className="h-4 w-4" />}
                        onClick={handleNew}>
                        New outlet
                    </Button>
                )}
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                {/* List */}
                <Card className={`overflow-hidden ${hasRightContent ? 'hidden lg:block' : ''}`}>
                    <div className="space-y-3 border-b border-border p-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or code" className="pl-9" aria-label="Search outlets" />
                        </div>
                        {canSeeInactive && (
                            <div className="grid grid-cols-2 rounded-lg bg-surface-hover p-1 text-sm font-medium" role="tablist">
                                {(['active', 'inactive'] as Tab[]).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        role="tab"
                                        aria-selected={tab === t}
                                        onClick={() => handleTab(t)}
                                        className={`rounded-md py-1.5 cursor-pointer  capitalize transition-colors ${tab === t ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-heading'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="max-h-[65vh] overflow-y-auto">
                        {tab === 'active' ? (
                            <OutletListView
                                outlets={filteredActive}
                                isLoading={activeQuery.isLoading}
                                errorMessage={activeQuery.error?.message}
                                onRetry={() => activeQuery.refetch()}
                                selectedId={selectedId}
                                currentId={currentOutlet?._id}
                                onSelect={handleSelect}
                                emptyTitle={query ? 'No matching outlets' : 'No outlets yet'}
                                emptyText={query ? 'Try a different name or code.' : canWrite ? 'Create your first outlet to start taking orders.' : 'Ask an admin to add an outlet.'}
                            />
                        ) : (
                            <InactiveList query={query} selectedId={selectedId} currentId={currentOutlet?._id} onSelect={handleSelect} />
                        )}
                    </div>
                </Card>

                {/* Detail / form */}
                <Card className={`min-h-[24rem] ${hasRightContent ? '' : 'hidden lg:block'}`}>
                    {mode === 'create' ? (
                        <OutletForm isPending={isCreating} onSubmit={handleCreate} onCancel={() => setMode('view')} />
                    ) : mode === 'edit' && editTarget ? (
                        <OutletForm key={editTarget._id} outlet={editTarget} isPending={isUpdating} onSubmit={handleUpdate} onCancel={() => setMode('view')} />
                    ) : selectedId ? (
                        <OutletDetail
                            outletId={selectedId}
                            currentId={currentOutlet?._id}
                            canWrite={canWrite}
                            canHardDelete={canHardDelete}
                            onBack={() => setSelectedId(null)}
                            onEdit={() => setMode('edit')}
                            onDeactivated={() => setTab('inactive')}
                            onRestored={() => setTab('active')}
                            onDeleted={() => setSelectedId(null)}
                        />
                    ) : (
                        <PanelMessage
                            icon={<Store className="h-5 w-5" />}
                            title="Select an outlet"
                            text="Pick an outlet from the list to see its details, or create a new one."
                        />
                    )}
                </Card>
            </div>
        </div>
    );
};

export default OutletMain;