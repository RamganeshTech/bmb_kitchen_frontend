import { useState, type ReactNode } from 'react';
import {
    Archive, ChevronsRight, Eye, LifeBuoy, MoreVertical, Plus,
    RefreshCw, RotateCcw, Search, ShieldAlert, Trash2,
} from 'lucide-react';
import { useAuthData } from '../../hooks/useAuthData';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dropdown } from '../../components/ui/Dropdown';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { SideModal } from '../../components/ui/SideModal';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import {
    SUPPORT_TICKET_ADMIN_ROLES, SUPPORT_TICKET_MANAGEMENT_ROLES, useAdvanceTicketStatus,
    useCreateTicket, useGetTicket, useHardDeleteTicket, useListActiveTickets,
    useListInactiveTickets, useRestoreTicket, useSoftDeleteTicket, type CreateSupportTicketPayload,
    type SupportTicketItem, type TicketCategory, type TicketPriority, type TicketStatus,
} from '../../api_service/supportTicket_api/supportTicketApi';
import { useGetOutletList } from '../../api_service/outlet_api/outletApi';

// ── Constants ─────────────────────────────────────────────────────────────────
const TICKET_STATUSES: TicketStatus[] = ['Open', 'In progress', 'Closed'];
const TICKET_PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High'];
const TICKET_CATEGORIES: TicketCategory[] = [
    'Billing / POS',
    'Printer',
    'Inventory',
    'Reports',
    'Integration',
    'Account & plan',
    'Other',
];
const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((category) => ({ label: category, value: category }));

const STATUS_PRESENTATION: Record<TicketStatus, { badgeClass: string; dotClass: string; advanceLabel: string; description: string }> = {
    Open: {
        badgeClass: 'bg-primary text-white',
        dotClass: 'bg-primary',
        advanceLabel: 'Start working',
        description: 'Waiting for someone to pick it up',
    },
    'In progress': {
        badgeClass: 'bg-info text-white',
        dotClass: 'bg-info',
        advanceLabel: 'Close ticket',
        description: 'Being looked into',
    },
    Closed: {
        badgeClass: 'bg-success text-white',
        dotClass: 'bg-success',
        advanceLabel: 'Reopen ticket',
        description: 'Resolved',
    },
};

const PRIORITY_PRESENTATION: Record<TicketPriority, { badgeClass: string; description: string }> = {
    Low: { badgeClass: 'bg-muted text-white', description: 'Can wait' },
    Medium: { badgeClass: 'bg-warning text-white', description: 'Needs attention soon' },
    High: { badgeClass: 'bg-danger text-white', description: 'Blocking your work' },
};

// ── Types ─────────────────────────────────────────────────────────────────────
type PendingActionKind = 'advance' | 'deactivate' | 'restore' | 'hardDelete';
interface PendingAction {
    kind: PendingActionKind;
    ticket: SupportTicketItem;
}

interface OutletListEntry {
    id?: string;
    _id?: string;
    name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const getTicketId = (ticket: SupportTicketItem) => ticket.id ?? ticket._id;
const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const formatDate = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const resolveOutletName = (ticket: SupportTicketItem, outletNameById: Map<string, string>) =>
    typeof ticket.outletId === 'string'
        ? (outletNameById.get(ticket.outletId) ?? 'Unknown outlet')
        : (ticket.outletId?.name ?? 'Unknown outlet');

const resolveRaisedByName = (ticket: SupportTicketItem) =>
    typeof ticket.raisedBy === 'string' ? '—' : (ticket.raisedBy?.userName ?? ticket.raisedBy?.name ?? '—');

// ── Presentational pieces ─────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: TicketStatus }) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PRESENTATION[status].badgeClass}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        {status}
    </span>
);

