import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { AlertCircle, CalendarClock, Filter, LayoutGrid, Loader2, MapPin, MoreVertical, Pencil, Phone, Plus, RefreshCw, RotateCcw, Search, Trash2, Users, X } from 'lucide-react';

import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Toggle } from '../../components/ui/Toggle';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { SideModal } from '../../components/ui/SideModal';
import { cn } from '../../lib/cn';
import { useAuthData } from '../../hooks/useAuthData';
import { selectCurrentOutlet } from '../../features/slices/outletSlice';
// TODO: fix these paths to match your project
import {
    TABLE_WRITE_ROLES, useCreateTable, useGetActiveTables, useGetInactiveTables, useGetTableById, useHardDeleteTable,
    useRecoverTable, useReserveTable, useSoftDeleteTable, useUpdateReservation, useUpdateTableDetails, useUpdateTableStatus, type TableStatus,
} from '../../api_service/restauranttable_api/restaurantTableApi';
import { useGetOutletDropdown } from '../../api_service/outlet_api/outletApi';
import { Dropdown, type DropdownItem } from '../../components/ui/Dropdown';

/* -------------------------------------------------------------------------- */
/*  Types, constants, helpers                                                 */
/* -------------------------------------------------------------------------- */

interface Reservation { customerName?: string; reservationTime?: string; phone?: string; notes?: string }
interface TableData extends Reservation {
    _id: string;
    tableName: string;
    capacity: number;
    location?: string | null;
    outletId?: string | { _id: string; name?: string };
    status: TableStatus;
    isActive?: boolean;
    currentReservation?: Reservation | null;
}
interface Option { label: string; value: string }
type PanelState = { mode: 'create' } | { mode: 'view' | 'edit' | 'reserve'; id: string; confirm?: 'deactivate' | 'delete' };
type StatusFilter = TableStatus | '';

const STATUS: Record<TableStatus, { label: string; pill: string; bar: string; dot: string }> = {
    available: { label: 'Available', pill: 'border-success/20 bg-success/10 text-success', bar: 'border-l-success', dot: 'bg-success' },
    occupied: { label: 'Occupied', pill: 'border-danger/20 bg-danger/10 text-danger', bar: 'border-l-danger', dot: 'bg-danger' },
    reserved: { label: 'Reserved', pill: 'border-warning/20 bg-warning/10 text-warning', bar: 'border-l-warning', dot: 'bg-warning' },
};
const STATUS_KEYS = Object.keys(STATUS) as TableStatus[];

const dateTime = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const formatDateTime = (v?: string) => {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? dateTime.format(d) : '-';
};
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const toArray = <T,>(data: unknown, keys: string[]): T[] => {
    if (Array.isArray(data)) return data as T[];
    const obj = (data ?? {}) as Record<string, unknown>;
    for (const k of keys) if (Array.isArray(obj[k])) return obj[k] as T[];
    return [];
};
const toTables = (data: unknown) => toArray<TableData>(data, ['tables', 'items', 'data']);
const toOptions = (data: unknown): Option[] =>
    toArray<Record<string, any>>(data, ['outlets', 'items', 'data'])
        .map((o) => ({ label: String(o.name ?? o.label ?? ''), value: String(o._id ?? o.value ?? o.id ?? '') }))
        .filter((o) => o.label && o.value);

const reservationOf = (t: TableData): Reservation | null => {
    const r = t.currentReservation ?? t;
    return r.customerName ? { customerName: r.customerName, reservationTime: r.reservationTime, phone: r.phone, notes: r.notes } : null;
};
const outletIdOf = (t: TableData) => (typeof t.outletId === 'string' ? t.outletId : t.outletId?._id ?? '');
const sortTables = (list: TableData[]) => [...list].sort((a, b) => a.tableName.localeCompare(b.tableName, undefined, { numeric: true }));

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

const StatusPill = ({ status }: { status: TableStatus }) => (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS[status].pill)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS[status].dot)} />
        {STATUS[status].label}
    </span>
);

