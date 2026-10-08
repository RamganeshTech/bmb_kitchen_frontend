import { useEffect, useRef, useState } from 'react';
import { ReceiptIndianRupee, RefreshCw, Search, SlidersHorizontal, Eye, IndianRupee, Percent, ShoppingBag } from 'lucide-react';
import { useGetOutletDropdown } from '../../api_service/outlet_api/outletApi';
import { toArray } from '../kitchen_pages/Kitchenmain';
import useDebounce from '../../hooks/useDebounce';
import { useGetMyOrders } from '../../api_service/order_api/orderApi';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import OrderDetailsSideModal from './OrderDetailsSideModal';
import useIsDesktop from '../../hooks/useIsDesktop';
import { SideModal } from '../../components/ui/SideModal';

const PAGE_SIZE = 18;
const MAX_PREVIEW_ITEMS = 3;

// ── Options ────────────────────────────────────────────────────────
const DATE_OPTIONS = [
    { label: 'All time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This week', value: 'week' },
    { label: 'This month', value: 'month' },
    { label: 'This year', value: 'year' },
    { label: 'Custom', value: 'custom' },
];
const ORDER_TYPE_OPTIONS = [
    { label: 'Dine in', value: 'dine_in' },
    { label: 'Takeaway', value: 'takeaway' },
    { label: 'Delivery', value: 'delivery' },
    { label: 'Online', value: 'online' },
];
const PAYMENT_OPTIONS = [
    { label: 'Cash', value: 'cash' },
    { label: 'Card', value: 'card' },
    { label: 'UPI', value: 'upi' },
    { label: 'Split', value: 'split' },
];
const DISCOUNT_OPTIONS = [
    { label: 'With discount', value: 'yes' },
    { label: 'Without discount', value: 'no' },
];
const SORT_OPTIONS = [
    { label: 'Newest first', value: 'newest' },
    { label: 'Oldest first', value: 'oldest' },
    { label: 'Highest amount', value: 'highest' },
    { label: 'Lowest amount', value: 'lowest' },
];
const SORT_MAP = {
    newest: { sortBy: 'paidAt', sortOrder: 'desc' },
    oldest: { sortBy: 'paidAt', sortOrder: 'asc' },
    highest: { sortBy: 'grandTotal', sortOrder: 'desc' },
    lowest: { sortBy: 'grandTotal', sortOrder: 'asc' },
} as const;

const ORDER_TYPE_STYLES: Record<string, string> = {
    dine_in: 'bg-blue-50 text-blue-700',
    takeaway: 'bg-amber-50 text-amber-700',
    delivery: 'bg-purple-50 text-purple-700',
    online: 'bg-pink-50 text-pink-700',
};

// ── Helpers ────────────────────────────────────────────────────────
const formatCurrency = (value?: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value ?? 0);

const formatDateTime = (value?: string | null) =>
    value
        ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
        : '-';

const readName = (value: any, keys: string[] = ['name']) => {
    if (!value) return '-';
    if (typeof value === 'string') return value;
    for (const key of keys) if (value[key]) return String(value[key]);
    return '-';
};

const getTableLabel = (order: any) => readName(order.tableId, ['name', 'tableName', 'tableNumber', 'tableNo']);

// ── Small components ───────────────────────────────────────────────
const PaymentBadge = ({ method }: { method: string }) => (
    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium uppercase text-emerald-700">{method}</span>
);

const SummaryCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</span>
        <div className="min-w-0">
            <p className="text-xs font-medium text-muted">{label}</p>
            <p className="truncate text-lg font-semibold text-heading">{value}</p>
        </div>
    </div>
);