const PriorityBadge = ({ priority }: { priority: TicketPriority }) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_PRESENTATION[priority].badgeClass}`}>
        {priority}
    </span>
);

const TABLE_COLUMN_COUNT = 9; // S.No + 8 existing columns

const TableMessageRow = ({ message }: { message: string }) => (
    <Tr>
        <Td colSpan={TABLE_COLUMN_COUNT}>
            <div className="flex min-h-[220px] items-center justify-center px-4 text-center text-muted">{message}</div>
        </Td>
    </Tr>
);

const SummaryCard = ({
    label,
    count,
    hint,
    dotClass,
    isSelected,
    onToggle,
}: {
    label: string;
    count: number;
    hint: string;
    dotClass: string;
    isSelected: boolean;
    onToggle: () => void;
}) => (
    <button
        type="button"
        aria-pressed={isSelected}
        onClick={onToggle}
        className={`flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-colors ${isSelected ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-hover'
            }`}
    >
        <span className="flex items-center gap-2 text-sm font-medium text-body">
            <span className={`h-2 w-2 rounded-full ${dotClass}`} />
            {label}
        </span>
        <span className="text-2xl font-semibold text-heading">{count}</span>
        <span className="text-sm font-medium text-muted">{hint}</span>
    </button>
);

const StatusTimeline = ({ status }: { status: TicketStatus }) => {
    const currentIndex = TICKET_STATUSES.indexOf(status);
    return (
        <ol className="grid grid-cols-3 gap-2">
            {TICKET_STATUSES.map((stage, index) => (
                <li key={stage} className="flex flex-col gap-1.5">
                    <span className={`h-1.5 rounded-full ${index <= currentIndex ? 'bg-primary' : 'bg-border'}`} />
                    <span className={`text-sm font-medium ${index === currentIndex ? 'text-heading' : 'text-muted'}`}>{stage}</span>
                </li>
            ))}
        </ol>
    );
};

const DetailField = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="font-medium text-heading">{children}</dd>
    </div>
);

// ── Raise ticket panel ────────────────────────────────────────────────────────
const RaiseTicketPanel = ({
    isOpen,
    onClose,
    defaultOutletId,
    outletOptions,
    isSubmitting,
    onSubmit,
}: {
    isOpen: boolean;
    onClose: () => void;
    defaultOutletId: string;
    outletOptions: { label: string; value: string }[];
    isSubmitting: boolean;
    onSubmit: (payload: CreateSupportTicketPayload) => Promise<boolean>;
}) => {
    const [outletId, setOutletId] = useState(defaultOutletId);
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState<TicketCategory>('Other');
    const [priority, setPriority] = useState<TicketPriority>('Medium');
    const [details, setDetails] = useState('');

    const resetForm = () => {
        setOutletId(defaultOutletId);
        setSubject('');
        setCategory('Other');
        setPriority('Medium');
        setDetails('');
    };

    const handleClose = () => {
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (!outletId) return toast.error('Select the outlet this ticket is about');
        if (!subject.trim()) return toast.error('Add a short subject for the ticket');

        const wasRaised = await onSubmit({ outletId, subject: subject.trim(), category, priority, details: details.trim() });
        if (wasRaised) {
            resetForm();
            onClose();
        }
    };

    const handleFormSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        handleSubmit();
    };

    return (
        <SideModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Raise a ticket"
        >
            <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-5">

                <div className="flex flex-col gap-5">
                    <SearchSelect
                        label="Outlet"
                        options={outletOptions}
                        value={outletId}
                        placeholder="Select outlet"
                        onChange={(option) => setOutletId(String(option.value))}
                        onClear={() => setOutletId('')}
                    />

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ticketSubject">Subject</Label>
                        <Input id="ticketSubject" value={subject} onChange={(event) => setSubject(event.target.value)} />
                    </div>

                    <SearchSelect
                        label="Category"
                        options={CATEGORY_OPTIONS}
                        value={category}
                        placeholder="Select category"
                        onChange={(option) => setCategory(option.value as TicketCategory)}
                        onClear={() => setCategory('Other')}
                    />

                    <div className="flex flex-col gap-2">
                        <Label>Priority</Label>
                        <div role="radiogroup" aria-label="Ticket priority" className="grid grid-cols-3 gap-2">
                            {TICKET_PRIORITIES.map((priorityOption) => {
                                const isSelected = priority === priorityOption;
                                return (
                                    <button
                                        key={priorityOption}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        onClick={() => setPriority(priorityOption)}
                                        className={`flex flex-col gap-0.5 rounded-xl border-2 p-3 text-left transition-colors ${isSelected ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-hover'
                                            }`}
                                    >
                                        <span className="font-semibold text-heading">{priorityOption}</span>
                                        <span className="text-xs text-muted">{PRIORITY_PRESENTATION[priorityOption].description}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ticketDetails">Details</Label>
                        <textarea
                            id="ticketDetails"
                            rows={5}
                            value={details}
                            onChange={(event) => setDetails(event.target.value)}
                            className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-body placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
                        />
                        <p className="text-sm text-muted">What were you doing, and what went wrong? Mention any error message you saw.</p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-border pt-5">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting} loadingText="Raising...">
                        Raise ticket
                    </Button>
                </div>
            </form>
        </SideModal>
    );
};

// ── Confirmation copy ─────────────────────────────────────────────────────────
const buildConfirmationCopy = ({ kind, ticket }: PendingAction) => {
    switch (kind) {
        case 'advance':

            const nextStatus = getNextStatus(ticket.status);

            if (!nextStatus) return null;

            return {
                title: STATUS_PRESENTATION[ticket.status].advanceLabel,
                message: `${ticket.ticketNo} will move from ${ticket.status} to ${nextStatus}.`,
                confirmLabel: 'Confirm',
                loadingLabel: 'Updating',
                isDanger: false,
            };

        // return {
        //     title: STATUS_PRESENTATION[ticket.status].advanceLabel,
        //     message: `${ticket.ticketNo} will move from ${ticket.status} to ${getNextStatus(ticket.status)}.`,
        //     confirmLabel: 'Confirm',
        //     loadingLabel: 'Updating',
        //     isDanger: false,
        // };

        case 'deactivate':
            return { title: 'Deactivate ticket', message: `${ticket.ticketNo} will be moved to the inactive list. You can restore it later.`, confirmLabel: 'Deactivate', loadingLabel: 'Deactivating', isDanger: false };
        case 'restore':
            return { title: 'Restore ticket', message: `${ticket.ticketNo} will return to the active list.`, confirmLabel: 'Restore', loadingLabel: 'Restoring', isDanger: false };
        case 'hardDelete':
            return { title: 'Delete permanently', message: `${ticket.ticketNo} will be deleted for good. This cannot be undone.`, confirmLabel: 'Delete permanently', loadingLabel: 'Deleting', isDanger: true };
    }
};

// // Status cycles Open → In progress → Closed → Open.
// const getNextStatus = (status: TicketStatus): TicketStatus => 
//     TICKET_STATUSES[(TICKET_STATUSES.indexOf(status) + 1) % TICKET_STATUSES.length];


const getNextStatus = (status: TicketStatus): TicketStatus => {
    if (status === 'Open') return 'In progress';
    if (status === 'In progress') return 'Closed';
    return 'Open';
};
// ── Page ──────────────────────────────────────────────────────────────────────
export default function SupportTicketMain() {
    const { currentRole } = useAuthData();
    const canManageTickets = !!currentRole && (SUPPORT_TICKET_MANAGEMENT_ROLES as string[]).includes(currentRole);
    const canHardDeleteTickets = !!currentRole && (SUPPORT_TICKET_ADMIN_ROLES as string[]).includes(currentRole);

    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
    const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
    const [isHighPriorityOnly, setIsHighPriorityOnly] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [selectedOutletId, setSelectedOutletId] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [isRaisePanelOpen, setIsRaisePanelOpen] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const outletFilter = selectedOutletId || undefined;
    const { data: activeTickets = [], isLoading: isActiveLoading, error: activeError, refetch: refetchActive, isFetching: isActiveFetching } = useListActiveTickets(outletFilter);
    const { data: inactiveTickets = [], isLoading: isInactiveLoading } = useListInactiveTickets(outletFilter);
    const { data: ticketDetail } = useGetTicket(selectedTicketId ?? undefined);
    const { data: outletList = [] } = useGetOutletList();

    const { mutateAsync: createTicketAsync, isPending: isRaisingTicket } = useCreateTicket();
    const { mutateAsync: advanceTicketStatusAsync, isPending: isAdvancingStatus } = useAdvanceTicketStatus();
    const { mutateAsync: softDeleteTicketAsync, isPending: isDeactivatingTicket } = useSoftDeleteTicket();
    const { mutateAsync: restoreTicketAsync, isPending: isRestoringTicket } = useRestoreTicket();
    const { mutateAsync: hardDeleteTicketAsync, isPending: isHardDeletingTicket } = useHardDeleteTicket();
    const isActionInProgress = isAdvancingStatus || isDeactivatingTicket || isRestoringTicket || isHardDeletingTicket;

    const outletOptions = (outletList as OutletListEntry[]).map((outlet) => ({ label: outlet.name, value: outlet.id ?? outlet._id ?? '' }));
    const outletNameById = new Map(outletOptions.map((option) => [option.value, option.label]));

    const isActiveTab = activeTab === 'active';
    const ticketsForTab = isActiveTab ? activeTickets : inactiveTickets;
    const isListLoading = isActiveTab ? isActiveLoading : isInactiveLoading;

    const normalisedSearch = searchInput.trim().toLowerCase();
    const visibleTickets = [...ticketsForTab]
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        .filter((ticket) => {
            if (isActiveTab && statusFilter !== 'all' && ticket.status !== statusFilter) return false;
            if (isActiveTab && isHighPriorityOnly && (ticket.priority !== 'High' || ticket.status === 'Closed')) return false;
            if (categoryFilter && ticket.category !== categoryFilter) return false;
            if (!normalisedSearch) return true;
            return `${ticket.ticketNo} ${ticket.subject}`.toLowerCase().includes(normalisedSearch);
        });

    const hasActiveFilters = statusFilter !== 'all' || isHighPriorityOnly || !!categoryFilter || !!normalisedSearch;
    const selectedTicket = ticketDetail ?? ticketsForTab.find((ticket) => getTicketId(ticket) === selectedTicketId) ?? null;

    const highPriorityOpenCount = activeTickets.filter((ticket) => ticket.priority === 'High' && ticket.status !== 'Closed').length;

    const clearFilters = () => {
        setStatusFilter('all');
        setIsHighPriorityOnly(false);
        setCategoryFilter('');
        setSearchInput('');
    };

    const handleRaiseTicket = async (payload: CreateSupportTicketPayload) => {
        try {
            const raisedTicket = await createTicketAsync(payload);
            toast.success(raisedTicket?.ticketNo ? `Ticket ${raisedTicket.ticketNo} raised` : 'Ticket raised');
            return true;
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not raise the ticket'));
            return false;
        }
    };

    const handleConfirmPendingAction = async () => {
        if (!pendingAction) return;
        const { kind, ticket } = pendingAction;
        const ticketId = getTicketId(ticket);

        try {
            if (kind === 'advance') {
                // await advanceTicketStatusAsync(ticketId);
                const nextStatus = getNextStatus(ticket.status);

                if (!nextStatus) {
                    toast.error('Ticket is already closed');
                    return;
                }

                await advanceTicketStatusAsync({
                    id: ticketId,
                    status: nextStatus,
                });

                toast.success(`${ticket.ticketNo} is now ${nextStatus}`);

            } else if (kind === 'deactivate') {
                await softDeleteTicketAsync(ticketId);
                toast.success(`${ticket.ticketNo} deactivated`);
            } else if (kind === 'restore') {
                await restoreTicketAsync(ticketId);
                toast.success(`${ticket.ticketNo} restored`);
            } else {
                await hardDeleteTicketAsync(ticketId);
                toast.success(`${ticket.ticketNo} deleted permanently`);
            }

            if (kind !== 'advance' && selectedTicketId === ticketId) setSelectedTicketId(null);
            setPendingAction(null);
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not complete this action'));
        }
    };

    const handleConfirmSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        handleConfirmPendingAction();
    };


     // ── Detail panel ────────────────────────────────────────────────────────────
    const renderTicketDetail = (ticket: SupportTicketItem) => (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-muted">{ticket.ticketNo}</p>
                    <div className="flex items-center gap-2">
                        <PriorityBadge priority={ticket.priority} />
                        <StatusBadge status={ticket.status} />
                    </div>
                </div>
                <h2 className="text-xl font-semibold text-heading">{ticket.subject}</h2>
            </div>

            <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-heading">Status</h3>
                <StatusTimeline status={ticket.status} />
                <p className="text-sm text-muted">{STATUS_PRESENTATION[ticket.status].description}</p>
            </div>

            <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-heading">Details</h3>
                {ticket.details ? (
                    <p className="whitespace-pre-wrap rounded-xl border border-border bg-page p-4 text-body">{ticket.details}</p>
                ) : (
                    <p className="text-sm text-muted">No details were added.</p>
                )}
            </div>

            <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
                <DetailField label="Category">{ticket.category}</DetailField>
                <DetailField label="Outlet">{resolveOutletName(ticket, outletNameById)}</DetailField>
                <DetailField label="Raised by">{resolveRaisedByName(ticket)}</DetailField>
                <DetailField label="Raised on">{formatDateTime(ticket.createdAt)}</DetailField>
                <DetailField label="Last updated">{formatDateTime(ticket.updatedAt)}</DetailField>
            </dl>
        </div>
    );

    const renderDetailFooter = (ticket: SupportTicketItem) => {
        if (!isActiveTab) return null;
        return (
            <div className="flex justify-end gap-2 border-t border-border pt-5">
                {canManageTickets && (
                    <Button type="button" variant="outline" leftIcon={<Archive size={16} />} onClick={() => setPendingAction({ kind: 'deactivate', ticket })}>
                        Deactivate
                    </Button>
                )}
                <Button type="button" leftIcon={<ChevronsRight size={16} />} onClick={() => setPendingAction({ kind: 'advance', ticket })}>
                    {STATUS_PRESENTATION[ticket.status].advanceLabel}
                </Button>
            </div>
        );
    };

    const buildRowActions = (ticket: SupportTicketItem) => {
        const actionItems = [];
        if (isActiveTab) {
            actionItems.push({
                label: STATUS_PRESENTATION[ticket.status].advanceLabel,
                icon: <ChevronsRight size={16} />,
                onClick: () => setPendingAction({ kind: 'advance', ticket }),
            });
            if (canManageTickets) {
                actionItems.push({ label: 'Deactivate', icon: <Archive size={16} />, onClick: () => setPendingAction({ kind: 'deactivate', ticket }) });
            }
        } else {
            if (canManageTickets) {
                actionItems.push({ label: 'Restore', icon: <RotateCcw size={16} />, onClick: () => setPendingAction({ kind: 'restore', ticket }) });
            }
            if (canHardDeleteTickets) {
                actionItems.push({ label: 'Delete permanently', icon: <Trash2 size={16} />, isDanger: true, onClick: () => setPendingAction({ kind: 'hardDelete', ticket }) });
            }
        }
        return actionItems;
    };

   

    // ── Table body ──────────────────────────────────────────────────────────────
    let tableRows: ReactNode;
    if (isListLoading) {
        tableRows = <TableMessageRow message="Loading tickets…" />;
    } else if (visibleTickets.length === 0) {
        tableRows = (
            <TableMessageRow
                message={
                    ticketsForTab.length === 0
                        ? isActiveTab
                            ? 'No tickets yet. Raise one whenever something needs the support team.'
                            : 'No inactive tickets.'
                        : 'No tickets match your filters.'
                }
            />
        );
    } else {
        tableRows = visibleTickets.map((ticket, rowIndex) => {
            const rowActions = buildRowActions(ticket);
            return (
                <Tr key={getTicketId(ticket)} ariaLabel={`Ticket ${ticket.ticketNo}`} onClick={() => setSelectedTicketId(getTicketId(ticket))}>

                    <Td>
                        <span className="text-muted font-medium">{rowIndex + 1}</span>
                    </Td>
                    <Td>
                        <span className="font-semibold text-heading">{ticket.ticketNo}</span>
                    </Td>
                    <Td>
                        <p className="min-w-48 font-medium truncate text-heading">{ticket.subject}</p>
                    </Td>
                    <Td className='font-medium'>{ticket.category}</Td>
                    <Td>
                        <PriorityBadge priority={ticket.priority} />
                    </Td>
                    <Td>
                        <StatusBadge status={ticket.status} />
                    </Td>
                    <Td className='font-medium'>{resolveOutletName(ticket, outletNameById)}</Td>
                    <Td className='font-medium'>{formatDate(ticket.createdAt)}</Td>
                    <Td>
                        <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                            <Button size="sm" variant="outline" leftIcon={<Eye size={14} />} onClick={() => setSelectedTicketId(getTicketId(ticket))}>
                                View
                            </Button>
                            {rowActions.length > 0 && (
                                <Dropdown align="right" triggerLabel={`More actions for ${ticket.ticketNo}`} trigger={<MoreVertical size={16} />} items={rowActions} />
                            )}
                        </div>
                    </Td>
                </Tr>
            );
        });
    }

    const confirmationCopy = pendingAction ? buildConfirmationCopy(pendingAction) : null;

    return (
        <div className="flex w-full flex-col gap-5 p-2">
            {/* Header */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <LifeBuoy size={20} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold text-heading">Support &amp; Helpdesk</h1>
                        <p className="text-sm font-medium text-muted">Raise issues and track them until they're resolved</p>
                    </div>
                </div>
                <Button leftIcon={<Plus size={16} />} onClick={() => setIsRaisePanelOpen(true)}>
                    Raise ticket
                </Button>
            </header>

            {activeError ? (
                <Card className="flex flex-col items-center gap-3 p-10 text-center">
                    <ShieldAlert size={32} className="text-danger" />
                    <h2 className="text-lg font-semibold text-heading">Couldn't load tickets</h2>
                    <p className="text-sm font-medium text-muted">{activeError.message}</p>
                    <Button variant="outline" leftIcon={<RefreshCw size={16} />} isLoading={isActiveFetching} loadingText="Retrying" onClick={() => refetchActive()}>
                        Try again
                    </Button>
                </Card>
            ) : (
                <>
                    {/* Summary doubles as quick filters */}
                    {isActiveTab && (
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {TICKET_STATUSES.map((status) => (
                                <SummaryCard
                                    key={status}
                                    label={status}
                                    count={activeTickets.filter((ticket) => ticket.status === status).length}
                                    hint={STATUS_PRESENTATION[status].description}
                                    dotClass={STATUS_PRESENTATION[status].dotClass}
                                    isSelected={statusFilter === status}
                                    onToggle={() => setStatusFilter((current) => (current === status ? 'all' : status))}
                                />
                            ))}
                            <SummaryCard
                                label="High priority"
                                count={highPriorityOpenCount}
                                hint="Not closed yet"
                                dotClass="bg-danger"
                                isSelected={isHighPriorityOnly}
                                onToggle={() => setIsHighPriorityOnly((current) => !current)}
                            />
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                        <div role="tablist" aria-label="Ticket list" className="flex gap-1 border-b border-border">
                            {(['active', ...(canManageTickets ? (['inactive'] as const) : [])] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setStatusFilter('all');
                                        setIsHighPriorityOnly(false);
                                    }}
                                    className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'border-primary text-heading' : 'border-transparent text-muted hover:text-heading'
                                        }`}
                                >
                                    {tab} ({tab === 'active' ? activeTickets.length : inactiveTickets.length})
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="relative sm:w-64">
                                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                <Input
                                    aria-label="Search tickets"
                                    placeholder="Search by number or subject"
                                    className="pl-9"
                                    leftIcon={<Search size={18} />}
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                />
                            </div>
                            <div className="sm:w-48">
                                <SearchSelect
                                    label=""
                                    options={CATEGORY_OPTIONS}
                                    value={categoryFilter}
                                    placeholder="All categories"
                                    onChange={(option) => setCategoryFilter(String(option.value))}
                                    onClear={() => setCategoryFilter('')}
                                />
                            </div>
                            <div className="sm:w-48">
                                <SearchSelect
                                    label=""
                                    options={outletOptions}
                                    value={selectedOutletId}
                                    placeholder="All outlets"
                                    onChange={(option) => setSelectedOutletId(String(option.value))}
                                    onClear={() => setSelectedOutletId('')} 
                                />
                            </div>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="flex items-center gap-2 text-sm font-medium text-body">
                            Showing {visibleTickets.length} of {ticketsForTab.length} tickets
                            <button type="button" className="font-medium text-primary hover:underline" onClick={clearFilters}>
                                Clear filters
                            </button>
                        </div>
                    )}

                    <TableContainer className="min-h-[300px]" ariaLabel="Support tickets" caption="Support tickets raised by your team">
                        <THead>
                            <Tr>
                                <Th className="w-16">S.No</Th>
                                <Th>Ticket</Th>
                                <Th>Subject</Th>
                                <Th>Category</Th>
                                <Th>Priority</Th>
                                <Th>Status</Th>
                                <Th>Outlet</Th>
                                <Th>Raised</Th>
                                <Th>Actions</Th>
                            </Tr>
                        </THead>
                        <TBody>{tableRows}</TBody>
                    </TableContainer>
                </>
            )}

            <RaiseTicketPanel
                isOpen={isRaisePanelOpen}
                onClose={() => setIsRaisePanelOpen(false)}
                defaultOutletId={selectedOutletId}
                outletOptions={outletOptions}
                isSubmitting={isRaisingTicket}
                onSubmit={handleRaiseTicket}
            />

            <SideModal isOpen={!!selectedTicketId} onClose={() => setSelectedTicketId(null)} title="Ticket details">
                {selectedTicket ? (
                    <div className="flex flex-col gap-6">
                        {renderTicketDetail(selectedTicket)}
                        {renderDetailFooter(selectedTicket)}
                    </div>
                ) : (
                    <p className="text-muted">Loading ticket…</p>
                )}
            </SideModal>

            <SideModal
                isOpen={!!pendingAction}
                onClose={() => !isActionInProgress && setPendingAction(null)}
                title={confirmationCopy?.title ?? ''}
            >
                {/* {confirmationCopy && <p className="text-body">{confirmationCopy.message}</p>} */}

                {confirmationCopy && (
                    <form onSubmit={handleConfirmSubmit} className="flex flex-col gap-5">
                        <p className="text-body">{confirmationCopy.message}</p>
                        <div className="flex justify-end gap-2 border-t border-border pt-5">
                            <Button type="button" variant="outline" onClick={() => setPendingAction(null)} disabled={isActionInProgress}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                autoFocus
                                variant={confirmationCopy.isDanger ? 'danger' : 'primary'}
                                isLoading={isActionInProgress}
                                loadingText={confirmationCopy.loadingLabel}
                            >
                                {confirmationCopy.confirmLabel}
                            </Button>
                        </div>
                    </form>
                )}
            </SideModal>
        </div>
    );
}