const Message = ({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) => (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</span>
        <div>
            <h3 className="text-sm font-semibold text-heading">{title}</h3>
            {text && <p className="mt-1 text-sm text-muted">{text}</p>}
        </div>
        {action}
    </div>
);

/* -------------------------------------------------------------------------- */
/*  Table card                                                                */
/* -------------------------------------------------------------------------- */

interface CardProps {
    table: TableData;
    busy: boolean;
    inactive?: boolean;
    canWrite: boolean;

    onOpen: () => void;
    onStatus: (status: TableStatus) => void;
    onReserve: () => void;

    onEdit: () => void;
    onEditReservation: () => void;
    onDeactivate: () => void;
    onRestore: () => void;
    onDelete: () => void;
}

// const TableCard = ({ table, busy, inactive, onOpen, onStatus, onReserve }: CardProps) => {
const TableCard = ({ table, busy, inactive, onOpen, onStatus, onReserve, onEdit, onEditReservation, onDeactivate, onRestore, onDelete }: CardProps) => {

    const reservation = reservationOf(table);

    const menuItems: DropdownItem[] = [
        ...(!inactive ? [{ label: 'Edit table', icon: <Pencil className="h-3.5 w-3.5" />, onClick: onEdit }] : []),
        ...(!inactive && table.status === 'reserved' ? [{ label: 'Edit reservation', icon: <CalendarClock className="h-3.5 w-3.5" />, onClick: onEditReservation }] : []),
        ...(inactive
            ? [{ label: 'Restore', icon: <RotateCcw className="h-3.5 w-3.5" />, onClick: onRestore }]
            : [{ label: 'Deactivate', icon: <X className="h-3.5 w-3.5" />, onClick: onDeactivate }]),
        { label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, onClick: onDelete, isDanger: true },
    ];

    return (
        // <article className={cn('flex flex-col overflow-hidden rounded-xl border border-l-4 border-border bg-surface shadow-sm transition-shadow hover:shadow-md', inactive ? 'border-l-border opacity-75' : STATUS[table.status].bar)}>
        <article className={cn('relative flex flex-col cursor-pointer rounded-xl border border-border bg-surface shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md', inactive && 'opacity-75')}>
            <button type="button" onClick={onOpen} aria-label={`View table ${table.tableName}`} className="flex-1 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-lg font-semibold text-heading" title={table.tableName}>{table.tableName}</h3>
                    <div className="flex items-center justify-between gap-1">
                        {!inactive && <StatusPill status={table.status} />}

                        <Dropdown align="right"
                            triggerLabel={`Actions for ${table.tableName}`} items={menuItems}
                            trigger={
                                <span className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-heading">
                                    <MoreVertical className="h-4 w-4" />
                                </span>
                            } />
                    </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                    <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{table.capacity} {table.capacity === 1 ? 'seat' : 'seats'}</span>
                    {table.location && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{table.location}</span></span>}
                </div>
                {!inactive && table.status === 'reserved' && reservation && (
                    <div className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-body">
                        <p className="truncate font-medium text-heading">{reservation.customerName}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1.5 text-muted"><CalendarClock className="h-3.5 w-3.5" />{formatDateTime(reservation.reservationTime)}</p>
                    </div>
                )}
            </button>

            {!inactive && (
                <div className="flex gap-2 border-t border-border bg-surface-muted px-3 py-2.5">
                    {table.status === 'available' && (
                        <>
                            <Button size="sm" className="flex-1" disabled={busy} isLoading={busy} onClick={() => onStatus('occupied')}>Seat Occupied</Button>
                            <Button size="sm" variant="outline" className="flex-1" disabled={busy} onClick={onReserve}>Reserve</Button>
                        </>
                    )}
                    {table.status === 'occupied' && <Button size="sm" variant="outline" className="flex-1" disabled={busy} isLoading={busy} onClick={() => onStatus('available')}>Free table</Button>}
                    {table.status === 'reserved' && (
                        <>
                            <Button size="sm" className="flex-1" disabled={busy} isLoading={busy} onClick={() => onStatus('occupied')}>Seat Occupied</Button>
                            <Button size="sm" variant="outline" className="flex-1" disabled={busy} onClick={() => onStatus('available')}>Cancel</Button>
                        </>
                    )}
                </div>
            )}
        </article>
    );
};

/* -------------------------------------------------------------------------- */
/*  Tables view (summary chips + card grid)                                   */
/* -------------------------------------------------------------------------- */

interface ViewProps {
    items: TableData[];
    isLoading: boolean;
    errorMessage?: string;
    onRetry: () => void;
    inactive?: boolean;
    search: string;
    minSeats: string;
    location: string;
    status: StatusFilter;
    onStatus: (s: StatusFilter) => void;
    hasFilters: boolean;
    onClear: () => void;
    busyId: string | null;
    onOpen: (id: string) => void;
    onChangeStatus: (t: TableData, s: TableStatus) => void;
    onReserve: (id: string) => void;

    canWrite: boolean;
    onEdit: (id: string) => void;
    onEditReservation: (id: string) => void;
    onDeactivate: (id: string) => void;
    onDelete: (id: string) => void;
    onRestore: (t: TableData) => void;
}

const TablesView = (p: ViewProps) => {
    if (p.isLoading) return <div className="flex flex-1 items-center justify-center p-12" aria-busy="true"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (p.errorMessage) {
        return <Message icon={<AlertCircle className="h-5 w-5" />} title="Could not load tables" text={p.errorMessage} action={<Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={p.onRetry}>Try again</Button>} />;
    }

    const q = p.search.trim().toLowerCase();
    const seats = Number(p.minSeats) || 0;
    const base = p.items.filter((t) => (!q || t.tableName.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q)) && (!p.location || t.location === p.location) && t.capacity >= seats);
    const shown = sortTables(p.inactive || !p.status ? base : base.filter((t) => t.status === p.status));
    const count = (s: TableStatus) => base.filter((t) => t.status === s).length;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {!p.inactive && (
                <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-border p-3" role="group" aria-label="Filter by status">
                    {([['', 'All', base.length], ...STATUS_KEYS.map((s) => [s, STATUS[s].label, count(s)])] as [StatusFilter, string, number][]).map(([key, label, n]) => (
                        <button key={key || 'all'} type="button" aria-pressed={p.status === key} onClick={() => p.onStatus(key)} className={cn('inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors', p.status === key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-body hover:bg-surface-hover')}>
                            {key && <span className={cn('h-2 w-2 rounded-full', STATUS[key].dot)} />}
                            {label}
                            <span className="rounded-full bg-surface-muted px-1.5 text-xs tabular-nums text-muted">{n}</span>
                        </button>
                    ))}
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                {shown.length === 0 ? (
                    <Message
                        icon={<LayoutGrid className="h-5 w-5" />}
                        title={p.hasFilters ? 'No tables match your filters' : p.inactive ? 'No inactive tables' : 'No tables yet'}
                        text={p.hasFilters ? undefined : p.inactive ? 'Tables you deactivate will appear here.' : 'Add your first table to start seating guests.'}
                        action={p.hasFilters ? <Button variant="ghost" size="sm" onClick={p.onClear}>Clear filters</Button> : undefined}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {shown.map((t) => (
                            <TableCard key={t._id} table={t}
                            canWrite={true}
                            inactive={p.inactive} busy={p.busyId === t._id}
                                onOpen={() => p.onOpen(t._id)} onStatus={(s) => p.onChangeStatus(t, s)}
                                onReserve={() => p.onReserve(t._id)}
                                onEdit={() => p.onEdit(t._id)} onEditReservation={() => p.onEditReservation(t._id)}
                                onDeactivate={() => p.onDeactivate(t._id)} onDelete={() => p.onDelete(t._id)}
                                onRestore={() => p.onRestore(t)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="shrink-0 border-t border-border px-4 py-2 text-xs text-muted sm:px-6">
                {shown.length} {shown.length === 1 ? 'table' : 'tables'} · {shown.reduce((sum, t) => sum + t.capacity, 0)} seats
            </div>
        </div>
    );
};

type InactiveProps = Omit<ViewProps, 'items' | 'isLoading' | 'errorMessage' | 'onRetry' | 'inactive'> & { outletId: string };

// Mounted only while "Show inactive" is on, so that request stays lazy
const InactiveTables = ({ outletId, ...rest }: InactiveProps) => {
    const { data, isLoading, error, refetch } = useGetInactiveTables({ outletId: outletId || undefined });
    return <TablesView {...rest} items={toTables(data)} isLoading={isLoading} errorMessage={error?.message} onRetry={() => refetch()} inactive />;
};

/* -------------------------------------------------------------------------- */
/*  Forms                                                                     */
/* -------------------------------------------------------------------------- */

const TableForm = ({ table, outletOptions, defaultOutletId, locations, isPending, onSubmit, onCancel }: { table?: TableData; outletOptions: Option[]; defaultOutletId: string; locations: string[]; isPending: boolean; onSubmit: (v: { tableName: string; capacity: number; location: string; outletId?: string }) => Promise<void>; onCancel: () => void }) => {
    const [tableName, setTableName] = useState(table?.tableName ?? '');
    const [capacity, setCapacity] = useState(table ? String(table.capacity) : '');
    const [location, setLocation] = useState(table?.location ?? '');
    const [outletId, setOutletId] = useState(table ? outletIdOf(table) : defaultOutletId);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const clear = (k: string) => errors[k] && setErrors((p) => ({ ...p, [k]: '' }));

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const next: Record<string, string> = {};
        if (!tableName.trim()) next.tableName = 'Enter the table name or number';
        if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1) next.capacity = 'Enter seats as a whole number, 1 or more';
        setErrors(next);
        if (Object.keys(next).length) return;
        await onSubmit({ tableName: tableName.trim(), capacity: Number(capacity), location: location.trim(), outletId: outletId || undefined });
    };
    const err = (k: string) => (errors[k] ? <p className="mt-1.5 text-xs text-danger">{errors[k]}</p> : null);

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="grid grid-cols-[1fr_120px] gap-4">
                <div>
                    <Label htmlFor="table-name">Table name</Label>
                    <Input id="table-name" value={tableName} placeholder="T1, Window 2" autoFocus className={errors.tableName ? 'border-danger' : ''} onChange={(e: ChangeEvent<HTMLInputElement>) => { setTableName(e.target.value); clear('tableName'); }} />
                    {err('tableName')}
                </div>
                <div>
                    <Label htmlFor="table-seats">Seats</Label>
                    <Input id="table-seats" type="number" inputMode="numeric" min={1} value={capacity} placeholder="4" className={errors.capacity ? 'border-danger' : ''} onChange={(e: ChangeEvent<HTMLInputElement>) => { setCapacity(e.target.value); clear('capacity'); }} />
                </div>
            </div>
            {err('capacity')}
            <div>
                <Label htmlFor="table-location">Location (optional)</Label>
                <Input id="table-location" list="table-locations" value={location} placeholder="Ground floor, Terrace" onChange={(e: ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)} />
                <datalist id="table-locations">{locations.map((l) => <option key={l} value={l} />)}</datalist>
            </div>
            <SearchSelect label="Outlet" options={outletOptions} value={outletId} placeholder="Select an outlet" onChange={(o) => setOutletId(String(o.value))} onClear={() => setOutletId('')} />
            <div className="flex gap-3 border-t border-border pt-5">
                <Button variant="outline" onClick={onCancel} disabled={isPending} className="flex-1">Cancel</Button>
                <Button type="submit" isLoading={isPending} loadingText="Saving" className="flex-1">{table ? 'Save changes' : 'Create table'}</Button>
            </div>
        </form>
    );
};
const ReserveForm = ({ table, reservation, isPending, onSubmit, onCancel }: { table: TableData; reservation?: Reservation | null; isPending: boolean; onSubmit: (v: { customerName: string; reservationTime: string; phone?: string; notes?: string }) => Promise<void>; onCancel: () => void }) => {
  const isEdit = !!reservation;
  const [customerName, setCustomerName] = useState(reservation?.customerName ?? '');
  const [time, setTime] = useState(toLocalInput(reservation?.reservationTime ? new Date(reservation.reservationTime) : new Date(Date.now() + 60 * 60 * 1000)));
  const [phone, setPhone] = useState(reservation?.phone ?? '');
  const [notes, setNotes] = useState(reservation?.notes ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const clear = (k: string) => errors[k] && setErrors((p) => ({ ...p, [k]: '' }));

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const next: Record<string, string> = {};
        if (!customerName.trim()) next.customerName = 'Enter the guest name';
        if (!time || Number.isNaN(new Date(time).getTime())) next.time = 'Choose the reservation time';
        if (phone.trim() && !/^\+?[\d\s-]{7,15}$/.test(phone.trim())) next.phone = 'Enter a valid phone number';
        setErrors(next);
        if (Object.keys(next).length) return;
        await onSubmit({ customerName: customerName.trim(), reservationTime: new Date(time).toISOString(), phone: phone.trim() || undefined, notes: notes.trim() || undefined });
    };
    const err = (k: string) => (errors[k] ? <p className="mt-1.5 text-xs text-danger">{errors[k]}</p> : null);

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <p className="text-sm text-muted">Reserving <span className="font-medium text-heading">{table.tableName}</span> · {table.capacity} seats</p>
            <div>
                <Label htmlFor="res-name">Guest name</Label>
                <Input id="res-name" value={customerName} autoFocus className={errors.customerName ? 'border-danger' : ''} onChange={(e: ChangeEvent<HTMLInputElement>) => { setCustomerName(e.target.value); clear('customerName'); }} />
                {err('customerName')}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <Label htmlFor="res-time">Date and time</Label>
                    <Input id="res-time" type="datetime-local" value={time} className={errors.time ? 'border-danger' : ''} onChange={(e: ChangeEvent<HTMLInputElement>) => { setTime(e.target.value); clear('time'); }} />
                    {err('time')}
                </div>
                <div>
                    <Label htmlFor="res-phone">Phone (optional)</Label>
                    {/* <Input id="res-phone" value={phone} placeholder="9876543210" className={errors.phone ? 'border-danger' : ''} onChange={(e: ChangeEvent<HTMLInputElement>) => { setPhone(e.target.value); clear('phone'); }} /> */}
                    <Input id="res-phone" type="tel" inputMode="numeric" maxLength={10} value={phone} placeholder="9876543210" className={errors.phone ? 'border-danger' : ''} onChange={(e: ChangeEvent<HTMLInputElement>) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); clear('phone'); }} />
                    {err('phone')}
                </div>
            </div>
            <div>
                <Label htmlFor="res-notes">Notes (optional)</Label>
                <textarea id="res-notes" rows={3} value={notes} placeholder="Birthday, high chair needed..." onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex gap-3 border-t border-border pt-5">
                <Button variant="outline" onClick={onCancel} disabled={isPending} className="flex-1">Cancel</Button>
                {/* <Button type="submit" isLoading={isPending} loadingText="Reserving" className="flex-1">Reserve table</Button> */}
                <Button type="submit" isLoading={isPending} loadingText="Saving" className="flex-1">{isEdit ? 'Save reservation' : 'Reserve table'}</Button>
            </div>
        </form>
    );
};

/* -------------------------------------------------------------------------- */
/*  Side panel content                                                        */
/* -------------------------------------------------------------------------- */

interface PanelProps { state: PanelState; onChange: (s: PanelState) => void; onClose: () => void; onShowInactive: (v: boolean) => void; canWrite: boolean; outletOptions: Option[]; defaultOutletId: string; locations: string[] }

const PanelContent = ({ state, onChange, onClose, onShowInactive, canWrite, outletOptions, defaultOutletId, locations }: PanelProps) => {


    const { mutateAsync: updateReservationAsync, isPending: isUpdatingReservation } = useUpdateReservation();
    const [confirm, setConfirm] = useState<'deactivate' | 'delete' | null>(state.mode === 'view' ? state.confirm ?? null : null);

    const id = state.mode === 'create' ? undefined : state.id;
    const { data, isLoading, error, refetch, isFetching } = useGetTableById(id);
    const table = data as TableData | undefined;

    console.log("table", table)

    const { mutateAsync: createAsync, isPending: isCreating } = useCreateTable();
    const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateTableDetails();
    const { mutateAsync: statusAsync, isPending: isStatusing } = useUpdateTableStatus();
    const { mutateAsync: reserveAsync, isPending: isReserving } = useReserveTable();
    const { mutateAsync: deactivateAsync, isPending: isDeactivating } = useSoftDeleteTable();
    const { mutateAsync: recoverAsync, isPending: isRecovering } = useRecoverTable();
    const { mutateAsync: deleteAsync, isPending: isDeleting } = useHardDeleteTable();

    const busy = isCreating || isUpdating || isStatusing || isReserving || isUpdatingReservation || isDeactivating || isRecovering || isDeleting;

    // const [confirm, setConfirm] = useState<'deactivate' | 'delete' | null>(null);
    // const busy = isCreating || isUpdating || isStatusing || isReserving || isDeactivating || isRecovering || isDeleting;

    const run = async (action: () => Promise<unknown>, ok: string, fail: string, after?: () => void) => {
        try {
            await action();
            toast.success(ok);
            setConfirm(null);
            after?.();
        } catch (err: any) {
            toast.error(err?.message || fail);
            setConfirm(null);
        }
    };

    if (state.mode === 'create') {
        return (
            <TableForm outletOptions={outletOptions} defaultOutletId={defaultOutletId} locations={locations} isPending={isCreating} onCancel={onClose}
                onSubmit={async (values) => {
                    try {
                        const res = await createAsync(values);
                        toast.success('Table created successfully');
                        onShowInactive(false);
                        const createdId = res?.data?._id as string | undefined;
                        if (createdId) onChange({ mode: 'view', id: createdId });
                        else onClose();
                    } catch (err: any) {
                        toast.error(err?.message || 'Failed to create table');
                    }
                }}
            />
        );
    }

    if (isLoading) return <div className="flex items-center justify-center py-16" aria-busy="true"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
    if (error || !table) {
        return <Message icon={<AlertCircle className="h-5 w-5" />} title="Could not load table" text={error?.message} action={<Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} isLoading={isFetching} onClick={() => refetch()}>Try again</Button>} />;
    }

    const backToView = () => onChange({ mode: 'view', id: table._id });

    if (state.mode === 'edit') {
        return (
            <TableForm key={table._id} table={table} outletOptions={outletOptions} defaultOutletId={defaultOutletId} locations={locations} isPending={isUpdating} onCancel={backToView}
                onSubmit={(values) => run(() => updateAsync({ id: table._id, ...values }), 'Table updated successfully', 'Failed to update table', backToView)}
            />
        );
    }

    // if (state.mode === 'reserve') {
    //     return (
    //         <ReserveForm table={table} isPending={isReserving} onCancel={backToView}
    //             onSubmit={(values) => run(() => reserveAsync({ id: table._id, ...values }), 'Table reserved', 'Failed to reserve table', backToView)}
    //         />
    //     );
    // }


    if (state.mode === 'reserve') {
        const existing = table.status === 'reserved' ? reservationOf(table) : null;
        return (
            <ReserveForm table={table} reservation={existing} isPending={isReserving || isUpdatingReservation} onCancel={backToView}
                onSubmit={(values) => existing
                    ? run(() => updateReservationAsync({ id: table._id, ...values }), 'Reservation updated', 'Failed to update reservation', backToView)
                    : run(() => reserveAsync({ id: table._id, ...values }), 'Table reserved', 'Failed to reserve table', backToView)}
            />
        );
    }

    const isActive = table.isActive !== false;
    const reservation = reservationOf(table);
    const outletName = (typeof table.outletId === 'object' && table.outletId?.name) || outletOptions.find((o) => o.value === outletIdOf(table))?.label || '-';

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="break-words text-xl font-semibold text-heading">{table.tableName}</h3>
                    <p className="text-sm text-muted">{outletName}</p>
                </div>
                {isActive ? <StatusPill status={table.status} /> : <span className="rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted">Inactive</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface-muted p-3">
                    <p className="flex items-center gap-1 text-xs text-muted"><Users className="h-3 w-3" /> Seats</p>
                    <p className="mt-0.5 text-lg font-semibold text-heading">{table.capacity}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted p-3">
                    <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> Location</p>
                    <p className="mt-0.5 truncate text-lg font-semibold text-heading" title={table.location ?? ''}>{table.location || '-'}</p>
                </div>
            </div>

            {isActive && (
                <section>
                    <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Table status</h4>
                    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Table status">
                        {STATUS_KEYS.map((s) => (
                            <button key={s} type="button" disabled={busy || table.status === s} aria-pressed={table.status === s}
                                onClick={() => (s === 'reserved' ? onChange({ mode: 'reserve', id: table._id }) : run(() => statusAsync({ id: table._id, status: s }), `Table marked ${STATUS[s].label.toLowerCase()}`, 'Failed to update status'))}
                                className={cn('flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-medium transition-colors disabled:cursor-default', table.status === s ? STATUS[s].pill : 'border-border text-body hover:bg-surface-hover disabled:opacity-50')}>
                                <span className={cn('h-2 w-2 rounded-full', STATUS[s].dot)} />{STATUS[s].label}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {isActive && table.status === 'reserved' && reservation && (
                <section className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-xs font-medium uppercase tracking-wider text-muted">Reservation</h4>
                        <Button size="sm" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} disabled={busy} onClick={() => onChange({ mode: 'reserve', id: table._id })}>Edit</Button>
                    </div>
                    <p className="font-medium text-heading">{reservation.customerName}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-body"><CalendarClock className="h-4 w-4 text-muted" />{formatDateTime(reservation.reservationTime)}</p>
                    {reservation.phone && <p className="mt-1 flex items-center gap-2 text-sm text-body"><Phone className="h-4 w-4 text-muted" />{reservation.phone}</p>}
                    {reservation.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted">{reservation.notes}</p>}
                </section>
            )}

            {canWrite && (
                <div className="space-y-4 border-t border-border pt-5">
                    <Toggle checked={isActive} disabled={busy} label="Active" description="Inactive tables are hidden from the floor."
                        onChange={(next: boolean) => (next ? run(() => recoverAsync(table._id), 'Table restored', 'Failed to restore table', () => onShowInactive(false)) : setConfirm('deactivate'))} />
                    <div className="flex flex-wrap gap-2">
                        {isActive && <Button leftIcon={<Pencil className="h-4 w-4" />} onClick={() => onChange({ mode: 'edit', id: table._id })} disabled={busy}>Edit</Button>}
                        <Button variant="outline" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm('delete')} disabled={busy} className="ml-auto text-danger">Delete</Button>
                    </div>
                </div>
            )}

            {confirm && (
                <div role="alertdialog" className="rounded-lg border border-danger/30 bg-danger/5 p-4">
                    <p className="text-sm font-medium text-heading">{confirm === 'delete' ? `Delete ${table.tableName} permanently?` : `Deactivate ${table.tableName}?`}</p>
                    <p className="mt-1 text-sm text-body">{confirm === 'delete' ? 'This cannot be undone. Deactivate it instead if you may need it again.' : 'It will be removed from the floor. You can restore it any time.'}</p>
                    <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setConfirm(null)} disabled={busy}>Keep table</Button>
                        {confirm === 'delete' ? (
                            <Button size="sm" isLoading={isDeleting} loadingText="Deleting" onClick={() => run(() => deleteAsync(table._id), 'Table deleted permanently', 'Failed to delete table', onClose)}>Delete table</Button>
                        ) : (
                            <Button size="sm" isLoading={isDeactivating} loadingText="Deactivating" onClick={() => run(() => deactivateAsync(table._id), 'Table deactivated', 'Failed to deactivate table', () => onShowInactive(true))}>Deactivate</Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const RestaurantTableMain = () => {
    const { currentRole } = useAuthData();
    const canWrite = TABLE_WRITE_ROLES.includes(currentRole!);
    const currentOutlet = useSelector(selectCurrentOutlet);

    const [search, setSearch] = useState('');
    const [outletId, setOutletId] = useState(currentOutlet?._id ?? '');
    const [location, setLocation] = useState('');
    const [minSeats, setMinSeats] = useState('');
    const [status, setStatus] = useState<StatusFilter>('');
    const [showInactive, setShowInactive] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const { mutateAsync: recoverAsync } = useRecoverTable();


    const handleRestore = async (t: TableData) => {
        setBusyId(t._id);
        try {
            await recoverAsync(t._id);
            toast.success(`${t.tableName} restored`);
            setShowInactive(false);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to restore table');
        } finally {
            setBusyId(null);
        }
    };

    // The panel keeps its last content while it slides out, so closing does not flash empty
    const [panel, setPanel] = useState<PanelState | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const openPanel = (s: PanelState) => { setPanel(s); setPanelOpen(true); };
    const closePanel = () => setPanelOpen(false);

    const { data: outletData } = useGetOutletDropdown();
    const outletOptions = toOptions(outletData);

    const activeQuery = useGetActiveTables({ outletId: outletId || undefined });
    const activeTables = toTables(activeQuery.data);
    const locations = [...new Set(activeTables.map((t) => t.location).filter((l): l is string => !!l))].sort();
    const locationOptions: Option[] = locations.map((l) => ({ label: l, value: l }));

    const { mutateAsync: statusAsync } = useUpdateTableStatus();

    const handleStatus = async (t: TableData, next: TableStatus) => {
        setBusyId(t._id);
        try {
            await statusAsync({ id: t._id, status: next });
            toast.success(`${t.tableName} marked ${STATUS[next].label.toLowerCase()}`);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update table status');
        } finally {
            setBusyId(null);
        }
    };

    const filterCount = [search, location, minSeats, status, outletId !== (currentOutlet?._id ?? '') ? outletId : ''].filter(Boolean).length;
    const clearFilters = () => { setSearch(''); setLocation(''); setMinSeats(''); setStatus(''); setOutletId(currentOutlet?._id ?? ''); };

    const viewProps = {
        search, minSeats, location, status, onStatus: setStatus, hasFilters: filterCount > 0, onClear: clearFilters, busyId,
        onOpen: (id: string) => openPanel({ mode: 'view', id }),
        onChangeStatus: handleStatus,
        onReserve: (id: string) => openPanel({ mode: 'reserve', id }),

        canWrite,
        onEdit: (id: string) => openPanel({ mode: 'edit', id }),
        onEditReservation: (id: string) => openPanel({ mode: 'reserve', id }),
        onDeactivate: (id: string) => openPanel({ mode: 'view', id, confirm: 'deactivate' }),
        onDelete: (id: string) => openPanel({ mode: 'view', id, confirm: 'delete' }),
        onRestore: handleRestore,
    };

    const title = !panel ? '' : panel.mode === 'create' ? 'New table' : panel.mode === 'edit' ? 'Edit table' : panel.mode === 'reserve' ? 'Reserve table' : 'Table details';

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-page">
            <header className="mb-3 flex shrink-0 flex-col justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-2.5">
                    <LayoutGrid className="h-6 w-6 shrink-0 text-primary" />
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-heading sm:text-2xl">Tables</h1>
                        <p className="text-sm text-muted">Live floor status, seating and reservations.</p>
                    </div>
                </div>
                <div className="flex w-full items-center gap-3 sm:w-auto">
                    <Button variant="secondary" className="inline-flex flex-1 items-center justify-center whitespace-nowrap lg:hidden sm:flex-none" leftIcon={<Filter className="h-4 w-4" />} onClick={() => setIsMobileFilterOpen(true)}>
                        Filters{filterCount > 0 ? ` (${filterCount})` : ''}
                    </Button>
                    {canWrite && (
                        <Button className="inline-flex flex-1 items-center justify-center whitespace-nowrap sm:flex-none" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openPanel({ mode: 'create' })}>
                            Add table
                        </Button>
                    )}
                </div>
            </header>

            <div className="relative flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
                {isMobileFilterOpen && <div className="fixed inset-0 z-40 bg-heading/40 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileFilterOpen(false)} />}

                <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-2xl transition-transform duration-300 ease-in-out', 'lg:static lg:w-[280px] lg:shrink-0 lg:translate-x-0 lg:shadow-sm xl:w-[320px]', isMobileFilterOpen ? 'translate-x-0' : '-translate-x-full')} aria-label="Filters">
                    <div className="flex shrink-0 items-center justify-between border-b border-border pb-3">
                        <h3 className="flex items-center gap-2 font-semibold text-heading"><Filter size={16} className="text-muted" /> Filters</h3>
                        <button className="text-muted hover:text-heading lg:hidden" onClick={() => setIsMobileFilterOpen(false)} aria-label="Close filters"><X size={20} /></button>
                    </div>

                    <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-1">
                        <div>
                            <Label htmlFor="table-search">Search</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                                <Input id="table-search" leftIcon={<Search size={18} />} className="pl-9" placeholder="Table or location..." value={search} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
                            </div>
                        </div>
                        <SearchSelect label="Outlet" options={outletOptions} value={outletId} onChange={(o) => setOutletId(String(o.value))} onClear={() => setOutletId('')} placeholder="All outlets" />
                        <SearchSelect label="Location" options={locationOptions} value={location} onChange={(o) => setLocation(String(o.value))} onClear={() => setLocation('')} placeholder="All locations" />
                        <div>
                            <Label htmlFor="table-min-seats">Minimum seats</Label>
                            <Input id="table-min-seats" type="number" inputMode="numeric" min={1} placeholder="Any" value={minSeats} onChange={(e: ChangeEvent<HTMLInputElement>) => setMinSeats(e.target.value)} />
                        </div>
                        <div className="rounded-lg border border-border p-3">
                            <Toggle size="sm" checked={showInactive} onChange={(v: boolean) => setShowInactive(v)} label="Show inactive tables" description="Deactivated tables you can restore." />
                        </div>
                    </div>

                    <div className="mt-auto shrink-0 border-t border-border pt-3">
                        <Button variant="outline" className="mb-2 w-full" onClick={clearFilters} disabled={filterCount === 0}>Clear filters</Button>
                        <Button className="w-full lg:hidden" onClick={() => setIsMobileFilterOpen(false)}>Show results</Button>
                    </div>
                </aside>

                <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm" aria-live="polite">
                    {showInactive ? (
                        <InactiveTables {...viewProps} outletId={outletId} />
                    ) : (
                        <TablesView {...viewProps} items={activeTables} isLoading={activeQuery.isLoading} errorMessage={activeQuery.error?.message} onRetry={() => activeQuery.refetch()} />
                    )}
                </section>
            </div>

            <SideModal isOpen={panelOpen} onClose={closePanel} title={title}>
                {panel && (
                    <PanelContent key={`${panel.mode}-${'id' in panel ? panel.id : 'new'}`} state={panel} onChange={setPanel} onClose={closePanel} 
                    onShowInactive={setShowInactive} canWrite={canWrite} outletOptions={outletOptions} defaultOutletId={outletId} locations={locations} />
                )}
            </SideModal>
        </div>
    );
};

export default RestaurantTableMain;