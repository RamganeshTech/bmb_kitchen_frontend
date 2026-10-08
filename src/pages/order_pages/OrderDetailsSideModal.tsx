import { Receipt, User, MapPin, Store, Clock, CreditCard } from 'lucide-react';
import { SideModal } from '../../components/ui/SideModal';
import { useGetOrderById } from '../../api_service/order_api/orderApi';

// Change this one line to make the panel wider or narrower
const PANEL_WIDTH = 'w-full sm:w-[560px] lg:w-[720px]';

// ── Helpers ────────────────────────────────────────────────────────
const formatCurrency = (value?: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value ?? 0);

const formatDateTime = (value?: string | Date | null) =>
    value
        ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
        : '-';

const readName = (value: any, keys: string[] = ['name']) => {
    if (!value) return '-';
    if (typeof value === 'string') return value;
    for (const key of keys) if (value[key]) return String(value[key]);
    return '-';
};

const ORDER_TYPE_STYLES: Record<string, string> = {
    dine_in: 'bg-blue-50 text-blue-700',
    takeaway: 'bg-amber-50 text-amber-700',
    delivery: 'bg-purple-50 text-purple-700',
    online: 'bg-pink-50 text-pink-700',
};

const ITEM_STATUS_STYLES: Record<string, string> = {
    in_queue: 'bg-amber-50 text-amber-700',
    preparing: 'bg-blue-50 text-blue-700',
    ready: 'bg-emerald-50 text-emerald-700',
    served: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-700',
};

// ── Small components ───────────────────────────────────────────────
const InfoTile = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            {icon}
        </span>
        <div className="min-w-0">
            <p className="text-xs text-muted">{label}</p>
            <p className="truncate text-sm font-medium capitalize text-heading">{value}</p>
        </div>
    </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="mb-3 text-sm font-semibold text-heading">{children}</h3>
);

const BillLine = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className={`flex items-center justify-between gap-3 ${strong ? 'text-base font-semibold text-heading' : 'text-sm text-muted'}`}>
        <span>{label}</span>
        <span>{value}</span>
    </div>
);

// ── Component ──────────────────────────────────────────────────────
interface OrderDetailsSideModalProps {
    orderId: string | null;
    onClose: () => void;
}

