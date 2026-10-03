import { useState, type ReactNode } from 'react';
import {
    Archive, ArrowRight, Check, ChevronsRight, Eye, MoreVertical, Plus,
    RefreshCw, RotateCcw, Search, ShieldAlert, Trash2, Warehouse, X,
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
    CENTRAL_KITCHEN_ADMIN_ROLES, CENTRAL_KITCHEN_MANAGEMENT_ROLES,
    useCreateTransfer, useGetTransfer, useHardDeleteTransfer, useListActiveTransfers,
    useListInactiveTransfers, useRestoreTransfer, useSoftDeleteTransfer, useUpdateTransferStage,
    type CentralKitchenTransfer, type CreateTransferPayload, type InventoryReference, type OutletReference,
    type TransferStatus,
} from '../../api_service/centralKitchen_api/centralKitchenApi';
import { useGetInventoryDropdown } from '../../api_service/inventory_api/inventoryApi';
import { useGetOutletList } from '../../api_service/outlet_api/outletApi';

// ── Stage definitions ─────────────────────────────────────────────────────────
const TRANSFER_STAGES: TransferStatus[] = ['Requested', 'Approved', 'Dispatched', 'Received'];

interface StagePresentation {
    dotClass: string;
    badgeClass: string;
    description: string;
    advanceLabel?: string;
    advanceWarning?: string;
}

const STAGE_PRESENTATION: Record<TransferStatus, StagePresentation> = {
    Requested: {
        dotClass: 'bg-info',
        badgeClass: 'bg-info text-white',
        description: 'Raised and waiting for approval',
        advanceLabel: 'Approve transfer',
    },
    Approved: {
        dotClass: 'bg-warning',
        badgeClass: 'bg-warning text-white',
        description: 'Approved and ready to leave the central kitchen',
        advanceLabel: 'Dispatch stock',
        advanceWarning:
            'Dispatching deducts these quantities from inventory straight away. Make sure there is enough stock, as this cannot be undone.',
    },
    Dispatched: {
        dotClass: 'bg-primary',
        badgeClass: 'bg-primary text-white',
        description: 'On the way to the receiving outlet',
        advanceLabel: 'Mark as received',
    },
    Received: {
        dotClass: 'bg-success',
        badgeClass: 'bg-success text-white',
        description: 'Receiving outlet has confirmed the stock',
    },
};

const getNextStage = (status: string): TransferStatus | null => {
    const currentIndex = TRANSFER_STAGES.indexOf(status as TransferStatus);
    return currentIndex >= 0 && currentIndex < TRANSFER_STAGES.length - 1 ? TRANSFER_STAGES[currentIndex + 1] : null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
interface OutletListEntry {
    id?: string;
    _id?: string;
    name: string;
    code?: string;
}

interface InventoryDropdownEntry {
    id?: string;
    _id?: string;
    material: string;
    rate?: number;
}

const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const formatInr = (amount: number) => inrFormatter.format(amount);

const formatDateTime = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getTransferId = (transfer: CentralKitchenTransfer) => transfer.id ?? transfer._id;
const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const resolveOutletName = (outletReference: OutletReference, outletNameById: Map<string, string>) =>
    typeof outletReference === 'string' ? (outletNameById.get(outletReference) ?? 'Unknown outlet') : (outletReference?.name ?? 'Unknown outlet');

const resolveInventoryDetails = (
    inventoryReference: InventoryReference,
    inventoryById: Map<string, { material: string; rate?: number }>
) => {
    if (typeof inventoryReference !== 'string') {
        return { material: inventoryReference?.material ?? 'Unknown item', rate: inventoryReference?.rate };
    }
    return inventoryById.get(inventoryReference) ?? { material: 'Unknown item', rate: undefined };
};

// ── Presentational pieces ─────────────────────────────────────────────────────
const StageBadge = ({ status }: { status: string }) => {
    const presentation = STAGE_PRESENTATION[status as TransferStatus];
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${presentation?.badgeClass ?? 'bg-muted text-white'
                }`}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            {status}
        </span>
    );
};


const ROW_ACTION_BASE_CLASSES =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-sm font-medium text-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft disabled:cursor-not-allowed disabled:opacity-50';
const ROW_ACTION_HOVER_CLASSES = 'hover:border-primary hover:bg-primary-soft hover:text-primary';

const RowActionButton = ({ label, icon, onClick }: { label: string; icon?: ReactNode; onClick: () => void }) => (
    <button type="button" onClick={onClick} className={`${ROW_ACTION_BASE_CLASSES} ${ROW_ACTION_HOVER_CLASSES} px-3`}>
        {icon}
        {label}
    </button>
);


const StageTimeline = ({ status }: { status: string }) => {
    const currentIndex = TRANSFER_STAGES.indexOf(status as TransferStatus);
    return (
        <ol className="flex flex-col">
            {TRANSFER_STAGES.map((stage, index) => {
                const isCompleted = index < currentIndex || (index === currentIndex && stage === 'Received');
                const isCurrent = index === currentIndex && !isCompleted;
                const isLast = index === TRANSFER_STAGES.length - 1;
                return (
                    <li key={stage} className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${isCompleted
                                    ? 'border-success bg-success text-white'
                                    : isCurrent
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-border bg-surface text-muted'
                                    }`}
                            >
                                {isCompleted ? <Check size={14} /> : index + 1}
                            </span>
                            {!isLast && <span className={`w-0.5 flex-1 ${index < currentIndex ? 'bg-success' : 'bg-border'}`} />}
                        </div>
                        <div className={`pb-5 ${isLast ? 'pb-0' : ''}`}>
                            <p className={`text-sm font-semibold ${index <= currentIndex ? 'text-heading' : 'text-muted'}`}>{stage}</p>
                            <p className="text-sm text-muted">{STAGE_PRESENTATION[stage].description}</p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};


