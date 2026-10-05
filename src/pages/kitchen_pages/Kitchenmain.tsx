import { useState } from 'react';
import { ChefHat, ChevronLeft, ChevronRight, Clock, NotebookPen, RefreshCw } from 'lucide-react';

import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { SearchSelect } from '../../components/ui/SearchSelect';

// ⚠️ Verify these paths/names against your api_service folder
import {
    useGetKitchenItems,
    useUpdateItemKitchenStatus,
    type KitchenItem,
    type KitchenItemStatus,
    type OrderType,
} from '../../api_service/order_api/orderApi';
import { useGetOutletDropdown } from '../../api_service/outlet_api/outletApi';

// ── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 24;
const LATE_AFTER_MINUTES = 20;

const KITCHEN_TABS: { status: KitchenItemStatus; label: string; emptyMessage: string }[] = [
    { status: 'in_queue', label: 'In queue', emptyMessage: 'Nothing waiting. New items appear here as soon as an order is placed.' },
    { status: 'preparing', label: 'Preparing', emptyMessage: 'No items are being prepared right now.' },
    { status: 'ready', label: 'Ready', emptyMessage: 'No items are waiting to be served.' },
    { status: 'served', label: 'Served', emptyMessage: 'No items have been served today.' },
    { status: 'cancelled', label: 'Cancelled', emptyMessage: 'No items were cancelled today.' },
];

const KITCHEN_STATUS_LABELS: Record<KitchenItemStatus, string> = {
    in_queue: 'In queue',
    preparing: 'Preparing',
    ready: 'Ready',
    served: 'Served',
    cancelled: 'Cancelled',
};

const KITCHEN_STATUS_BADGE: Record<KitchenItemStatus, string> = {
    in_queue: 'bg-muted',
    preparing: 'bg-warning',
    ready: 'bg-info',
    served: 'bg-success',
    cancelled: 'bg-danger',
};

const NEXT_KITCHEN_STATUS: Partial<Record<KitchenItemStatus, { next: KitchenItemStatus; label: string }>> = {
    in_queue: { next: 'preparing', label: 'Start preparing' },
    preparing: { next: 'ready', label: 'Mark ready' },
    ready: { next: 'served', label: 'Mark served' },
};

const ORDER_TYPE_FILTERS: { value: OrderType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'dine_in', label: 'Dine-in' },
    { value: 'takeaway', label: 'Takeaway' },
    { value: 'delivery', label: 'Delivery' },
];

const ORDER_TYPE_LABELS: Record<string, string> = {
    dine_in: 'Dine-in',
    takeaway: 'Takeaway',
    delivery: 'Delivery',
    online: 'Online',
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const toArray = (data: any, ...keys: string[]): Record<string, any>[] => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
        if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
};

const getTableLabel = (table: KitchenItem['table']): string => {
    if (!table) return 'No table';
    return (
        table.name ??
        table.tableName ??
        (table.tableNumber != null ? `Table ${table.tableNumber}` : table.tableNo ? `Table ${table.tableNo}` : 'Table')
    );
};

const getElapsedMinutes = (isoDate?: string) =>
    isoDate ? Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000)) : 0;

const formatElapsed = (minutes: number) => {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
};

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

// ── Presentational pieces ───────────────────────────────────────────────────
const KitchenItemCard = ({
    item,
    isUpdating,
    onAdvance,
}: {
    item: KitchenItem;
    isUpdating: boolean;
    onAdvance: (item: KitchenItem, nextStatus: KitchenItemStatus) => void;
}) => {
    const next = NEXT_KITCHEN_STATUS[item.status];
    const elapsedMinutes = getElapsedMinutes(item.sentToKitchenAt);
    const isLate = (item.status === 'in_queue' || item.status === 'preparing') && elapsedMinutes >= LATE_AFTER_MINUTES;

    return (
        <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
            <header className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-heading">{item.orderNo}</p>
                    <p className="truncate text-sm text-muted">
                        {item.tableId ? getTableLabel(item.table) : 'No table'}
                    </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                    {ORDER_TYPE_LABELS[item.orderType] ?? item.orderType}
                </span>
            </header>

            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-lg font-semibold text-primary-text">
                    {item.quantity}
                </span>
                <h3 className={`text-base font-semibold text-heading ${item.status === 'cancelled' ? 'line-through opacity-60' : ''}`}>
                    {item.name}
                </h3>
            </div>

            {item.notes && (
                <p className="flex items-start gap-2 rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-text">
                    <NotebookPen size={14} className="mt-0.5 shrink-0" />
                    {item.notes}
                </p>
            )}

            <footer className="mt-auto flex items-center justify-between gap-2 pt-1">
                <div className="flex flex-col gap-1">
                    <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium text-white ${KITCHEN_STATUS_BADGE[item.status]}`}>
                        {KITCHEN_STATUS_LABELS[item.status]}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${isLate ? 'font-semibold text-danger' : 'text-muted'}`}>
                        <Clock size={12} />
                        Sent {formatElapsed(elapsedMinutes)}
                    </span>
                </div>
                {next && (
                    <Button
                        size="sm"
                        isLoading={isUpdating}
                        loadingText="Updating..."
                        onClick={() => onAdvance(item, next.next)}
                    >
                        {next.label}
                    </Button>
                )}
            </footer>
        </article>
    );
};