const OrderDetailsSideModal = ({ orderId, onClose }: OrderDetailsSideModalProps) => {
    const { data: order, isLoading, error } = useGetOrderById(orderId ?? undefined);

    const items: any[] = order?.items ?? [];
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const hasBreakdown =
        (order?.offerDiscountAmount ?? 0) > 0 ||
        (order?.loyaltyDiscountAmount ?? 0) > 0 ||
        (order?.manualDiscountAmount ?? 0) > 0;

    return (
        <SideModal
            isOpen={!!orderId}
            onClose={onClose}
            title={order?.orderNo ? `Order ${order.orderNo}` : 'Order details'}
            width={PANEL_WIDTH}
        >
            {isLoading && <p className="text-sm text-muted">Loading order details...</p>}
            {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}

            {order && (
                <div className="space-y-6">
                    {/* Hero */}
                    <section className="rounded-2xl border border-border bg-surface p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                                    <Receipt size={20} />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold text-heading">{order.orderNo}</p>
                                    <p className="text-xs text-muted">{order.billNo ? `Bill ${order.billNo}` : 'No bill number'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted">Grand total</p>
                                <p className="text-2xl font-bold text-heading">{formatCurrency(order.grandTotal)}</p>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium capitalize text-green-700">
                                {order.paymentStatus}
                            </span>
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                    ORDER_TYPE_STYLES[order.orderType] ?? 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                {String(order.orderType).replace('_', ' ')}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium uppercase text-emerald-700">
                                {order.paymentMethod}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700">
                                {order.orderStatus}
                            </span>
                        </div>
                    </section>

                    {/* Details */}
                    <section>
                        <SectionTitle>Order information</SectionTitle>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <InfoTile icon={<Store size={16} />} label="Outlet" value={readName(order.outletId)} />
                            <InfoTile
                                icon={<MapPin size={16} />}
                                label="Table"
                                value={readName(order.tableId, ['name', 'tableName', 'tableNumber', 'tableNo'])}
                            />
                            <InfoTile icon={<User size={16} />} label="Customer" value={readName(order.customerId)} />
                            <InfoTile icon={<User size={16} />} label="Created by" value={readName(order.createdBy)} />
                            <InfoTile icon={<Clock size={16} />} label="Created at" value={formatDateTime(order.createdAt)} />
                            <InfoTile icon={<CreditCard size={16} />} label="Paid at" value={formatDateTime(order.paidAt)} />
                        </div>
                    </section>

                    {/* Items */}
                    <section>
                        <SectionTitle>
                            Items ({items.length}) · {totalQuantity} qty
                        </SectionTitle>
                        <div className="overflow-hidden rounded-xl border border-border">
                            <div className="hidden grid-cols-[1fr_auto_auto] gap-4 bg-surface-hover px-4 py-2 text-xs font-medium uppercase text-muted sm:grid">
                                <span>Item</span>
                                <span className="w-24 text-right">Qty x Price</span>
                                <span className="w-24 text-right">Total</span>
                            </div>
                            <ul className="divide-y divide-border">
                                {items.map((item) => (
                                    <li
                                        key={item._id}
                                        className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[1fr_auto_auto]"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-heading">{item.name}</p>
                                            {item.notes && <p className="mt-0.5 text-xs italic text-muted">Note: {item.notes}</p>}
                                            <span
                                                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs capitalize ${
                                                    ITEM_STATUS_STYLES[item.status] ?? 'bg-gray-100 text-gray-700'
                                                }`}
                                            >
                                                {String(item.status).replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-right text-sm text-muted sm:w-24">
                                            {item.quantity} x {formatCurrency(item.price)}
                                        </p>
                                        <p className="col-start-2 text-right text-sm font-semibold text-heading sm:col-start-auto sm:w-24">
                                            {formatCurrency(item.itemTotal)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    {/* Bill summary */}
                    <section>
                        <SectionTitle>Bill summary</SectionTitle>
                        <div className="space-y-2 rounded-xl border border-border bg-surface-hover p-4">
                            <BillLine label="Sub total" value={formatCurrency(order.subTotal)} />

                            {hasBreakdown ? (
                                <>
                                    {order.offerDiscountAmount > 0 && (
                                        <BillLine label="Offer discount" value={`- ${formatCurrency(order.offerDiscountAmount)}`} />
                                    )}
                                    {order.loyaltyDiscountAmount > 0 && (
                                        <BillLine
                                            label={`Loyalty discount (${order.loyaltyPointsRedeemed ?? 0} pts)`}
                                            value={`- ${formatCurrency(order.loyaltyDiscountAmount)}`}
                                        />
                                    )}
                                    {order.manualDiscountAmount > 0 && (
                                        <BillLine label="Manual discount" value={`- ${formatCurrency(order.manualDiscountAmount)}`} />
                                    )}
                                </>
                            ) : (
                                order.discountAmount > 0 && (
                                    <BillLine label="Discount" value={`- ${formatCurrency(order.discountAmount)}`} />
                                )
                            )}

                            {order.serviceChargeAmount > 0 && (
                                <BillLine label="Service charge" value={formatCurrency(order.serviceChargeAmount)} />
                            )}
                            <BillLine label={`Tax (${order.taxPercent ?? 0}%)`} value={formatCurrency(order.taxAmount)} />

                            <div className="border-t border-border pt-2">
                                <BillLine label="Grand total" value={formatCurrency(order.grandTotal)} strong />
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </SideModal>
    );
};

export default OrderDetailsSideModal;