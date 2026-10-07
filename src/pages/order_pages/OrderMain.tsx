import { useState } from 'react';
import {
    ArrowLeft,
    Ban,
    ChefHat,
    ChevronDown,
    ClipboardList,
    Minus,
    Plus,
    Receipt,
    ReceiptIndianRupee,
    Search,
    ShoppingCart,
    Trash2,
    UtensilsCrossed,
} from 'lucide-react';

import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { SideModal } from '../../components/ui/SideModal';
import { useAuthData } from '../../hooks/useAuthData';

// ⚠️ Verify these hook paths/names against your api_service folder
import {
    ORDER_CANCEL_ROLES,
    useAddItemsToExistingOrder,
    useCancelOrder,
    useGetActiveOrders,
    useGetCheckoutPreview,
    useGetOrderById,
    usePlaceNewOrder,
    useProcessOrderCheckout,
    useUpdateItemKitchenStatus,
    type KitchenItemStatus,
    type OrderItemInput,
    type OrderType,
} from '../../api_service/order_api/orderApi';
import { useGetActiveMenuItems } from '../../api_service/menuItem_api/menuItemApi';
import { useGetMenuCategoryDropdown } from '../../api_service/menuCategory_api/menuCategoryApi';
import { useGetOutletDropdown } from '../../api_service/outlet_api/outletApi';
import { useGetCustomerById, useGetCustomerDropdown } from '../../api_service/customer_api/customerApi';
import useDebounce from '../../hooks/useDebounce';
import { useGetActiveTables } from '../../api_service/restauranttable_api/restaurantTableApi';
import { useGetOfferDropdown } from '../../api_service/offer_api/offerApi';

// ── Types ───────────────────────────────────────────────────────────────────
type ApiRecord = Record<string, any>;
type FoodType = 'veg' | 'non_veg' | 'egg';
type PaymentMethodChoice = 'cash' | 'card' | 'upi';

interface MenuVariant {
    id: string;
    name: string;
    price: number;
}

interface MenuAddOn {
    id: string;
    name: string;
    price: number;
}

interface MenuCardItem {
    id: string;
    name: string;
    basePrice: number;
    foodType: FoodType | null;
    imageUrl: string | null;
    variants: MenuVariant[];
    addOns: MenuAddOn[];
    isAvailable: boolean;
}

interface CartLine {
    key: string;
    menuItemId: string;
    name: string;
    variantId?: string;
    variantName?: string;
    modifierIds: string[];
    modifierNames: string[];
    unitPrice: number;
    quantity: number;
    notes: string;
}

interface CheckoutValues {
    paymentMethod: PaymentMethodChoice;
    offerId: string;
    loyaltyPointsRedeemed: number;
    manualDiscount: number;
}

// ── Constants ───────────────────────────────────────────────────────────────
const NEW_ORDER_KEY = 'new';
const EMPTY_LINES: CartLine[] = [];

const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
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

const PAYMENT_OPTIONS: { value: PaymentMethodChoice; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'upi', label: 'UPI' },
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
    in_queue: { next: 'preparing', label: 'Start' },
    preparing: { next: 'ready', label: 'Ready' },
    ready: { next: 'served', label: 'Served' },
};

// ── Adapters (single place to fix if the menu / table / customer shape differs) ──
const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
});

const formatCurrency = (value: number | undefined | null) => currencyFormatter.format(Number(value) || 0);

const toArray = (data: any, ...keys: string[]): ApiRecord[] => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
        if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
};


const normalizeMenuItem = (raw: ApiRecord): MenuCardItem => {
    const basePrice = Number(raw.basePrice) || 0;

    return {
        id: String(raw._id),
        name: raw.name ?? 'Untitled item',
        basePrice,
        foodType: raw.foodType ?? null,
        imageUrl: raw.images?.[0]?.url ?? null,
        isAvailable: raw.isActive !== false,
        // API sends priceDifference (relative to base price).
        // Convert to the FULL variant price so the rest of the UI can keep using variant.price.
        variants: (raw.variants ?? []).map((variant: ApiRecord, index: number) => ({
            id: String(variant._id ?? variant.id ?? `${raw._id}-v${index}`),
            name: variant.name ?? `Option ${index + 1}`,
            price: basePrice + (Number(variant.priceDifference) || 0),
        })),
        // Add-on price is ADDED on top of the selected variant/base price
        addOns: (raw.addOns ?? []).map((addOn: ApiRecord, index: number) => ({
            id: String(addOn._id ?? addOn.id ?? `${raw._id}-a${index}`),
            name: addOn.name ?? `Add-on ${index + 1}`,
            price: Number(addOn.price) || 0,
        })),
    };
};

const getTableLabel = (table: ApiRecord | string | null | undefined): string => {
    if (!table || typeof table === 'string') return table ? 'Table' : '';
    return (
        table.name ??
        table.tableName ??
        (table.tableNumber != null ? `Table ${table.tableNumber}` : table.tableNo ? `Table ${table.tableNo}` : 'Table')
    );
};

const buildLineKey = (line: Omit<CartLine, 'key'>) =>
    [line.menuItemId, line.variantId ?? '', [...line.modifierIds].sort().join(','), line.notes.trim().toLowerCase()].join('|');

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

// ── Small presentational pieces ─────────────────────────────────────────────
const FoodTypeMark = ({ foodType }: { foodType: FoodType | null }) => {
    if (!foodType) return null;
    const tone = foodType === 'veg' ? 'border-success' : foodType === 'egg' ? 'border-warning' : 'border-danger';
    const dot = foodType === 'veg' ? 'bg-success' : foodType === 'egg' ? 'bg-warning' : 'bg-danger';
    return (
        <span
            aria-label={foodType === 'non_veg' ? 'Non-veg' : foodType === 'egg' ? 'Egg' : 'Veg'}
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 ${tone}`}
        >
            <span className={`h-2 w-2 rounded-full ${dot}`} />
        </span>
    );
};

const KitchenStatusBadge = ({ status }: { status: KitchenItemStatus }) => (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${KITCHEN_STATUS_BADGE[status]}`}>
        {KITCHEN_STATUS_LABELS[status]}
    </span>
);