// ── Main screen ─────────────────────────────────────────────────────────────
const KitchenMain = () => {
    // Outlet
    const { data: outletData } = useGetOutletDropdown();
    const outletOptions = toArray(outletData, 'outlets').map((outlet) => ({
        label: outlet.name,
        value: String(outlet._id),
    }));
    const [selectedOutletId, setSelectedOutletId] = useState('');
    const outletId = selectedOutletId || outletOptions[0]?.value || '';

    // Filters
    const [activeStatus, setActiveStatus] = useState<KitchenItemStatus>('in_queue');
    const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | 'all'>('all');
    const [page, setPage] = useState(1);

    // Served / cancelled items belong to orders that may already be closed, so look at today's orders for those tabs
    const scope = activeStatus === 'served' || activeStatus === 'cancelled' ? 'today' : 'running';

    const { data, isLoading, isFetching, error, refetch } = useGetKitchenItems({
        outletId: outletId || undefined,
        status: activeStatus,
        orderType: orderTypeFilter === 'all' ? undefined : orderTypeFilter,
        scope,
        page,
        limit: PAGE_SIZE,
    });

    const kitchenItems = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;
    const activeTab = KITCHEN_TABS.find((tab) => tab.status === activeStatus)!;

    // Status update
    const { mutateAsync: updateKitchenStatusAsync } = useUpdateItemKitchenStatus();
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

    const handleAdvanceStatus = async (item: KitchenItem, nextStatus: KitchenItemStatus) => {
        setUpdatingItemId(item.itemId);
        try {
            await updateKitchenStatusAsync({ orderId: item.orderId, itemId: item.itemId, status: nextStatus });
            toast.success(`${item.name} marked ${KITCHEN_STATUS_LABELS[nextStatus].toLowerCase()}`);
        } catch (updateError) {
            toast.error(getErrorMessage(updateError, 'Failed to update item status'));
        } finally {
            setUpdatingItemId(null);
        }
    };

    const handleChangeStatusTab = (status: KitchenItemStatus) => {
        setActiveStatus(status);
        setPage(1);
    };

    const handleChangeOrderType = (value: OrderType | 'all') => {
        setOrderTypeFilter(value);
        setPage(1);
    };

    return (
        <div className="flex h-full w-full flex-col gap-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <ChefHat size={20} />
                    </span>
                    <div>
                        <h1 className="text-2xl font-semibold text-heading">Kitchen</h1>
                        <p className="text-sm text-muted">See every item by stage and move it forward as it is cooked and served.</p>
                    </div>
                </div>
                <div className="flex w-full items-end gap-2 sm:w-auto">
                    <div className="w-full sm:w-64">
                        <SearchSelect
                            label="Outlet"
                            options={outletOptions}
                            value={outletId}
                            placeholder="Select outlet"
                            onChange={(option) => {
                                setSelectedOutletId(String(option.value));
                                setPage(1);
                            }}
                            onClear={() => {
                                setSelectedOutletId('');
                                setPage(1);
                            }}
                        />
                    </div>
                    <Button
                        variant="outline"
                        leftIcon={<RefreshCw size={16} />}
                        isLoading={isFetching && !isLoading}
                        loadingText="Refreshing..."
                        onClick={() => refetch()}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Status tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {KITCHEN_TABS.map((tab) => (
                    <Button
                        key={tab.status}
                        variant={activeStatus === tab.status ? 'primary' : 'outline'}
                        onClick={() => handleChangeStatusTab(tab.status)}
                    >
                        {tab.label} ({data?.counts[tab.status] ?? 0})
                    </Button>
                ))}
            </div>

            {/* Order type filter */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">Order type</span>
                {ORDER_TYPE_FILTERS.map((option) => (
                    <Button
                        key={option.value}
                        size="sm"
                        variant={orderTypeFilter === option.value ? 'primary' : 'ghost'}
                        onClick={() => handleChangeOrderType(option.value)}
                    >
                        {option.label}
                    </Button>
                ))}
            </div>

            {/* Items */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {isLoading ? (
                    <p className="py-16 text-center text-sm text-muted">Loading kitchen items...</p>
                ) : error ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                        <p className="text-sm text-danger">{getErrorMessage(error, 'Failed to load kitchen items')}</p>
                        <Button variant="outline" onClick={() => refetch()}>
                            Try again
                        </Button>
                    </div>
                ) : kitchenItems.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted">{activeTab.emptyMessage}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {kitchenItems.map((item) => (
                            <KitchenItemCard
                                key={item.itemId}
                                item={item}
                                isUpdating={updatingItemId === item.itemId}
                                onAdvance={handleAdvanceStatus}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                    <span className="text-sm text-muted">
                        Page {page} of {totalPages} · {data?.total ?? 0} items
                    </span>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<ChevronLeft size={16} />}
                            disabled={page <= 1}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                        >
                            Previous
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            rightIcon={<ChevronRight size={16} />}
                            disabled={page >= totalPages}
                            onClick={() => setPage((current) => current + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KitchenMain;