import { useEffect, useRef, useState } from 'react';
import {
    AlertTriangle, Bell, BellOff, CheckCheck,
    Globe, Megaphone, Moon, Receipt,
    RefreshCw, ShoppingBag, UtensilsCrossed, type LucideIcon,
} from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { SearchSelect, type SelectOption } from '../../components/ui/SearchSelect';
import {
    useInfiniteNotifications, useMarkNotificationAsRead,
    type NotificationEventKey, type NotificationItem,
} from '../../api_service/notification_api/notificationApi';
import { useGetOutletDropdown } from '../../api_service/outlet_api/outletApi';
import useCurrentOutlet from '../../hooks/useCurrentOutlet';

// ── Constants ────────────────────────────────────────────────────────────────
const NOTIFICATIONS_PAGE_SIZE = 20;

interface OutletOption {
    label: string;
    value: string;
}

const EVENT_DISPLAY: Record<NotificationEventKey, { label: string; icon: LucideIcon }> = {
    billShare: { label: 'Bill shared', icon: Receipt },
    orderReady: { label: 'Order ready', icon: UtensilsCrossed },
    lowStock: { label: 'Low stock', icon: AlertTriangle },
    dayClosing: { label: 'Day closing', icon: Moon },
    newOnline: { label: 'New online order', icon: ShoppingBag },
    offerBlast: { label: 'Offer', icon: Megaphone },
    general: { label: 'General', icon: Bell },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatRelativeTime = (isoDate: string): string => {
    const elapsedSeconds = Math.round((Date.now() - new Date(isoDate).getTime()) / 1000);

    if (elapsedSeconds < 60) return 'Just now';
    if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} min ago`;
    if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} hr ago`;
    if (elapsedSeconds < 86400 * 7) return `${Math.floor(elapsedSeconds / 86400)} d ago`;

    return new Date(isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Row ──────────────────────────────────────────────────────────────────────
interface NotificationRowProps {
    notification: NotificationItem;
    outletName: string | null;
    isMarkingAsRead: boolean;
    onMarkAsRead: (notificationId: string) => void;
}

const NotificationRow = ({ notification, outletName, isMarkingAsRead, onMarkAsRead }: NotificationRowProps) => {
    const { label: eventLabel, icon: EventIcon } = EVENT_DISPLAY[notification.eventKey] ?? EVENT_DISPLAY.general;
    const isOrgWide = notification.outletId === null;

    return (
        <li className="flex items-start gap-4 border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-surface-hover sm:px-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <EventIcon size={20} />
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-base font-semibold text-heading">{notification.title}</h3>
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-white">
                        {eventLabel}
                    </span>
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${isOrgWide ? 'bg-body' : 'bg-info'
                            }`}
                    >
                        {isOrgWide && <Globe size={12} />}
                        {isOrgWide ? 'All outlets' : (outletName ?? 'Outlet')}
                    </span>
                </div>

                <p className="mt-1 text-sm leading-relaxed text-body">{notification.message}</p>
                <p className="mt-1.5 text-xs text-muted">{formatRelativeTime(notification.createdAt)}</p>
            </div>

            <Button
                variant="outline"
                size="sm"
                leftIcon={<CheckCheck size={14} />}
                isLoading={isMarkingAsRead}
                loadingText="Marking..."
                onClick={() => onMarkAsRead(notification._id)}
            >
                Mark as read
            </Button>
        </li>
    );
};

const NotificationListSkeleton = () => (
    <ul aria-hidden="true">
        {Array.from({ length: 5 }).map((_, skeletonIndex) => (
            <li key={skeletonIndex} className="flex items-start gap-4 border-b border-border px-5 py-4 last:border-b-0">
                <span className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-surface-hover" />
                <div className="flex-1 space-y-2">
                    <span className="block h-4 w-1/3 animate-pulse rounded bg-surface-hover" />
                    <span className="block h-3 w-3/4 animate-pulse rounded bg-surface-hover" />
                    <span className="block h-3 w-16 animate-pulse rounded bg-surface-hover" />
                </div>
            </li>
        ))}
    </ul>
);

// ── Page ─────────────────────────────────────────────────────────────────────
const NotificationMain = () => {
    const { outletId, outletName } = useCurrentOutlet()
    console.log("outletId")
    const [selectedOutlet, setSelectedOutlet] = useState<OutletOption | null>(
        // {label: outletName, value: outletId} || null
        outletId ? { label: outletName ?? '', value: outletId } : null
    );
    const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);


    useEffect(() => {
        if (outletId) {
            setSelectedOutlet({ label: outletName!, value: outletId })
        }
    }, [outletId])
    const { data: outletDropdownData, isLoading: isOutletDropdownLoading } = useGetOutletDropdown();

    const {
        data: notificationPages,
        isLoading,
        isError,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isRefetching,
    } = useInfiniteNotifications({
        outletId: selectedOutlet?.value,
        limit: NOTIFICATIONS_PAGE_SIZE,
    });

    const { mutateAsync: markAsReadAsync, isPending: isMarkingAsRead, variables: markingNotificationId } =
        useMarkNotificationAsRead();

    // Outlet options for the search select (response shape: array of outlets with _id + name)
    const outletList: any[] = Array.isArray(outletDropdownData)
        ? outletDropdownData
        : (outletDropdownData?.items ?? outletDropdownData?.outlets ?? []);

    const outletOptions: OutletOption[] = outletList.map((outlet) => ({
        label: outlet.name,
        value: outlet._id,
    }));

    const outletNameById = new Map(outletOptions.map((option) => [option.value, option.label]));

    const notifications: NotificationItem[] = notificationPages?.pages.flatMap((page) => page.items) ?? [];
    const totalNotifications = notificationPages?.pages[0]?.pagination.total ?? 0;

    // Infinite loading: fetch the next page when the sentinel scrolls near the viewport
    useEffect(() => {
        const sentinelElement = loadMoreSentinelRef.current;
        if (!sentinelElement || !hasNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(sentinelElement);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, notifications.length]);

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await markAsReadAsync(notificationId);
            toast.success('Notification marked as read');
        } catch (markError: any) {
            toast.error(markError.message || 'Could not mark the notification as read');
        }
    };

    // const handleOutletChange = (option: OutletOption) => setSelectedOutlet(option);
    const handleOutletChange = (option: SelectOption) =>
        setSelectedOutlet({ label: option.label, value: String(option.value) });
    const handleOutletClear = () => setSelectedOutlet(null);

    return (
        <div className="flex w-full flex-col gap-5 p-2">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Bell size={20} />
                    </span>
                    <div>
                        <h1 className="text-2xl font-semibold text-heading">Notifications</h1>
                        <p className="text-sm text-muted">
                            {selectedOutlet
                                ? `Unread alerts for ${selectedOutlet.label} and all-outlet announcements`
                                : 'Unread alerts from all outlets'}
                        </p>
                    </div>
                </div>

                <div className="flex w-full items-end gap-2 sm:w-auto">
                    <div className="w-full sm:w-72">
                        <SearchSelect
                            label="Outlet"
                            options={outletOptions}
                            value={selectedOutlet?.value ?? ''}
                            placeholder={isOutletDropdownLoading ? 'Loading outlets...' : 'All outlets'}
                            onChange={handleOutletChange}
                            onClear={handleOutletClear}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Refresh notifications"
                        isLoading={isRefetching && !isFetchingNextPage}
                        onClick={() => refetch()}
                    >
                        <RefreshCw size={16} />
                    </Button>
                </div>
            </div>

            {/* List */}
            <section className="min-h-[300px] w-full overflow-hidden rounded-xl border border-border bg-surface">
                {isLoading ? (
                    <NotificationListSkeleton />
                ) : isError ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 px-4 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-soft text-danger">
                            <AlertTriangle size={20} />
                        </span>
                        <p className="text-base font-medium text-heading">Could not load notifications</p>
                        <p className="text-sm text-muted">{error?.message}</p>
                        <Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => refetch()}>
                            Try again
                        </Button>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 px-4 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                            <BellOff size={20} />
                        </span>
                        <p className="text-base font-medium text-heading">You're all caught up</p>
                        <p className="text-sm text-muted">
                            {selectedOutlet
                                ? 'No unread notifications for this outlet.'
                                : 'No unread notifications right now.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <ul>
                            {notifications.map((notification) => (
                                <NotificationRow
                                    key={notification._id}
                                    notification={notification}
                                    outletName={notification.outletId ? (outletNameById.get(notification.outletId) ?? null) : null}
                                    isMarkingAsRead={isMarkingAsRead && markingNotificationId === notification._id}
                                    onMarkAsRead={handleMarkAsRead}
                                />
                            ))}
                        </ul>

                        {/* Infinite-scroll sentinel + fallback button */}
                        <div ref={loadMoreSentinelRef} className="flex items-center justify-center border-t border-border px-4 py-4">
                            {hasNextPage ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    isLoading={isFetchingNextPage}
                                    loadingText="Loading more..."
                                    onClick={() => fetchNextPage()}
                                >
                                    Load more
                                </Button>
                            ) : (
                                <p className="text-sm text-muted">
                                    Showing all {totalNotifications} notification{totalNotifications === 1 ? '' : 's'}
                                </p>
                            )}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default NotificationMain;