const QuantityStepper = ({
    value,
    onDecrease,
    onIncrease,
}: {
    value: number;
    onDecrease: () => void;
    onIncrease: () => void;
}) => (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
        <Button variant="ghost" size="icon" aria-label="Decrease quantity" onClick={onDecrease} leftIcon={<Minus size={14} />}>
            {' '}
        </Button>
        <span className="min-w-6 text-center text-sm font-semibold text-heading">{value}</span>
        <Button variant="ghost" size="icon" aria-label="Increase quantity" onClick={onIncrease} leftIcon={<Plus size={14} />}>
            {' '}
        </Button>
    </div>
);

const MenuItemCard = ({
    item,
    quantityInDraft,
    onSelect,
}: {
    item: MenuCardItem;
    quantityInDraft: number;
    onSelect: (item: MenuCardItem) => void;
}) => {
    const hasChoices = item.variants.length > 0 || item.addOns.length > 0;
    console.log("item", item)
    console.log("item name", item.name)
    console.log("item basePrice", item.basePrice)
    const startingPrice = item.variants.length > 0 ? Math.min(...item.variants.map((variant) => variant.price)) : item.basePrice;


    return (
        <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary">
            <div className="relative h-28 w-full bg-primary-soft">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary-text">
                        <UtensilsCrossed size={28} />
                    </div>
                )}
                {quantityInDraft > 0 && (
                    <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                        {quantityInDraft} added
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-start gap-2">
                    <span className="mt-0.5">
                        <FoodTypeMark foodType={item.foodType} />
                    </span>
                    <h3 className="line-clamp-2 text-base font-semibold text-heading">{item.name}</h3>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2">
                    <div>
                        <p className="text-base font-semibold text-heading">
                            {item.variants.length > 0 && <span className="mr-1 text-xs font-normal text-muted">from</span>}
                            {formatCurrency(startingPrice)}
                        </p>
                        {hasChoices && (
                            <p className="text-xs text-muted">
                                {item.variants.length > 0 ? `${item.variants.length} sizes` : ''}
                                {item.variants.length > 0 && item.addOns.length > 0 ? ' · ' : ''}
                                {item.addOns.length > 0 ? `${item.addOns.length} add-ons` : ''}
                            </p>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant={hasChoices ? 'outline' : 'primary'}
                        leftIcon={<Plus size={16} />}
                        onClick={() => onSelect(item)}
                    >
                        {hasChoices ? 'Choose' : 'Add'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ItemOptionsForm = ({
    item,
    onCancel,
    onConfirm,
}: {
    item: MenuCardItem;
    onCancel: () => void;
    onConfirm: (line: Omit<CartLine, 'key'>) => void;
}) => {
    const [selectedVariantId, setSelectedVariantId] = useState(item.variants[0]?.id ?? '');
    const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    const selectedVariant = item.variants.find((variant) => variant.id === selectedVariantId);
    const selectedAddOns = item.addOns.filter((addOn) => selectedAddOnIds.includes(addOn.id));
    const unitPrice =
        (selectedVariant?.price ?? item.basePrice) + selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);

    const toggleAddOn = (addOnId: string) =>
        setSelectedAddOnIds((current) =>
            current.includes(addOnId) ? current.filter((id) => id !== addOnId) : [...current, addOnId]
        );

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onConfirm({
            menuItemId: item.id,
            name: item.name,
            variantId: selectedVariant?.id,
            variantName: selectedVariant?.name,
            modifierIds: selectedAddOns.map((addOn) => addOn.id),
            modifierNames: selectedAddOns.map((addOn) => addOn.name),
            unitPrice,
            quantity,
            notes: notes.trim(),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {item.variants.length > 0 && (
                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-sm font-semibold text-heading">Choose size / variant</legend>
                    {item.variants.map((variant) => (
                        <label
                            key={variant.id}
                            className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${selectedVariantId === variant.id
                                ? 'border-primary bg-primary-soft'
                                : 'border-border hover:bg-surface-hover'
                                }`}
                        >
                            <span className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    name="variant"
                                    className="accent-primary"
                                    checked={selectedVariantId === variant.id}
                                    onChange={() => setSelectedVariantId(variant.id)}
                                />
                                <span className="text-sm font-medium text-heading">{variant.name}</span>
                            </span>
                            <span className="text-sm font-semibold text-heading">{formatCurrency(variant.price)}</span>
                        </label>
                    ))}
                </fieldset>
            )}

            {item.addOns.length > 0 && (
                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-sm font-semibold text-heading">Add-ons</legend>
                    {item.addOns.map((addOn) => (
                        <label
                            key={addOn.id}
                            className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${selectedAddOnIds.includes(addOn.id)
                                ? 'border-primary bg-primary-soft'
                                : 'border-border hover:bg-surface-hover'
                                }`}
                        >
                            <span className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    className="accent-primary"
                                    checked={selectedAddOnIds.includes(addOn.id)}
                                    onChange={() => toggleAddOn(addOn.id)}
                                />
                                <span className="text-sm font-medium text-heading">{addOn.name}</span>
                            </span>
                            <span className="text-sm text-body">+ {formatCurrency(addOn.price)}</span>
                        </label>
                    ))}
                </fieldset>
            )}

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="line-notes">Kitchen note</Label>
                <Input
                    id="line-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="e.g. less spicy, no onions"
                />
            </div>

            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-heading">Quantity</span>
                <QuantityStepper
                    value={quantity}
                    onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
                    onIncrease={() => setQuantity((current) => current + 1)}
                />
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-5">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">Add to order · {formatCurrency(unitPrice * quantity)}</Button>
            </div>
        </form>
    );
};

const CheckoutForm = ({
    orderId,
    customerId,
    isSubmitting,
    onCancel,
    onSubmit,
}: {
    orderId: string;
    customerId?: string;
    isSubmitting: boolean;
    onCancel: () => void;
    onSubmit: (values: CheckoutValues) => void;
}) => {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodChoice>('cash');
    const [offerId, setOfferId] = useState('');
    const [loyaltyPoints, setLoyaltyPoints] = useState('');
    const [manualDiscount, setManualDiscount] = useState('');

    // The preview waits for the cashier to stop typing
    const debouncedPoints = useDebounce(loyaltyPoints, 400);
    const debouncedManual = useDebounce(manualDiscount, 400);

    const { data: customer } = useGetCustomerById(customerId);
    const { data: offerData } = useGetOfferDropdown();
    const offerOptions = toArray(offerData, 'offers').map((offer) => ({
        label: offer.code ? `${offer.title} (${offer.code})` : offer.title,
        value: String(offer._id),
    }));

    const {
        data: preview,
        error: previewError,
        isFetching: isPreviewing,
    } = useGetCheckoutPreview(orderId, {
        offerId: offerId || undefined,
        loyaltyPointsRedeemed: Number(debouncedPoints) || 0,
        manualDiscount: Number(debouncedManual) || 0,
    });

    const availablePoints = customer?.loyaltyPoints ?? 0;
    const isStale = loyaltyPoints !== debouncedPoints || manualDiscount !== debouncedManual;
    const canConfirm = !!preview && !previewError && !isStale && !isPreviewing;

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canConfirm) return;
        onSubmit({
            paymentMethod,
            offerId,
            loyaltyPointsRedeemed: Number(loyaltyPoints) || 0,
            manualDiscount: Number(manualDiscount) || 0,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* <div className="rounded-xl bg-primary p-4">
                <p className="text-sm text-primary-text">Amount to pay</p>
                <p className="text-3xl font-semibold text-primary-text">{preview ? formatCurrency(preview.grandTotal) : '—'}</p>
            </div> */}

            <div className="rounded-2xl bg-primary p-5 text-white">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium opacity-90">Amount to pay</p>
                        <p
                            className={`mt-1 text-4xl font-semibold tracking-tight transition-opacity ${isPreviewing ? 'opacity-60' : ''
                                }`}
                        >
                            {preview ? formatCurrency(preview.grandTotal) : '—'}
                        </p>
                    </div>
                    {preview && preview.totalDiscount > 0 && (
                        <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                            Discount {formatCurrency(preview.totalDiscount)}
                        </span>
                    )}
                </div>

                {preview && (
                    <p className="mt-4 border-t border-white/25 pt-3 text-xs opacity-90">
                        Bill {formatCurrency(preview.subTotal)}
                        {preview.totalDiscount > 0 && ` − ${formatCurrency(preview.totalDiscount)} discount`}
                        {preview.serviceChargeAmount > 0 && ` + ${formatCurrency(preview.serviceChargeAmount)} service charge`}
                        {` + ${formatCurrency(preview.taxAmount)} tax`}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <Label>Payment method</Label>
                <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_OPTIONS.map((option) => (
                        <Button
                            key={option.value}
                            type="button"
                            variant={paymentMethod === option.value ? 'primary' : 'outline'}
                            onClick={() => setPaymentMethod(option.value)}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            </div>

            <SearchSelect
                label="Offer (optional)"
                options={offerOptions}
                value={offerId}
                placeholder="No offer"
                onChange={(option) => setOfferId(String(option.value))}
                onClear={() => setOfferId('')}
            />

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-discount">Manual discount (₹)</Label>
                <Input
                    id="manual-discount"
                    type="number"
                    min={0}
                    value={manualDiscount}
                    onChange={(event) => setManualDiscount(event.target.value)}
                    placeholder="0"
                />
            </div>

            {customerId && (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="loyalty-points">Redeem loyalty points</Label>
                        <span className="text-sm text-muted">
                            {customer ? `${customer.name} · ${availablePoints} points available` : 'Loading points...'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            id="loyalty-points"
                            type="number"
                            min={0}
                            value={loyaltyPoints}
                            onChange={(event) => setLoyaltyPoints(event.target.value)}
                            placeholder="0"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!preview || preview.maxRedeemablePoints <= 0}
                            onClick={() => setLoyaltyPoints(String(preview?.maxRedeemablePoints ?? 0))}
                        >
                            Use max
                        </Button>
                    </div>
                    {preview && availablePoints > 0 && preview.maxRedeemablePoints === 0 && (
                        <p className="text-xs text-muted">Points can't be redeemed on this bill yet.</p>
                    )}
                </div>
            )}

            {previewError && <p className="text-sm text-danger">{getErrorMessage(previewError, 'Could not calculate the bill')}</p>}

            {preview && (
                <dl className="space-y-1 border-t border-border pt-4 text-sm">
                    <div className="flex justify-between text-body">
                        <dt>Sub total</dt>
                        <dd>{formatCurrency(preview.subTotal)}</dd>
                    </div>
                    {preview.offerDiscount > 0 && (
                        <div className="flex justify-between text-body">
                            <dt>Offer</dt>
                            <dd>− {formatCurrency(preview.offerDiscount)}</dd>
                        </div>
                    )}
                    {preview.manualDiscount > 0 && (
                        <div className="flex justify-between text-body">
                            <dt>Manual discount</dt>
                            <dd>− {formatCurrency(preview.manualDiscount)}</dd>
                        </div>
                    )}
                    {preview.loyaltyDiscount > 0 && (
                        <div className="flex justify-between text-body">
                            <dt>Points ({preview.pointsRedeemed})</dt>
                            <dd>− {formatCurrency(preview.loyaltyDiscount)}</dd>
                        </div>
                    )}
                    {preview.serviceChargeAmount > 0 && (
                        <div className="flex justify-between text-body">
                            <dt>Service charge</dt>
                            <dd>{formatCurrency(preview.serviceChargeAmount)}</dd>
                        </div>
                    )}
                    <div className="flex justify-between text-body">
                        <dt>Tax</dt>
                        <dd>{formatCurrency(preview.taxAmount)}</dd>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-heading">
                        <dt>Total</dt>
                        <dd>{formatCurrency(preview.grandTotal)}</dd>
                    </div>
                </dl>
            )}

            <div className="flex justify-end gap-2 border-t border-border pt-5">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={!canConfirm} isLoading={isSubmitting} loadingText="Processing...">
                    Confirm payment
                </Button>
            </div>
        </form>
    );
};


const OrdersList = ({
    orders,
    isLoading,
    typeFilter,
    onTypeFilterChange,
    canCancel,
    onCheckout,
    onAddItems,
    onCancel,
}: {
    orders: ApiRecord[];
    isLoading: boolean;
    typeFilter: string;
    onTypeFilterChange: (value: string) => void;
    canCancel: boolean;
    onCheckout: (order: ApiRecord) => void;
    onAddItems: (order: ApiRecord) => void;
    onCancel: (order: ApiRecord) => void;
}) => (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-heading">
                Unpaid orders <span className="text-muted">({orders.length})</span>
            </h2>
            <div className="flex gap-1">
                {[{ value: 'all', label: 'All' }, ...ORDER_TYPE_OPTIONS].map((option) => (
                    <Button
                        key={option.value}
                        size="sm"
                        variant={typeFilter === option.value ? 'primary' : 'ghost'}
                        onClick={() => onTypeFilterChange(option.value)}
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
                <p className="py-16 text-center text-sm text-muted">Loading orders...</p>
            ) : orders.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted">
                    No unpaid orders. Orders appear here as soon as they are sent to the kitchen.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-3 pb-4 md:grid-cols-2 xl:grid-cols-3">
                    {orders.map((order) => (
                        <article key={order._id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
                            <header className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-base font-semibold text-heading">{order.orderNo}</p>
                                    <p className="truncate text-sm text-muted">
                                        {order.tableId ? getTableLabel(order.tableId) : 'No table'} · placed{' '}
                                        {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                                    {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}
                                </span>
                            </header>

                            <ul className="divide-y divide-border rounded-lg border border-border">
                                {(order.items ?? []).map((item: ApiRecord) => (
                                    <li key={item._id} className="flex items-center justify-between gap-2 px-3 py-2">
                                        <span
                                            className={`text-sm text-heading ${item.status === 'cancelled' ? 'line-through opacity-60' : ''
                                                }`}
                                        >
                                            {item.quantity} × {item.name}
                                        </span>
                                        <KitchenStatusBadge status={item.status as KitchenItemStatus} />
                                    </li>
                                ))}
                            </ul>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted">
                                    {order.paymentStatus === 'partially_paid' ? 'Partially paid' : 'Total'}
                                </span>
                                <span className="text-lg font-semibold text-heading">{formatCurrency(order.grandTotal)}</span>
                            </div>

                            <div className="mt-auto grid grid-cols-2 gap-2">
                                <Button leftIcon={<Receipt size={16} />} onClick={() => onCheckout(order)}>
                                    Checkout
                                </Button>
                                <Button variant="outline" leftIcon={<Plus size={16} />} onClick={() => onAddItems(order)}>
                                    Add items
                                </Button>
                                {canCancel && (
                                    <Button
                                        className="col-span-2"
                                        variant="danger"
                                        leftIcon={<Ban size={16} />}
                                        onClick={() => onCancel(order)}
                                    >
                                        Cancel order
                                    </Button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    </section>
);

// ── Main screen ─────────────────────────────────────────────────────────────
const OrderMain = () => {
    const { currentRole } = useAuthData();
    const canCancelOrders = !!currentRole && ORDER_CANCEL_ROLES.includes(currentRole);

    // Outlet
    const { data: outletData } = useGetOutletDropdown();
    const outletOptions = toArray(outletData, 'outlets').map((outlet) => ({
        label: outlet.name,
        value: String(outlet._id),
    }));
    const [selectedOutletId, setSelectedOutletId] = useState('');
    const outletId = selectedOutletId || outletOptions[0]?.value || '';

    // Menu browsing
    const [searchText, setSearchText] = useState('');
    const debouncedSearch = useDebounce(searchText, 300);
    const [categoryId, setCategoryId] = useState('');
    const { data: categoryData } = useGetMenuCategoryDropdown();
    const categories = toArray(categoryData, 'categories');
    const { data: menuData, isLoading: isMenuLoading } = useGetActiveMenuItems({
        search: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
    });
    const menuItems = toArray(menuData, 'items', 'menuItems')
        .map(normalizeMenuItem)
        .filter((item) => item.isAvailable);

    // Orders
    const { data: activeOrdersData, isLoading: isOrdersLoading } = useGetActiveOrders(outletId || undefined);
    const runningOrders = toArray(activeOrdersData, 'orders');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const { data: orderDetail } = useGetOrderById(selectedOrderId ?? undefined);
    const activeOrder: ApiRecord | undefined =
        selectedOrderId ? (orderDetail ?? runningOrders.find((order) => order._id === selectedOrderId)) : undefined;
    const isActiveOrderOpen = !selectedOrderId || activeOrder?.orderStatus === 'active';

    // New-order details
    const [newOrderType, setNewOrderType] = useState<OrderType>('dine_in');
    const [newTableId, setNewTableId] = useState('');
    const [newCustomerId, setNewCustomerId] = useState('');
    const { data: tablesData } = useGetActiveTables({ outletId: outletId || undefined });
    const tableOptions = toArray(tablesData, 'tables')
        .filter((table) => table.status !== 'occupied')
        .map((table) => ({ label: getTableLabel(table), value: String(table._id) }));
    const { data: customerData } = useGetCustomerDropdown();
    const customerOptions = toArray(customerData, 'customers').map((customer) => ({
        label: customer.phone ? `${customer.name} · ${customer.phone}` : customer.name,
        value: String(customer._id),
    }));

    // Draft items — kept per order so switching orders never loses what was typed
    const [draftsByOrder, setDraftsByOrder] = useState<Record<string, CartLine[]>>({});
    const activeDraftKey = selectedOrderId ?? NEW_ORDER_KEY;
    const draftLines = draftsByOrder[activeDraftKey] ?? EMPTY_LINES;
    const draftSubTotal = draftLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const draftQuantity = draftLines.reduce((sum, line) => sum + line.quantity, 0);

    const updateDraft = (updater: (lines: CartLine[]) => CartLine[]) =>
        setDraftsByOrder((current) => ({ ...current, [activeDraftKey]: updater(current[activeDraftKey] ?? EMPTY_LINES) }));

    const clearDraft = (key: string) =>
        setDraftsByOrder((current) => {
            const { [key]: _removed, ...rest } = current;
            return rest;
        });

    const addLineToDraft = (line: Omit<CartLine, 'key'>) => {
        const key = buildLineKey(line);
        updateDraft((lines) => {
            const existingIndex = lines.findIndex((existing) => existing.key === key);
            if (existingIndex >= 0) {
                return lines.map((existing, index) =>
                    index === existingIndex ? { ...existing, quantity: existing.quantity + line.quantity } : existing
                );
            }
            return [...lines, { ...line, key }];
        });
    };

    const changeLineQuantity = (key: string, delta: number) =>
        updateDraft((lines) =>
            lines
                .map((line) => (line.key === key ? { ...line, quantity: line.quantity + delta } : line))
                .filter((line) => line.quantity > 0)
        );

    const changeLineNotes = (key: string, notes: string) =>
        updateDraft((lines) => lines.map((line) => (line.key === key ? { ...line, notes } : line)));

    const removeLine = (key: string) => updateDraft((lines) => lines.filter((line) => line.key !== key));

    const quantityInDraftByMenuItem = draftLines.reduce<Record<string, number>>((totals, line) => {
        totals[line.menuItemId] = (totals[line.menuItemId] ?? 0) + line.quantity;
        return totals;
    }, {});

    // Modals / UI state
    const [optionsItem, setOptionsItem] = useState<MenuCardItem | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [isPanelOpenOnMobile, setIsPanelOpenOnMobile] = useState(false);
    const [runningTypeFilter, setRunningTypeFilter] = useState<'all' | string>('all');

    const [isOrdersView, setIsOrdersView] = useState(false);
    const [isRunningOpen, setIsRunningOpen] = useState(false); // collapsed by default

    const openCheckoutFor = (order: ApiRecord) => {
        setSelectedOrderId(String(order._id));
        setIsCheckoutOpen(true);
    };

    const openCancelFor = (order: ApiRecord) => {
        setSelectedOrderId(String(order._id));
        setIsCancelOpen(true);
    };

    // Jump back to the menu with this order selected, to add more items
    const openOrderInMenu = (order: ApiRecord) => {
        setSelectedOrderId(String(order._id));
        setIsOrdersView(false);
    };

    const visibleRunningOrders =
        runningTypeFilter === 'all' ? runningOrders : runningOrders.filter((order) => order.orderType === runningTypeFilter);

    // Mutations
    const { mutateAsync: placeOrderAsync, isPending: isPlacingOrder } = usePlaceNewOrder();
    const { mutateAsync: addItemsAsync, isPending: isAddingItems } = useAddItemsToExistingOrder();
    const { mutateAsync: updateKitchenStatusAsync, isPending: isUpdatingKitchenStatus } = useUpdateItemKitchenStatus();
    const { mutateAsync: checkoutAsync, isPending: isCheckingOut } = useProcessOrderCheckout();
    const { mutateAsync: cancelOrderAsync, isPending: isCancelling } = useCancelOrder();

    const toOrderItems = (lines: CartLine[]): OrderItemInput[] =>
        lines.map((line) => {
            const choices = [line.variantName, ...line.modifierNames].filter(Boolean);

            return {
                menuItemId: line.menuItemId,
                // "chicken manchow soup (gravy updated, onion updated)", so the kitchen and bill show the choices
                name: choices.length > 0 ? `${line.name} (${choices.join(', ')})` : line.name,
                price: line.unitPrice, // per-unit price, already variant + add-ons
                quantity: line.quantity,
                notes: line.notes.trim() || undefined,
            };
        });

    const handleSelectMenuItem = (item: MenuCardItem) => {
        if (!isActiveOrderOpen) {
            toast.error('This order is closed. Start a new order to add items.');
            return;
        }
        if (item.variants.length > 0 || item.addOns.length > 0) {
            setOptionsItem(item);
            return;
        }
        addLineToDraft({
            menuItemId: item.id,
            name: item.name,
            modifierIds: [],
            modifierNames: [],
            unitPrice: item.basePrice,
            quantity: 1,
            notes: '',
        });
    };

    const handleConfirmOptions = (line: Omit<CartLine, 'key'>) => {
        addLineToDraft(line);
        setOptionsItem(null);
    };

    const handlePlaceOrder = async () => {
        if (!outletId) return toast.error('Select an outlet first');
        if (draftLines.length === 0) return toast.error('Add at least one item');
        if (newOrderType === 'dine_in' && !newTableId) return toast.error('Select a table for dine-in orders');

        try {
            const response = await placeOrderAsync({
                outletId,
                orderType: newOrderType,
                items: toOrderItems(draftLines),
                tableId: newOrderType === 'dine_in' ? newTableId : undefined,
                customerId: newCustomerId || undefined,
            });
            toast.success('Order placed and sent to kitchen');
            clearDraft(NEW_ORDER_KEY);
            setNewTableId('');
            setNewCustomerId('');
            const createdOrderId = response?.data?._id ?? response?.data?.order?._id;
            if (createdOrderId) setSelectedOrderId(String(createdOrderId));
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to place order'));
        }
    };

    const handleAddItemsToOrder = async () => {
        if (!selectedOrderId) return;
        if (draftLines.length === 0) return toast.error('Add at least one item');

        try {
            await addItemsAsync({ orderId: selectedOrderId, items: toOrderItems(draftLines) });
            toast.success('New items sent to kitchen');
            clearDraft(selectedOrderId);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to add items'));
        }
    };

    const handleAdvanceKitchenStatus = async (itemId: string, status: KitchenItemStatus) => {
        if (!selectedOrderId) return;
        try {
            await updateKitchenStatusAsync({ orderId: selectedOrderId, itemId, status });
            toast.success(`Item marked ${KITCHEN_STATUS_LABELS[status].toLowerCase()}`);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to update item status'));
        }
    };

    const handleCheckout = async (values: CheckoutValues) => {
        if (!selectedOrderId) return;
        try {
            await checkoutAsync({
                orderId: selectedOrderId,
                paymentMethod: values.paymentMethod,
                offerId: values.offerId || undefined,
                loyaltyPointsRedeemed: values.loyaltyPointsRedeemed > 0 ? values.loyaltyPointsRedeemed : undefined,
                manualDiscount: values.manualDiscount > 0 ? values.manualDiscount : undefined,
            });

            toast.success('Payment received. Order completed');
            setIsCheckoutOpen(false);
            if (isOrdersView) setSelectedOrderId(null);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to process payment'));
        }
    };

    const handleCancelOrder = async () => {
        if (!selectedOrderId) return;
        try {
            await cancelOrderAsync(selectedOrderId);
            toast.success('Order cancelled');
            clearDraft(selectedOrderId);
            setIsCancelOpen(false);
            setSelectedOrderId(null);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to cancel order'));
        }
    };

    // ── Order panel (shared by desktop sidebar and mobile modal) ──
    const sentItems: ApiRecord[] = activeOrder?.items ?? [];
    const hasPendingDraft = draftLines.length > 0;

    const orderPanel = (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-heading">
                        {selectedOrderId ? (activeOrder?.orderNo ?? 'Order') : 'New order'}
                    </h2>
                    {selectedOrderId && activeOrder && (
                        <p className="text-sm text-muted">
                            {ORDER_TYPE_LABELS[activeOrder.orderType] ?? activeOrder.orderType}
                            {activeOrder.tableId ? ` · ${getTableLabel(activeOrder.tableId)}` : ''}
                        </p>
                    )}
                </div>
                {selectedOrderId && (
                    <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Plus size={16} />}
                        onClick={() => setSelectedOrderId(null)}
                    >
                        New order
                    </Button>
                )}
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
                {!selectedOrderId && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Label>Order type</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {ORDER_TYPE_OPTIONS.map((option) => (
                                    <Button
                                        key={option.value}
                                        size="sm"
                                        variant={newOrderType === option.value ? 'primary' : 'outline'}
                                        onClick={() => setNewOrderType(option.value)}
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        {newOrderType === 'dine_in' && (
                            <SearchSelect
                                label="Table"
                                options={tableOptions}
                                value={newTableId}
                                placeholder="Select a table"
                                onChange={(option) => setNewTableId(String(option.value))}
                                onClear={() => setNewTableId('')}
                            />
                        )}
                        <SearchSelect
                            label="Customer (optional)"
                            options={customerOptions}
                            value={newCustomerId}
                            placeholder="Walk-in customer"
                            onChange={(option) => setNewCustomerId(String(option.value))}
                            onClear={() => setNewCustomerId('')}
                        />
                    </div>
                )}

                {selectedOrderId && sentItems.length > 0 && (
                    <section className="space-y-2">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-heading">
                            <ChefHat size={16} /> Sent to kitchen
                        </h3>
                        <ul className="divide-y divide-border rounded-xl border border-border">
                            {sentItems.map((item) => {
                                const status = item.status as KitchenItemStatus;
                                const next = NEXT_KITCHEN_STATUS[status];
                                return (
                                    <li key={item._id} className="flex items-start justify-between gap-3 p-3">
                                        <div className="min-w-0">
                                            <p
                                                className={`text-sm font-medium text-heading ${status === 'cancelled' ? 'line-through opacity-60' : ''
                                                    }`}
                                            >
                                                {item.quantity} × {item.name}
                                            </p>
                                            {item.notes && <p className="text-xs text-muted">{item.notes}</p>}
                                            <div className="mt-1 flex items-center gap-2">
                                                <KitchenStatusBadge status={status} />
                                                <span className="text-xs text-muted">{formatCurrency(item.itemTotal)}</span>
                                            </div>
                                        </div>
                                        {next && isActiveOrderOpen && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={isUpdatingKitchenStatus}
                                                onClick={() => handleAdvanceKitchenStatus(item._id, next.next)}
                                            >
                                                {next.label}
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {isActiveOrderOpen && (
                    <section className="space-y-2">
                        <h3 className="text-sm font-semibold text-heading">
                            {selectedOrderId ? 'Add more items' : 'Items'}
                        </h3>
                        {draftLines.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
                                <ShoppingCart size={22} className="text-muted" />
                                <p className="text-sm text-muted">
                                    {selectedOrderId
                                        ? 'Pick items from the menu to add to this order before payment.'
                                        : 'Pick items from the menu to start this order.'}
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {draftLines.map((line) => (
                                    <li key={line.key} className="rounded-xl border border-border bg-surface p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-heading">{line.name}</p>
                                                {(line.variantName || line.modifierNames.length > 0) && (
                                                    <p className="text-xs text-muted">
                                                        {[line.variantName, ...line.modifierNames].filter(Boolean).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Remove ${line.name}`}
                                                onClick={() => removeLine(line.key)}
                                                leftIcon={<Trash2 size={16} />}
                                            >
                                                {' '}
                                            </Button>
                                        </div>
                                        <Input
                                            className="mt-2"
                                            value={line.notes}
                                            onChange={(event) => changeLineNotes(line.key, event.target.value)}
                                            placeholder="Kitchen note"
                                            aria-label={`Note for ${line.name}`}
                                        />
                                        <div className="mt-2 flex items-center justify-between">
                                            <QuantityStepper
                                                value={line.quantity}
                                                onDecrease={() => changeLineQuantity(line.key, -1)}
                                                onIncrease={() => changeLineQuantity(line.key, 1)}
                                            />
                                            <span className="text-sm font-semibold text-heading">
                                                {formatCurrency(line.unitPrice * line.quantity)}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}
            </div>

            <div className="space-y-3 border-t border-border px-4 py-4">
                {selectedOrderId && activeOrder && (
                    <dl className="space-y-1 text-sm">
                        <div className="flex justify-between text-body">
                            <dt>Sub total</dt>
                            <dd>{formatCurrency(activeOrder.subTotal)}</dd>
                        </div>
                        {activeOrder.discountAmount > 0 && (
                            <div className="flex justify-between text-body">
                                <dt>Discount</dt>
                                <dd>− {formatCurrency(activeOrder.discountAmount)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between text-body">
                            <dt>Tax &amp; charges</dt>
                            <dd>{formatCurrency(activeOrder.taxAmount)}</dd>
                        </div>
                        <div className="flex justify-between text-base font-semibold text-heading">
                            <dt>Total</dt>
                            <dd>{formatCurrency(activeOrder.grandTotal)}</dd>
                        </div>
                    </dl>
                )}

                {hasPendingDraft && isActiveOrderOpen && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-body">
                            {draftQuantity} new {draftQuantity === 1 ? 'item' : 'items'}
                        </span>
                        <span className="font-semibold text-heading">{formatCurrency(draftSubTotal)}</span>
                    </div>
                )}
                {!selectedOrderId && hasPendingDraft && (
                    <p className="text-xs text-muted">Tax and service charge are added by the system when the order is placed.</p>
                )}

                {!selectedOrderId && (
                    <Button
                        fullWidth
                        size="lg"
                        leftIcon={<ChefHat size={18} />}
                        isLoading={isPlacingOrder}
                        loadingText="Placing order..."
                        disabled={!hasPendingDraft}
                        onClick={handlePlaceOrder}
                    >
                        Place order
                    </Button>
                )}

                {selectedOrderId && isActiveOrderOpen && (
                    <>
                        <Button
                            fullWidth
                            leftIcon={<ChefHat size={18} />}
                            isLoading={isAddingItems}
                            loadingText="Sending..."
                            disabled={!hasPendingDraft}
                            onClick={handleAddItemsToOrder}
                        >
                            Send {hasPendingDraft ? `${draftQuantity} new ` : 'new '}
                            {draftQuantity === 1 ? 'item' : 'items'} to kitchen
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                leftIcon={<Receipt size={16} />}
                                disabled={hasPendingDraft}
                                onClick={() => setIsCheckoutOpen(true)}
                            >
                                Checkout
                            </Button>
                            {canCancelOrders ? (
                                <Button variant="danger" leftIcon={<Ban size={16} />} onClick={() => setIsCancelOpen(true)}>
                                    Cancel order
                                </Button>
                            ) : (
                                <span />
                            )}
                        </div>
                        {hasPendingDraft && (
                            <p className="text-xs text-muted">Send the new items to the kitchen before taking payment.</p>
                        )}
                    </>
                )}

                {selectedOrderId && activeOrder && !isActiveOrderOpen && (
                    <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-text">
                        This order is {activeOrder.orderStatus}
                        {activeOrder.paymentStatus === 'paid' ? ' and paid.' : '.'} Start a new order to keep selling.
                    </p>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex h-full w-full flex-col gap-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <ClipboardList size={20} />
                    </span>
                    <div>
                        <h1 className="text-2xl font-semibold text-heading">Orders</h1>
                        <p className="text-sm text-muted">Take orders, add items before payment, and settle the bill.</p>
                    </div>
                </div>
                {/* <div className="w-full sm:w-64">
                    <SearchSelect
                        label="Outlet"
                        options={outletOptions}
                        value={outletId}
                        placeholder="Select outlet"
                        onChange={(option) => {
                            setSelectedOutletId(String(option.value));
                            setSelectedOrderId(null);
                        }}
                        onClear={() => setSelectedOutletId('')}
                    />
                </div> */}

                <div className="flex w-full items-end gap-2 sm:w-auto">
                    <Button
                        variant={isOrdersView ? 'primary' : 'outline'}
                        leftIcon={isOrdersView ? <ArrowLeft size={16} /> : <ReceiptIndianRupee size={16} />}
                        onClick={() => setIsOrdersView((current) => !current)}
                    >
                        {isOrdersView ? 'Back to menu' : `Orders (${runningOrders.length})`}
                    </Button>
                    <div className="w-full sm:w-64">
                        <SearchSelect
                            label="Outlet"
                            options={outletOptions}
                            value={outletId}
                            placeholder="Select outlet"
                            onChange={(option) => {
                                setSelectedOutletId(String(option.value));
                                setSelectedOrderId(null);
                            }}
                            onClear={() => setSelectedOutletId('')}
                        />
                    </div>
                </div>
            </div>

            {isOrdersView ? (
                <OrdersList
                    orders={visibleRunningOrders}
                    isLoading={isOrdersLoading}
                    typeFilter={runningTypeFilter}
                    onTypeFilterChange={setRunningTypeFilter}
                    canCancel={canCancelOrders}
                    onCheckout={openCheckoutFor}
                    onAddItems={openOrderInMenu}
                    onCancel={openCancelFor}
                />
            ) : (
                <>
                    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
                        {/* Left: running orders + menu */}
                        <section className="flex min-h-0 min-w-0 flex-col gap-4">
                            {/* Running orders strip */}
                            {/* <div className="rounded-xl border border-border bg-surface p-3">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-base font-semibold text-heading">
                                        Running orders <span className="text-muted">({runningOrders.length})</span>
                                    </h2>
                                    <div className="flex gap-1">
                                        {[{ value: 'all', label: 'All' }, ...ORDER_TYPE_OPTIONS].map((option) => (
                                            <Button
                                                key={option.value}
                                                size="sm"
                                                variant={runningTypeFilter === option.value ? 'primary' : 'ghost'}
                                                onClick={() => setRunningTypeFilter(option.value)}
                                            >
                                                {option.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {isOrdersLoading && <p className="px-2 py-3 text-sm text-muted">Loading orders...</p>}
                                    {!isOrdersLoading && visibleRunningOrders.length === 0 && (
                                        <p className="px-2 py-3 text-sm text-muted">No running orders. Start one from the menu below.</p>
                                    )}
                                    {visibleRunningOrders.map((order) => {
                                        const isSelected = order._id === selectedOrderId;
                                        return (
                                            <div
                                                key={order._id}
                                                role="button"
                                                tabIndex={0}
                                                aria-pressed={isSelected}
                                                onClick={() => setSelectedOrderId(order._id)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        setSelectedOrderId(order._id);
                                                    }
                                                }}
                                                className={`flex w-44 shrink-0 cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2 transition-colors ${isSelected
                                                    ? 'border-primary bg-primary-soft'
                                                    : 'border-border hover:bg-surface-hover'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-heading">{order.orderNo}</span>
                                                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                                                        {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}
                                                    </span>
                                                </div>
                                                <p className="truncate text-xs text-muted">
                                                    {order.tableId ? getTableLabel(order.tableId) : 'No table'} · {order.items?.length ?? 0} items
                                                </p>
                                                <p className="text-sm font-semibold text-heading">{formatCurrency(order.grandTotal)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div> */}


                            <div className="rounded-xl border-2 border-border bg-surface">
                                <div
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={isRunningOpen}
                                    onClick={() => setIsRunningOpen((current) => !current)}
                                    onKeyDown={(event) => {
                                        // ignore keys pressed on the filter buttons inside; only toggle when the header itself has focus
                                        if (event.target !== event.currentTarget) return;
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            setIsRunningOpen((current) => !current);
                                        }
                                    }}
                                    className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2"
                                >
                                    <h2 className="text-sm font-semibold text-heading">
                                        Running orders <span className="text-muted">({runningOrders.length})</span>
                                    </h2>

                                    <div className="flex items-center gap-2">
                                        {isRunningOpen && (
                                            <div
                                                className="flex gap-1"
                                                onClick={(event) => event.stopPropagation()}
                                                onKeyDown={(event) => event.stopPropagation()}
                                            >
                                                {[{ value: 'all', label: 'All' }, ...ORDER_TYPE_OPTIONS].map((option) => (
                                                    <Button
                                                        key={option.value}
                                                        size="sm"
                                                        variant={runningTypeFilter === option.value ? 'primary' : 'ghost'}
                                                        onClick={() => setRunningTypeFilter(option.value)}
                                                    >
                                                        {option.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                        <ChevronDown
                                            size={18}
                                            className={`shrink-0 text-muted transition-transform ${isRunningOpen ? 'rotate-180' : ''}`}
                                        />
                                    </div>
                                </div>

                                {isRunningOpen && (
                                    <div className="border-t-2 border-border p-3">
                                        {/* <div className="mb-2 flex gap-1">
                                            {[{ value: 'all', label: 'All' }, ...ORDER_TYPE_OPTIONS].map((option) => (
                                                <Button
                                                    key={option.value}
                                                    size="sm"
                                                    variant={runningTypeFilter === option.value ? 'primary' : 'ghost'}
                                                    onClick={() => setRunningTypeFilter(option.value)}
                                                >
                                                    {option.label}
                                                </Button>
                                            ))}
                                        </div> */}

                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            {isOrdersLoading && <p className="px-2 py-2 text-xs text-muted">Loading orders...</p>}
                                            {!isOrdersLoading && visibleRunningOrders.length === 0 && (
                                                <p className="px-2 py-2 text-sm text-muted mx-auto font-medium">No running orders. Start one from the menu below.</p>
                                            )}
                                            {visibleRunningOrders?.map((order) => {
                                                const isSelected = order._id === selectedOrderId;
                                                return (
                                                    <div
                                                        key={order._id}
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-pressed={isSelected}
                                                        onClick={() => setSelectedOrderId(order._id)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter' || event.key === ' ') {
                                                                event.preventDefault();
                                                                setSelectedOrderId(order._id);
                                                            }
                                                        }}
                                                        className={`flex w-40 shrink-0 cursor-pointer flex-col gap-0.5 rounded-lg border px-2.5 py-1.5 transition-colors ${isSelected ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-hover'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="text-xs font-semibold text-heading">{order.orderNo}</span>
                                                            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-white">
                                                                {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}
                                                            </span>
                                                        </div>
                                                        <p className="truncate text-[11px] text-muted">
                                                            {order.tableId ? getTableLabel(order.tableId) : 'No table'} · {order.items?.length ?? 0} items
                                                        </p>
                                                        <p className="text-xs font-semibold text-heading">{formatCurrency(order.grandTotal)}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Menu */}
                            <div className="flex min-h-0 flex-1 flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="relative min-w-52 flex-1">
                                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                        <Input
                                            className="pl-9"
                                            value={searchText}
                                            onChange={(event) => setSearchText(event.target.value)}
                                            placeholder="Search menu items"
                                            aria-label="Search menu items"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    <Button
                                        size="sm"
                                        variant={categoryId === '' ? 'primary' : 'outline'}
                                        onClick={() => setCategoryId('')}
                                    >
                                        All
                                    </Button>
                                    {categories.map((category) => (
                                        <Button
                                            key={category._id}
                                            size="sm"
                                            variant={categoryId === String(category._id) ? 'primary' : 'outline'}
                                            onClick={() => setCategoryId(String(category._id))}
                                        >
                                            {category.name}
                                        </Button>
                                    ))}
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto">
                                    {isMenuLoading ? (
                                        <p className="py-16 text-center text-sm text-muted">Loading menu...</p>
                                    ) : menuItems.length === 0 ? (
                                        <p className="py-16 text-center text-sm text-muted">
                                            No menu items found. Try a different search or category.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 pb-20 md:grid-cols-3 xl:grid-cols-4 lg:pb-2">
                                            {menuItems.map((item) => (
                                                <MenuItemCard
                                                    key={item.id}
                                                    item={item}
                                                    quantityInDraft={quantityInDraftByMenuItem[item.id] ?? 0}
                                                    onSelect={handleSelectMenuItem}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Right: order panel (desktop) */}
                        <aside className="hidden min-h-0 overflow-hidden rounded-xl border border-border bg-surface lg:block">
                            {orderPanel}
                        </aside>
                    </div>


                    {/* Mobile: floating order bar + panel modal */}
                    <div className="sticky bottom-2 z-10 lg:hidden">
                        <Button fullWidth size="lg" leftIcon={<ShoppingCart size={18} />} onClick={() => setIsPanelOpenOnMobile(true)}>
                            {selectedOrderId ? (activeOrder?.orderNo ?? 'Order') : 'New order'}
                            {draftQuantity > 0 ? ` · ${draftQuantity} items · ${formatCurrency(draftSubTotal)}` : ''}
                        </Button>
                    </div>

                    {/* ...your existing mobile "sticky bottom-2" order bar, unchanged... */}
                </>
            )}

            <SideModal
                isOpen={isPanelOpenOnMobile}
                onClose={() => setIsPanelOpenOnMobile(false)}
                title={selectedOrderId ? 'Order details' : 'New order'}
            >
                <div className="lg:hidden">{orderPanel}</div>
            </SideModal>

            {/* Variant / add-on picker */}
            <SideModal isOpen={!!optionsItem} onClose={() => setOptionsItem(null)} title={optionsItem?.name ?? 'Choose options'}>
                {optionsItem && (
                    <ItemOptionsForm
                        key={optionsItem.id}
                        item={optionsItem}
                        onCancel={() => setOptionsItem(null)}
                        onConfirm={handleConfirmOptions}
                    />
                )}
            </SideModal>

            {/* Checkout */}
            <SideModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="Checkout">
                {activeOrder && (
                    <CheckoutForm
                        key={activeOrder._id}
                        orderId={activeOrder._id}
                        customerId={activeOrder.customerId ? String(activeOrder.customerId._id ?? activeOrder.customerId) : undefined}
                        isSubmitting={isCheckingOut}
                        onCancel={() => setIsCheckoutOpen(false)}
                        onSubmit={handleCheckout}
                    />
                )}
            </SideModal>

            {/* Cancel confirmation */}
            <SideModal isOpen={isCancelOpen} onClose={() => setIsCancelOpen(false)} title="Cancel this order?">
                <div className="flex flex-col gap-6">
                    <p className="text-sm text-body">
                        {activeOrder?.orderNo} will be cancelled and its table released. This can't be undone.
                    </p>
                    <div className="flex justify-end gap-2 border-t border-border pt-5">
                        <Button type="button" variant="outline" onClick={() => setIsCancelOpen(false)}>
                            Keep order
                        </Button>
                        <Button variant="danger" isLoading={isCancelling} loadingText="Cancelling..." onClick={handleCancelOrder}>
                            Cancel order
                        </Button>
                    </div>
                </div>
            </SideModal>
        </div>
    );
};

export default OrderMain;