const TABLE_COLUMN_COUNT = 7; // S.No, Transfer, Route, Items, Value, Stage, Actions

const TableMessageRow = ({ message }: { message: string }) => (
    <Tr>
        <Td colSpan={TABLE_COLUMN_COUNT}>
            <div className="flex min-h-[220px] items-center justify-center px-4 text-center text-muted">{message}</div>
        </Td>
    </Tr>
);

const StageSummaryCard = ({
    stage,
    transferCount,
    totalValue,
    isSelected,
    onToggle,
}: {
    stage: TransferStatus;
    transferCount: number;
    totalValue: number;
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
            <span className={`h-2 w-2 rounded-full ${STAGE_PRESENTATION[stage].dotClass}`} />
            {stage}
        </span>
        <span className="text-2xl font-semibold text-heading">{transferCount}</span>
        <span className="text-sm text-muted">{formatInr(totalValue)}</span>
    </button>
);

// ── Create transfer panel ─────────────────────────────────────────────────────
interface TransferLineDraft {
    draftKey: string;
    inventoryId: string;
    quantityInput: string;
}

const createEmptyLineDraft = (): TransferLineDraft => ({ draftKey: crypto.randomUUID(), inventoryId: '', quantityInput: '' });

const CreateTransferPanel = ({
    isOpen,
    onClose,
    outletOptions,
    inventoryOptions,
    inventoryRateById,
    isSubmitting,
    onSubmit,
}: {
    isOpen: boolean;
    onClose: () => void;
    outletOptions: { label: string; value: string }[];
    inventoryOptions: { label: string; value: string }[];
    inventoryRateById: Map<string, number | undefined>;
    isSubmitting: boolean;
    onSubmit: (payload: CreateTransferPayload) => Promise<boolean>;
}) => {
    const [fromOutletId, setFromOutletId] = useState('');
    const [toOutletId, setToOutletId] = useState('');
    const [lineDrafts, setLineDrafts] = useState<TransferLineDraft[]>([createEmptyLineDraft()]);

    const estimatedValue = lineDrafts.reduce((sum, line) => {
        const quantity = Number(line.quantityInput);
        const rate = inventoryRateById.get(line.inventoryId);
        return sum + (rate && quantity > 0 ? rate * quantity : 0);
    }, 0);

    const resetForm = () => {
        setFromOutletId('');
        setToOutletId('');
        setLineDrafts([createEmptyLineDraft()]);
    };

    const handleClose = () => {
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    const updateLineDraft = (draftKey: string, changes: Partial<TransferLineDraft>) =>
        setLineDrafts((current) => current.map((line) => (line.draftKey === draftKey ? { ...line, ...changes } : line)));

    const handleSubmit = async () => {
        if (!fromOutletId || !toOutletId) return toast.error('Select both the sending and receiving outlets');
        if (fromOutletId === toOutletId) return toast.error('The sending and receiving outlets must be different');

        const selectedInventoryIds = new Set<string>();
        const lines: CreateTransferPayload['lines'] = [];

        for (const line of lineDrafts) {
            const quantity = Number(line.quantityInput);
            if (!line.inventoryId) return toast.error('Select an item for every line');
            if (!line.quantityInput || Number.isNaN(quantity) || quantity <= 0) return toast.error('Enter a quantity greater than 0 for every line');
            if (selectedInventoryIds.has(line.inventoryId)) return toast.error('Each item can only appear once in a transfer');
            selectedInventoryIds.add(line.inventoryId);
            lines.push({ inventoryId: line.inventoryId, quantity });
        }

        const wasCreated = await onSubmit({ fromOutletId, toOutletId, lines });
        if (wasCreated) {
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
            title="New stock transfer"
        >
            <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-5">

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <SearchSelect
                        label="From outlet"
                        options={outletOptions}
                        value={fromOutletId}
                        placeholder="Select outlet"
                        onChange={(option) => setFromOutletId(String(option.value))}
                        onClear={() => setFromOutletId('')}
                    />
                    <SearchSelect
                        label="To outlet"
                        options={outletOptions.filter((option) => option.value !== fromOutletId)}
                        value={toOutletId}
                        placeholder="Select outlet"
                        onChange={(option) => setToOutletId(String(option.value))}
                        onClear={() => setToOutletId('')}
                    />
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <Label>Items to transfer</Label>
                        <span className="text-sm text-muted">{lineDrafts.length} line{lineDrafts.length === 1 ? '' : 's'}</span>
                    </div>

                    {lineDrafts.map((line, index) => (
                        <div key={line.draftKey} className="grid grid-cols-[1fr_6.5rem_auto] items-end gap-2">
                            <SearchSelect
                                label={index === 0 ? 'Item' : ''}
                                options={inventoryOptions}
                                value={line.inventoryId}
                                placeholder="Select item"
                                onChange={(option) => updateLineDraft(line.draftKey, { inventoryId: String(option.value) })}
                                onClear={() => updateLineDraft(line.draftKey, { inventoryId: '' })}
                            />
                            <div className="flex flex-col gap-1.5">
                                {index === 0 && <Label htmlFor={`transfer-quantity-${line.draftKey}`}>Quantity</Label>}
                                <Input
                                    id={`transfer-quantity-${line.draftKey}`}
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    value={line.quantityInput}
                                    onChange={(event) => updateLineDraft(line.draftKey, { quantityInput: event.target.value })}
                                />
                            </div>
                            <button
                                type="button"
                                aria-label="Remove line"
                                disabled={lineDrafts.length === 1}
                                onClick={() => setLineDrafts((current) => current.filter((l) => l.draftKey !== line.draftKey))}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}

                    <div>
                        <Button type="button" variant="outline" size="sm" leftIcon={<Plus size={14} />}
                            onClick={() => setLineDrafts((current) => [...current, createEmptyLineDraft()])}>
                            Add item
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-page p-4">
                    <span className="text-sm text-body">Estimated value</span>
                    <span className="text-lg font-semibold text-heading">{formatInr(estimatedValue)}</span>
                </div>
                {/* </div> */}

                <div className="flex justify-end gap-2 border-t border-border pt-5">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting} loadingText="Creating...">
                        Create transfer
                    </Button>
                </div>
            </form>
        </SideModal>
    );
};

// ── Confirmation copy ─────────────────────────────────────────────────────────
type PendingActionKind = 'advance' | 'deactivate' | 'restore' | 'hardDelete';
interface PendingAction {
    kind: PendingActionKind;
    transfer: CentralKitchenTransfer;
}

const buildConfirmationCopy = ({ kind, transfer }: PendingAction) => {
    const transferLabel = transfer.transferNo ?? 'this transfer';
    switch (kind) {
        case 'advance': {
            const nextStage = getNextStage(transfer.status);
            const advanceWarning = STAGE_PRESENTATION[transfer.status as TransferStatus]?.advanceWarning;
            return {
                title: STAGE_PRESENTATION[transfer.status as TransferStatus]?.advanceLabel ?? 'Move to next stage',
                message: `${transferLabel} will move from ${transfer.status} to ${nextStage}. ${advanceWarning ?? ''}`.trim(),
                confirmLabel: 'Confirm',
                loadingLabel: 'Updating',
                isDanger: transfer.status === 'Approved',
            };
        }
        case 'deactivate':
            return { title: 'Deactivate transfer', message: `${transferLabel} will be moved to the inactive list. You can restore it later.`, confirmLabel: 'Deactivate', loadingLabel: 'Deactivating', isDanger: false };
        case 'restore':
            return { title: 'Restore transfer', message: `${transferLabel} will return to the active list.`, confirmLabel: 'Restore', loadingLabel: 'Restoring', isDanger: false };
        case 'hardDelete':
            return { title: 'Delete permanently', message: `${transferLabel} will be deleted for good. This cannot be undone.`, confirmLabel: 'Delete permanently', loadingLabel: 'Deleting', isDanger: true };
    }
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CentralKitchenMain() {
    const { currentRole } = useAuthData();
    const canManageTransfers = !!currentRole && (CENTRAL_KITCHEN_MANAGEMENT_ROLES as string[]).includes(currentRole);
    const canHardDeleteTransfers = !!currentRole && (CENTRAL_KITCHEN_ADMIN_ROLES as string[]).includes(currentRole);

    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
    const [stageFilter, setStageFilter] = useState<TransferStatus | 'all'>('all');
    const [searchInput, setSearchInput] = useState('');
    const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
    const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const { data: activeTransfers = [], isLoading: isActiveLoading, error: activeError, refetch: refetchActive, isFetching: isActiveFetching } = useListActiveTransfers();
    const { data: inactiveTransfers = [], isLoading: isInactiveLoading } = useListInactiveTransfers();
    const { data: transferDetail } = useGetTransfer(selectedTransferId ?? undefined);
    const { data: outletList = [] } = useGetOutletList();
    const { data: inventoryDropdown = [] } = useGetInventoryDropdown();


    console.log("acigve transfers", activeTransfers)
    const { mutateAsync: createTransferAsync, isPending: isCreatingTransfer } = useCreateTransfer();
    const { mutateAsync: updateTransferStageAsync, isPending: isUpdatingStage } = useUpdateTransferStage();
    const { mutateAsync: softDeleteTransferAsync, isPending: isDeactivating } = useSoftDeleteTransfer();
    const { mutateAsync: restoreTransferAsync, isPending: isRestoring } = useRestoreTransfer();
    const { mutateAsync: hardDeleteTransferAsync, isPending: isHardDeleting } = useHardDeleteTransfer();
    const isActionInProgress = isUpdatingStage || isDeactivating || isRestoring || isHardDeleting;

    // Lookup tables so the UI works whether or not the API populates outlet / item references.
    const outletEntries = outletList as OutletListEntry[];
    const inventoryEntries = inventoryDropdown as InventoryDropdownEntry[];
    const outletNameById = new Map(outletEntries.map((outlet) => [outlet.id ?? outlet._id ?? '', outlet.name]));
    const inventoryById = new Map(
        inventoryEntries.map((item) => [item.id ?? item._id ?? '', { material: item.material, rate: item.rate }])
    );
    const outletOptions = outletEntries.map((outlet) => ({ label: outlet.name, value: outlet.id ?? outlet._id ?? '' }));
    const inventoryOptions = inventoryEntries.map((item) => ({ label: item.material, value: item.id ?? item._id ?? '' }));
    const inventoryRateById = new Map(inventoryEntries.map((item) => [item.id ?? item._id ?? '', item.rate]));

    const isActiveTab = activeTab === 'active';
    const transfersForTab = isActiveTab ? activeTransfers : inactiveTransfers;
    const isListLoading = isActiveTab ? isActiveLoading : isInactiveLoading;

    const normalisedSearch = searchInput.trim().toLowerCase();
    const visibleTransfers = [...transfersForTab]
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        .filter((transfer) => {
            if (isActiveTab && stageFilter !== 'all' && transfer.status !== stageFilter) return false;
            if (!normalisedSearch) return true;
            const searchableText = [
                transfer.transferNo,
                resolveOutletName(transfer.fromOutletId, outletNameById),
                resolveOutletName(transfer.toOutletId, outletNameById),
            ]
                .join(' ')
                .toLowerCase();
            return searchableText.includes(normalisedSearch);
        });

    const selectedTransfer =
        transferDetail ?? transfersForTab.find((transfer) => getTransferId(transfer) === selectedTransferId) ?? null;

    const handleCreateTransfer = async (payload: CreateTransferPayload) => {
        try {
            const createdTransfer = await createTransferAsync(payload);
            toast.success(`Transfer ${createdTransfer?.transferNo ?? ''} created`.replace('  ', ' '));
            return true;
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not create the transfer'));
            return false;
        }
    };

    const handleConfirmPendingAction = async () => {
        if (!pendingAction) return;
        const { kind, transfer } = pendingAction;
        const transferId = getTransferId(transfer);

        try {
            if (kind === 'advance') {
                const nextStage = getNextStage(transfer.status);
                if (!nextStage) return;
                await updateTransferStageAsync({ id: transferId, status: nextStage });
                toast.success(`${transfer.transferNo} is now ${nextStage}`);
            } else if (kind === 'deactivate') {
                await softDeleteTransferAsync(transferId);
                toast.success(`${transfer.transferNo} deactivated`);
            } else if (kind === 'restore') {
                await restoreTransferAsync(transferId);
                toast.success(`${transfer.transferNo} restored`);
            } else {
                await hardDeleteTransferAsync(transferId);
                toast.success(`${transfer.transferNo} deleted permanently`);
            }

            if (kind !== 'advance' && selectedTransferId === transferId) setSelectedTransferId(null);
            setPendingAction(null);
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not complete this action'));
        }
    };


    const handleConfirmSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        handleConfirmPendingAction();
    };

    const buildRowActions = (transfer: CentralKitchenTransfer) => {
        const actionItems = [];
        if (isActiveTab) {
            const nextStage = getNextStage(transfer.status);
            if (nextStage) {
                actionItems.push({
                    label: STAGE_PRESENTATION[transfer.status as TransferStatus]?.advanceLabel ?? 'Next stage',
                    icon: <ChevronsRight size={16} />,
                    onClick: () => setPendingAction({ kind: 'advance', transfer }),
                });
            }
            if (canManageTransfers) {
                actionItems.push({ label: 'Deactivate', icon: <Archive size={16} />, onClick: () => setPendingAction({ kind: 'deactivate', transfer }) });
            }
        } else {
            if (canManageTransfers) {
                actionItems.push({ label: 'Restore', icon: <RotateCcw size={16} />, onClick: () => setPendingAction({ kind: 'restore', transfer }) });
            }
            if (canHardDeleteTransfers) {
                actionItems.push({ label: 'Delete permanently', icon: <Trash2 size={16} />, isDanger: true, onClick: () => setPendingAction({ kind: 'hardDelete', transfer }) });
            }
        }
        return actionItems;
    };

    // ── Detail panel content ────────────────────────────────────────────────────
    const renderDetailContent = (transfer: CentralKitchenTransfer) => {
        const fromOutletName = resolveOutletName(transfer.fromOutletId, outletNameById);
        const toOutletName = resolveOutletName(transfer.toOutletId, outletNameById);

        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm text-muted">Transfer</p>
                        <p className="text-2xl font-semibold text-heading">{transfer.transferNo}</p>
                    </div>
                    <StageBadge status={transfer.status} />
                </div>

                <div className="rounded-xl border border-border bg-page p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm text-muted">From</p>
                            <p className="truncate font-semibold text-heading">{fromOutletName}</p>
                        </div>
                        <ArrowRight size={18} className="shrink-0 text-primary" />
                        <div className="min-w-0 text-right">
                            <p className="text-sm text-muted">To</p>
                            <p className="truncate font-semibold text-heading">{toOutletName}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <h3 className="font-semibold text-heading">Progress</h3>
                    <StageTimeline status={transfer.status} />
                </div>

                <div className="flex flex-col gap-3">
                    <h3 className="font-semibold text-heading">Items ({transfer.lines.length})</h3>
                    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                        {transfer.lines.map((line, index) => {
                            const { material, rate } = resolveInventoryDetails(line.inventoryId, inventoryById);
                            return (
                                <li key={line._id ?? index} className="flex items-center justify-between gap-3 p-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-heading">{material}</p>
                                        <p className="text-sm text-muted">Qty {line.quantity}</p>
                                    </div>
                                    {rate !== undefined && <p className="shrink-0 text-sm font-medium text-body">{formatInr(rate * line.quantity)}</p>}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="flex items-center justify-between rounded-xl bg-primary-soft p-4">
                        <span className="text-sm font-medium text-body">Total value</span>
                        <span className="text-lg font-semibold text-heading">{formatInr(transfer.value)}</span>
                    </div>
                </div>

                <p className="text-sm text-muted">Created {formatDateTime(transfer.createdAt)}</p>
            </div>
        );
    };

    const renderDetailFooter = (transfer: CentralKitchenTransfer) => {
        if (!isActiveTab) return null;
        const nextStage = getNextStage(transfer.status);
        if (!canManageTransfers && !nextStage) return null;

        return (
            <div className="flex justify-end gap-2 border-t border-border pt-5">
                {canManageTransfers && (
                    <Button type="button" variant="outline" leftIcon={<Archive size={16} />} onClick={() => setPendingAction({ kind: 'deactivate', transfer })}>
                        Deactivate
                    </Button>
                )}
                {nextStage && (
                    <Button type="button" leftIcon={<ChevronsRight size={16} />} onClick={() => setPendingAction({ kind: 'advance', transfer })}>
                        {STAGE_PRESENTATION[transfer.status as TransferStatus]?.advanceLabel}
                    </Button>
                )}
            </div>
        );
    };


    const TransferRoute = ({ fromOutletName, toOutletName }: { fromOutletName: string; toOutletName: string }) => (
        <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-heading">{fromOutletName}</span>
            <ArrowRight size={14} className="shrink-0 text-muted" />
            <span className="truncate font-medium text-heading">{toOutletName}</span>
        </div>
    );



    const StageProgressBar = ({ status }: { status: string }) => {
        const currentIndex = TRANSFER_STAGES.indexOf(status as TransferStatus);
        return (
            <div className="flex gap-1" role="img" aria-label={`Stage ${currentIndex + 1} of ${TRANSFER_STAGES.length}`}>
                {TRANSFER_STAGES.map((stage, index) => (
                    <span key={stage} className={`h-1.5 w-6 rounded-full ${index <= currentIndex ? 'bg-primary' : 'bg-border'}`} />
                ))}
            </div>
        );
    };

    // ── Table body ──────────────────────────────────────────────────────────────
    let tableRows: ReactNode;
    if (isListLoading) {
        tableRows = <TableMessageRow message="Loading transfers…" />;
    } else if (visibleTransfers.length === 0) {
        tableRows = (
            <TableMessageRow
                message={
                    transfersForTab.length === 0
                        ? isActiveTab
                            ? 'No transfers yet. Create the first one to move stock between outlets.'
                            : 'No inactive transfers.'
                        : 'No transfers match your filters.'
                }
            />
        );
    } else {
        tableRows = visibleTransfers.map((transfer, rowIndex) => {
            const rowActions = buildRowActions(transfer);
            return (
                <Tr
                    key={getTransferId(transfer)}
                    ariaLabel={`Transfer ${transfer.transferNo}`}
                    onClick={() => setSelectedTransferId(getTransferId(transfer))}
                >
                    <Td>
                        <span className="text-muted">{rowIndex + 1}</span>
                    </Td>
                    <Td>
                        <span className="font-semibold text-heading">{transfer.transferNo}</span>
                    </Td>
                    <Td>
                        <TransferRoute
                            fromOutletName={resolveOutletName(transfer.fromOutletId, outletNameById)}
                            toOutletName={resolveOutletName(transfer.toOutletId, outletNameById)}
                        />
                    </Td>
                    <Td>{transfer.lines.length}</Td>
                    <Td>{formatInr(transfer.value)}</Td>
                    <Td>
                        <div className="flex flex-col gap-1.5">
                            <StageBadge status={transfer.status} />
                            <StageProgressBar status={transfer.status} />
                        </div>
                    </Td>
                    <Td className='font-medium'>{formatDateTime(transfer.createdAt)}</Td>

                    <Td>
                        <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                            <RowActionButton label="View" icon={<Eye size={14} />} onClick={() => setSelectedTransferId(getTransferId(transfer))} />
                            {rowActions.length > 0 && (
                                <Dropdown
                                    align="right"
                                    triggerLabel={`More actions for ${transfer.transferNo}`}
                                    trigger={
                                        <span className={`${ROW_ACTION_BASE_CLASSES} ${ROW_ACTION_HOVER_CLASSES} w-9`}>
                                            <MoreVertical size={16} />
                                        </span>
                                    }
                                    items={rowActions}
                                />
                            )}
                        </div>
                    </Td>
                </Tr>
            );
        });
    }
    const stageSummaries = TRANSFER_STAGES.map((stage) => {
        const transfersInStage = activeTransfers.filter((transfer) => transfer.status === stage);
        return { stage, transferCount: transfersInStage.length, totalValue: transfersInStage.reduce((sum, transfer) => sum + (transfer.value ?? 0), 0) };
    });

    const confirmationCopy = pendingAction ? buildConfirmationCopy(pendingAction) : null;

    return (
        <div className="flex w-full flex-col gap-5 p-2">
            {/* Header */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Warehouse size={20} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold text-heading">Central Kitchen</h1>
                        <p className="text-sm text-muted">Move stock between outlets and track every transfer</p>
                    </div>
                </div>
                <Button leftIcon={<Plus size={16} />} onClick={() => setIsCreatePanelOpen(true)}>
                    New transfer
                </Button>
            </header>

            {activeError ? (
                <Card className="flex flex-col items-center gap-3 p-10 text-center">
                    <ShieldAlert size={32} className="text-danger" />
                    <h2 className="text-lg font-semibold text-heading">Couldn't load transfers</h2>
                    <p className="text-sm text-muted">{activeError.message}</p>
                    <Button variant="outline" leftIcon={<RefreshCw size={16} />} isLoading={isActiveFetching} loadingText="Retrying" onClick={() => refetchActive()}>
                        Try again
                    </Button>
                </Card>
            ) : (
                <>
                    {/* Pipeline summary doubles as the stage filter */}
                    {isActiveTab && (
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {stageSummaries.map((summary) => (
                                <StageSummaryCard
                                    key={summary.stage}
                                    {...summary}
                                    isSelected={stageFilter === summary.stage}
                                    onToggle={() => setStageFilter((current) => (current === summary.stage ? 'all' : summary.stage))}
                                />
                            ))}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div role="tablist" aria-label="Transfer list" className="flex gap-1 border-b border-border">
                            {(['active', ...(canManageTransfers ? (['inactive'] as const) : [])] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setStageFilter('all');
                                    }}
                                    className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'border-primary text-heading' : 'border-transparent text-muted hover:text-heading'
                                        }`}
                                >
                                    {tab} ({tab === 'active' ? activeTransfers.length : inactiveTransfers.length})
                                </button>
                            ))}
                        </div>

                        <div className="relative sm:w-72">
                            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <Input
                                aria-label="Search transfers"
                                placeholder="Search by number or outlet"
                                className="pl-9"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                            />
                        </div>
                    </div>

                    {isActiveTab && stageFilter !== 'all' && (
                        <div className="flex items-center gap-2 text-sm text-body">
                            Showing <StageBadge status={stageFilter} /> transfers
                            <button type="button" className="font-medium text-primary hover:underline" onClick={() => setStageFilter('all')}>
                                Clear filter
                            </button>
                        </div>
                    )}

                    <TableContainer className="min-h-[300px]" ariaLabel="Stock transfers" caption="Central kitchen stock transfers">
                        <THead>
                            <Tr>
                                <Th className="w-16">S.No</Th>
                                <Th>Transfer</Th>
                                <Th>Route</Th>
                                <Th>Items</Th>
                                <Th>Value</Th>
                                <Th>Stage</Th>
                                <Th>Created</Th>
                                <Th>Actions</Th>
                            </Tr>
                        </THead>
                        <TBody>{tableRows}</TBody>
                    </TableContainer>
                </>
            )}

            {/* Create */}
            <CreateTransferPanel
                isOpen={isCreatePanelOpen}
                onClose={() => setIsCreatePanelOpen(false)}
                outletOptions={outletOptions}
                inventoryOptions={inventoryOptions}
                inventoryRateById={inventoryRateById}
                isSubmitting={isCreatingTransfer}
                onSubmit={handleCreateTransfer}
            />

            {/* Detail */}
            <SideModal isOpen={!!selectedTransferId} onClose={() => setSelectedTransferId(null)} title="Transfer details">
                {selectedTransfer ? (
                    <div className="flex flex-col gap-6">
                        {renderDetailContent(selectedTransfer)}
                        {renderDetailFooter(selectedTransfer)}
                    </div>
                ) : (
                    <p className="text-muted">Loading transfer…</p>
                )}
            </SideModal>

            {/* Confirmation */}
            <SideModal
                isOpen={!!pendingAction}
                onClose={() => !isActionInProgress && setPendingAction(null)}
                title={confirmationCopy?.title ?? ''}
            >
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