const OrderCard = ({ order, onSelect }: { order: any; onSelect: (orderId: string) => void }) => {
    const items: any[] = order.items ?? [];
    const previewItems = items.slice(0, MAX_PREVIEW_ITEMS);
    const hiddenItemCount = items.length - previewItems.length;
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const hasDiscount = (order.discountAmount ?? 0) > 0;
    const tableLabel = getTableLabel(order);
    const customerName = readName(order.customerId);

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-4 pt-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <ReceiptIndianRupee size={18} />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-heading">{order.orderNo}</p>
                        <p className="truncate text-xs text-muted">
                            {order.billNo ? `Bill ${order.billNo}` : 'No bill number'}
                        </p>
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-lg font-bold leading-tight text-heading">{formatCurrency(order.grandTotal)}</p>
                    <p className="text-xs text-muted">
                        {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                    </p>
                </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
                <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ORDER_TYPE_STYLES[order.orderType] ?? 'bg-gray-100 text-gray-700'
                        }`}
                >
                    {String(order.orderType).replace('_', ' ')}
                </span>
                {order.orderType === 'dine_in' && tableLabel !== '-' && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        Table {tableLabel}
                    </span>
                )}
                <PaymentBadge method={order.paymentMethod} />
                {hasDiscount && (
                    <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                        - {formatCurrency(order.discountAmount)}
                    </span>
                )}
            </div>

            {/* Items preview (truncated) */}
            <div className="mx-4 mt-3 rounded-xl px-3 py-2.5">
                <ul className="space-y-1">
                    {previewItems.map((item) => (
                        <li key={item._id} className="flex items-center border-b border-border py-1 justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate text-heading">{item.name}</span>
                            <span className="shrink-0 text-muted">x {item.quantity}</span>
                        </li>
                    ))}
                    {hiddenItemCount > 0 && (
                        <li className="text-xs font-medium text-primary">
                            + {hiddenItemCount} more {hiddenItemCount === 1 ? 'item' : 'items'}
                        </li>
                    )}
                </ul>
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                <div className="min-w-0 font-medium text-xs text-muted">
                    <p className="truncate">{formatDateTime(order.paidAt)}</p>
                    {customerName !== '-' && <p className="truncate">{customerName}</p>}
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Eye size={14} />}
                    onClick={() => onSelect(order._id)}
                >
                    View details
                </Button>
            </div>
        </div>
    );
};



// ── Filter state ───────────────────────────────────────────────────
interface MyOrdersUiFilters {
    scope: string;
    from: string;
    to: string;
    search: string;
    orderType: string;
    paymentMethod: string;
    discount: string; // '' | 'yes' | 'no'
    sort: keyof typeof SORT_MAP;
    minAmount: string;
    maxAmount: string;
}

const INITIAL_FILTERS: MyOrdersUiFilters = {
    scope: 'all',
    from: '',
    to: '',
    search: '',
    orderType: '',
    paymentMethod: '',
    discount: '',
    sort: 'newest',
    minAmount: '',
    maxAmount: '',
};

// ── Page ───────────────────────────────────────────────────────────
const MyOrdersMain = () => {
    // Outlet
    const { data: outletData } = useGetOutletDropdown();
    const outletOptions = toArray(outletData, 'outlets').map((outlet) => ({
        label: outlet.name,
        value: String(outlet._id),
    }));
    const [selectedOutletId, setSelectedOutletId] = useState('');
    const outletId = selectedOutletId || outletOptions[0]?.value || '';

    // Filters
    const [filters, setFilters] = useState<MyOrdersUiFilters>(INITIAL_FILTERS);
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    const isDesktop = useIsDesktop();
    const [showFilterModal, setShowFilterModal] = useState(false);

    // close the overlay if the screen is resized to desktop
    useEffect(() => {
        if (isDesktop) setShowFilterModal(false);
    }, [isDesktop]);

    const patchFilters = (patch: Partial<MyOrdersUiFilters>) => {
        setFilters((previous) => ({ ...previous, ...patch }));
    };

    const debouncedSearch = useDebounce(filters.search, 400);
    const debouncedMin = useDebounce(filters.minAmount, 500);
    const debouncedMax = useDebounce(filters.maxAmount, 500);

    const isCustomReady = filters.scope !== 'custom' || (!!filters.from && !!filters.to);

    const { data, isLoading, isFetching, error, refetch,
        fetchNextPage, hasNextPage, isFetchingNextPage
    } = useGetMyOrders(
        {
            outletId: outletId || undefined,
            scope: filters.scope as any,
            from: filters.scope === 'custom' ? filters.from : undefined,
            to: filters.scope === 'custom' ? filters.to : undefined,
            search: debouncedSearch || undefined,
            orderType: (filters.orderType || undefined) as any,
            paymentMethod: (filters.paymentMethod || undefined) as any,
            hasDiscount: filters.discount === 'yes' ? true : filters.discount === 'no' ? false : undefined,
            minAmount: debouncedMin !== '' ? Number(debouncedMin) : undefined,
            maxAmount: debouncedMax !== '' ? Number(debouncedMax) : undefined,
            ...SORT_MAP[filters.sort],
            // page,
            limit: PAGE_SIZE,
        },
        { enabled: isCustomReady },
    );

    // const orders: any[] = data?.orders ?? [];
    // const summary = data?.summary;
    // const totalPages = data?.totalPages ?? 1;



    const orders: any[] = data?.pages.flatMap((page) => page.orders) ?? [];
    const summary = data?.pages[0]?.summary;
    const totalOrders = data?.pages[0]?.total ?? 0;

    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target || !hasNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
            },
            { rootMargin: '300px' },
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, orders.length]);

    const activeFilterCount = [
        filters.orderType,
        filters.paymentMethod,
        filters.discount,
        filters.minAmount,
        filters.maxAmount,
        filters.sort !== 'newest' ? filters.sort : '',
    ].filter(Boolean).length;

    const hasAnyFilter = activeFilterCount > 0 || !!filters.search || filters.scope !== 'all';

    const overlayFilterCount = activeFilterCount + (filters.search ? 1 : 0) + (filters.scope !== 'all' ? 1 : 0);
    const filterBadgeCount = isDesktop ? activeFilterCount : overlayFilterCount;

    const searchField = (
        <Input
            label="Search"
            placeholder="Order no or bill no..."
            value={filters.search}
            leftIcon={<Search size={16} />}
            onChange={(e) => patchFilters({ search: e.target.value })}
        />
    );

    const dateSelect = (
        <SearchSelect
            label="Date"
            options={DATE_OPTIONS}
            value={filters.scope}
            placeholder="Date"
            onChange={(option) => patchFilters({ scope: String(option.value) })}
            onClear={() => patchFilters({ scope: 'all' })}
        />
    );

    const fromField = (
        <Input type="date" label="From" value={filters.from} max={filters.to || undefined}
            onChange={(e) => patchFilters({ from: e.target.value })} />
    );

    const toField = (
        <Input type="date" label="To" value={filters.to} min={filters.from || undefined}
            onChange={(e) => patchFilters({ to: e.target.value })} />
    );

    const moreFilterFields = (
        <>
            <SearchSelect label="Order type" options={ORDER_TYPE_OPTIONS} value={filters.orderType} placeholder="All"
                onChange={(option) => patchFilters({ orderType: String(option.value) })}
                onClear={() => patchFilters({ orderType: '' })} />
            <SearchSelect label="Payment method" options={PAYMENT_OPTIONS} value={filters.paymentMethod} placeholder="All"
                onChange={(option) => patchFilters({ paymentMethod: String(option.value) })}
                onClear={() => patchFilters({ paymentMethod: '' })} />
            <SearchSelect label="Discount" options={DISCOUNT_OPTIONS} value={filters.discount} placeholder="All"
                onChange={(option) => patchFilters({ discount: String(option.value) })}
                onClear={() => patchFilters({ discount: '' })} />
            <SearchSelect label="Sort by" options={SORT_OPTIONS} value={filters.sort} placeholder="Newest first"
                onChange={(option) => patchFilters({ sort: option.value as MyOrdersUiFilters['sort'] })}
                onClear={() => patchFilters({ sort: 'newest' })} />
            <Input type="number" label="Min amount" placeholder="0" value={filters.minAmount}
                onChange={(e) => patchFilters({ minAmount: e.target.value })} />
            <Input type="number" label="Max amount" placeholder="Any" value={filters.maxAmount}
                onChange={(e) => patchFilters({ maxAmount: e.target.value })} />
        </>
    );

    return (
        <div className="flex h-full w-full flex-col gap-4">
            {/* Header */}
            <header className="flex flex-wrap items-end justify-between gap-3">
                {/* Left: title (unchanged) */}
                <div className="flex shrink-0 items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <ReceiptIndianRupee size={20} />
                    </span>
                    <div>
                        <h1 className="text-2xl font-semibold text-heading">My Orders</h1>
                        <p className="text-sm text-muted">Paid orders created by you, with full bill details.</p>
                    </div>
                </div>

                {/* Right */}
                <div className="flex w-full flex-wrap items-end gap-2 lg:w-auto lg:justify-end">
                    {/* Desktop only: primary filters inline */}
                    {isDesktop && (
                        <>
                            <div className="w-52">{searchField}</div>
                            <div className="w-32">{dateSelect}</div>
                            {filters.scope === 'custom' && (
                                <>
                                    <div className="w-32">{fromField}</div>
                                    <div className="w-32">{toField}</div>
                                </>
                            )}
                        </>
                    )}

                    {/* Outlet: always visible */}
                    <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
                        <SearchSelect
                            label="Outlet"
                            options={outletOptions}
                            value={outletId}
                            placeholder="Select outlet"
                            onChange={(option) => { setSelectedOutletId(String(option.value)); }}
                            onClear={() => { setSelectedOutletId('');  }}
                        />
                    </div>

                    <Button
                        variant={isDesktop && showMoreFilters ? 'primary' : 'outline'}
                        leftIcon={<SlidersHorizontal size={16} />}
                        onClick={() => (isDesktop ? setShowMoreFilters((open) => !open) : setShowFilterModal(true))}
                    >
                        Filters{filterBadgeCount > 0 ? ` (${filterBadgeCount})` : ''}
                    </Button>

                    {isDesktop && hasAnyFilter && (
                        <Button variant="ghost" onClick={() => { setFilters(INITIAL_FILTERS) }}>
                            Clear all
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        leftIcon={<RefreshCw size={16} />}
                        isLoading={isFetching && !isLoading && !isFetchingNextPage}
                        loadingText="Refreshing..."
                        onClick={() => refetch()}
                    >
                        Refresh
                    </Button>
                </div>
            </header>

            {/* Summary */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard icon={<ShoppingBag size={18} />} label="Orders" value={String(summary?.totalOrders ?? 0)} />
                <SummaryCard icon={<IndianRupee size={18} />} label="Total collected" value={formatCurrency(summary?.totalCollected)} />
                <SummaryCard icon={<ReceiptIndianRupee size={18} />} label="Average order value" value={formatCurrency(summary?.avgOrderValue)} />
                <SummaryCard icon={<Percent size={18} />} label="Total discounts" value={formatCurrency(summary?.totalDiscounts)} />
            </div>

            {/* More filters (collapsible, desktop only) */}
            {isDesktop && showMoreFilters && (
                <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-surface p-4 xl:grid-cols-6">
                    {moreFilterFields}
                </div>
            )}

            {/* Results */}
            {!isCustomReady && <p className="text-sm text-muted">Select both from and to dates to see orders.</p>}

            {error && (
                <div className="flex items-center justify-between rounded-xl border border-danger  px-4 py-3 text-sm text-danger">
                    <span>{(error as Error).message}</span>
                    <Button size="sm" variant="outline" onClick={() => refetch()}>
                        Retry
                    </Button>
                </div>
            )}

            {isLoading && <p className="text-sm text-muted">Loading your orders...</p>}

            {!isLoading && !error && isCustomReady && orders.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
                    <ReceiptIndianRupee size={28} className="text-muted" />
                    <p className="text-sm font-medium text-heading">No paid orders found</p>
                    <p className="text-sm text-muted">Try a different date range or clear some filters.</p>
                </div>
            )}

            {orders.length > 0 && (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                        {orders.map((order) => (
                            <OrderCard key={order._id} order={order} onSelect={setSelectedOrderId} />
                        ))}
                    </div>

                    {/* Infinite loading marker */}
                    <div ref={loadMoreRef} className="flex justify-center py-4 text-sm text-muted">
                        {isFetchingNextPage && 'Loading more orders...'}
                        {!hasNextPage && `Showing all ${totalOrders} ${totalOrders === 1 ? 'order' : 'orders'}`}
                    </div>
                </>
            )}

            <OrderDetailsSideModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />


            <SideModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                title="Filters"
                width="w-full sm:w-[400px]"
                actions={
                    hasAnyFilter ? (
                        <Button size="sm" variant="ghost" onClick={() => { setFilters(INITIAL_FILTERS) }}>
                            Clear all
                        </Button>
                    ) : undefined
                }
            >
                <div className="flex flex-col gap-4 pb-32">
                    {searchField}
                    {dateSelect}
                    {filters.scope === 'custom' && <div className="grid grid-cols-2 gap-3">{fromField}{toField}</div>}

                    <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                        {moreFilterFields}
                    </div>

                    <Button className="w-full" onClick={() => setShowFilterModal(false)}>
                        {/* Show {data?.total ?? 0} {data?.total === 1 ? 'order' : 'orders'} */}
                        Show {totalOrders} {totalOrders === 1 ? 'order' : 'orders'}
                    </Button>
                </div>
            </SideModal>
        </div>
    );
};

export default MyOrdersMain;