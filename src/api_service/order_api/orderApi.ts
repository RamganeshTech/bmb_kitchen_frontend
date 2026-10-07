import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── Roles & URL Configuration ────────────────────────────────────────────────
const BASE_ORDERS_URL = '/api/orders/v1';

export const ORDER_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const ORDER_WRITE_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const ORDER_CANCEL_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;

// ── Types ───────────────────────────────────────────────────────────────────
export type KitchenItemStatus = 'in_queue' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | string;

export interface OrderItemInput {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
}

export interface PlaceNewOrderPayload {
    outletId: string;
    orderType: OrderType;
    items: OrderItemInput[];
    tableId?: string;
    customerId?: string;
}

export interface AddOrderItemsPayload {
    orderId: string;
    items: OrderItemInput[];
}

export interface UpdateItemKitchenStatusPayload {
    orderId: string;
    itemId: string;
    status: KitchenItemStatus;
}

export interface ProcessOrderCheckoutPayload {
    orderId: string;
    paymentMethod: string;
    offerId?: string 
    loyaltyPointsRedeemed?: number;
    manualDiscount?: number;
}

export interface ListOrdersByTypeParams {
    orderType: string;
    outletId?: string;
    orderStatus?: string;
    paymentStatus?: string;
    scope?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

// ── 1. Get Active Orders ────────────────────────────────────────────────────
// Route: GET /api/orders/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetActiveOrders = (outletId?: string) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['orders', 'active', organizationId, outletId],
        queryFn: async () => {
            try {
                checkPermission(currentRole, ORDER_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.get<BaseApiResponse<any>>(
                    `${BASE_ORDERS_URL}/${organizationId}`,
                    { params: outletId ? { outletId } : undefined }
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch active orders');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!organizationId && !!currentRole,
    });
};

// ── 2. Get Order by ID ──────────────────────────────────────────────────────
// Route: GET /api/orders/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useGetOrderById = (orderId?: string) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['orders', 'detail', organizationId, orderId],
        queryFn: async () => {
            try {
                checkPermission(currentRole, ORDER_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!orderId) throw new Error('Order ID is missing');

                const { data } = await Api.get<BaseApiResponse<any>>(
                    `${BASE_ORDERS_URL}/${organizationId}/${orderId}`
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch order details');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!organizationId && !!orderId && !!currentRole,
    });
};

// ── 3. List Orders by Type ──────────────────────────────────────────────────
// Route: GET /api/orders/v1/:organizationId/orders/:orderType
// Allowed: owner, admin, cto, staff
export const useListOrdersByType = (params: ListOrdersByTypeParams) => {
    const { currentRole, organizationId } = useAuthData();
    const { orderType, ...queryParams } = params;

    return useQuery({
        queryKey: ['orders', 'by-type', organizationId, orderType, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, ORDER_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!orderType) throw new Error('Order type is missing');

                const { data } = await Api.get<BaseApiResponse<any>>(
                    `${BASE_ORDERS_URL}/${organizationId}/orders/${orderType}`,
                    { params: queryParams }
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch orders by type');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!organizationId && !!orderType && !!currentRole,
    });
};

// ── 4. Place New Order ──────────────────────────────────────────────────────
// Route: POST /api/orders/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const usePlaceNewOrder = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: PlaceNewOrderPayload) => {
            try {
                checkPermission(currentRole, ORDER_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!payload.outletId) throw new Error('Outlet ID is required');
                if (!payload.items || payload.items.length === 0) {
                    throw new Error('An order must contain at least one item');
                }

                const { data } = await Api.post<BaseApiResponse<any>>(
                    `${BASE_ORDERS_URL}/${organizationId}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to place order');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'by-type', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    });
};

// ── 5. Add Items to Existing Order ──────────────────────────────────────────
// Route: POST /api/orders/v1/:organizationId/:id/items
// Allowed: owner, admin, cto, staff
export const useAddItemsToExistingOrder = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, items }: AddOrderItemsPayload) => {
            try {
                checkPermission(currentRole, ORDER_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!orderId) throw new Error('Order ID is missing');
                if (!items || items.length === 0) throw new Error('Must provide items to add');

                const { data } = await Api.post<BaseApiResponse<any>>(
                    `${BASE_ORDERS_URL}/${organizationId}/${orderId}/items`,
                    { items }
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to add items to order');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, { orderId }) => {
            queryClient.invalidateQueries({ queryKey: ['orders', 'detail', organizationId, orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'by-type', organizationId] });
        },
    });
};

// ── 6. Update Kitchen Status ────────────────────────────────────────────────
// Route: PATCH /api/orders/v1/:organizationId/:id/items/:itemId/status
// Allowed: owner, admin, cto, staff
export const useUpdateItemKitchenStatus = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, itemId, status }: UpdateItemKitchenStatusPayload) => {
            try {
                checkPermission(currentRole, ORDER_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!orderId) throw new Error('Order ID is missing');
                if (!itemId) throw new Error('Item ID is missing');

                const validStatuses: KitchenItemStatus[] = ['in_queue', 'preparing', 'ready', 'served', 'cancelled'];
                if (!validStatuses.includes(status)) throw new Error('Invalid kitchen status');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_ORDERS_URL}/${organizationId}/${orderId}/items/${itemId}/status`,
                    { status }
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to update item kitchen status');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, { orderId }) => {
            queryClient.invalidateQueries({ queryKey: ['orders', 'detail', organizationId, orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'by-type', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'kitchen', organizationId] });
        },
    });
};

// ── 7. Process Order Checkout ───────────────────────────────────────────────
// Route: POST /api/orders/v1/:organizationId/:id/checkout
// Allowed: owner, admin, cto, staff
export const useProcessOrderCheckout = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, ...payload }: ProcessOrderCheckoutPayload) => {
            try {
                checkPermission(currentRole, ORDER_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!orderId) throw new Error('Order ID is missing');
                if (!payload.paymentMethod) throw new Error('Payment method is required');

                const { data } = await Api.post<BaseApiResponse<any>>(
                    `${BASE_ORDERS_URL}/${organizationId}/${orderId}/checkout`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to process checkout');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, { orderId }) => {
            queryClient.invalidateQueries({ queryKey: ['orders', 'detail', organizationId, orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'by-type', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            // queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
};



export interface CheckoutPreview {
    subTotal: number;
    offerDiscount: number;
    manualDiscount: number;
    loyaltyDiscount: number;
    totalDiscount: number;
    serviceChargePercent: number;
    serviceChargeAmount: number;
    taxPercent: number;
    taxAmount: number;
    grandTotal: number;
    maxRedeemablePoints: number;
    pointsRedeemed: number;
}

// Route: GET /api/orders/v1/:organizationId/:id/checkout-preview
export const useGetCheckoutPreview = (
    orderId: string | undefined,
    input: { offerId?: string; loyaltyPointsRedeemed?: number; manualDiscount?: number }
) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['orders', 'checkout-preview', organizationId, orderId, input.offerId ?? '', input.loyaltyPointsRedeemed ?? 0, input.manualDiscount ?? 0],
        queryFn: async (): Promise<CheckoutPreview> => {
            try {
                checkPermission(currentRole, ORDER_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!orderId) throw new Error('Order ID is missing');

                const { data } = await Api.get<BaseApiResponse<CheckoutPreview>>(
                    `${BASE_ORDERS_URL}/${organizationId}/${orderId}/checkout-preview`,
                    {
                        params: {
                            offerId: input.offerId || undefined,
                            loyaltyPointsRedeemed: input.loyaltyPointsRedeemed || undefined,
                            manualDiscount: input.manualDiscount || undefined,
                        },
                    }
                );

                if (data.ok && data.data) return data.data;
                throw new Error(data.message || 'Failed to calculate the bill');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!organizationId && !!currentRole && !!orderId,
        retry: false, // a 400 here is a validation message for the cashier, not a network problem
    });
};

// ── 8. Cancel Order ─────────────────────────────────────────────────────────
// Route: PATCH /api/orders/v1/:organizationId/:id/cancel
// Allowed: owner, admin, cto
export const useCancelOrder = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderId: string) => {
            try {
                checkPermission(currentRole, ORDER_CANCEL_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!orderId) throw new Error('Order ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_ORDERS_URL}/${organizationId}/${orderId}/cancel`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to cancel order');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, orderId) => {
            queryClient.invalidateQueries({ queryKey: ['orders', 'detail', organizationId, orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['orders', 'by-type', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    });
};




// ── Types ────────────────────────────────────────────────────────────────────
// export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'online';
export type OrderTypeFilter = OrderType | 'all';
export type OrderStatus = 'active' | 'completed' | 'cancelled' | string;
export type PaymentStatus = 'paid' | 'unpaid' | 'pending' | 'failed' | string;
export type OrderScope = 'today' | 'running' | 'all';

interface ListOrdersFilters {
    outletId?: string;
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    scope?: 'today' | 'running' | 'all';
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}


export interface PopulatedOutlet {
    _id: string;
    name: string;
    code?: string;
}

export interface PopulatedTable {
    _id: string;
    name: string;
}

export interface PopulatedCustomer {
    _id: string;
    name: string;
    phone?: string;
}

export interface OrderItemRow {
    _id?: string;
    menuItemId?: string;
    name: string;
    quantity: number;
    price: number;
    itemTotal: number;
    notes?: string;
}

export interface OrderDocument {
    _id: string;
    organizationId: string;
    outletId: PopulatedOutlet | string;
    tableId?: PopulatedTable | string | null;
    customerId?: PopulatedCustomer | string | null;
    orderType: OrderType;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod?: string;
    items: OrderItemRow[];
    subTotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
    orderNo?: string;
    billNo?: string;
    paidAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ListOrdersByTypeResponse {
    orders: OrderDocument[];
    total: number;
    page: number;
    limit: number;
}

// ── 2. Infinite Scroll Orders By Type ────────────────────────────────────────
// Route: GET /api/orders/v1/:organizationId/orders/:orderType
// Allowed: owner, admin, cto, staff
export const useInfiniteOrdersByType = (
    orderType: OrderTypeFilter = 'all',
    filters: Omit<ListOrdersFilters, 'page'> = {}
) => {
    const { currentRole, organizationId } = useAuthData();
    const limit = filters.limit || 20;

    return useInfiniteQuery({
        queryKey: ['orders', 'by-type-infinite', organizationId, orderType, filters],
        queryFn: async ({ pageParam = 1 }) => {
            try {
                checkPermission(currentRole, ORDER_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.get<BaseApiResponse<ListOrdersByTypeResponse>>(
                    `${BASE_ORDERS_URL}/${organizationId}/orders/${orderType}`,
                    {
                        params: {
                            ...filters,
                            page: pageParam,
                            limit,
                        },
                    }
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch orders');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (!lastPage) return undefined;
            const totalPages = Math.ceil(lastPage.total / lastPage.limit);
            return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
        },
        enabled: !!currentRole && !!organizationId && !!orderType,
    });
};




// KITCHEN STATUS HOOKS

export type KitchenScope = 'running' | 'today';

export interface KitchenItemFilters {
    outletId?: string;
    status?: KitchenItemStatus | KitchenItemStatus[]; // omit for the default board: in_queue, preparing, ready
    orderType?: OrderType;
    scope?: KitchenScope;
    page?: number;
    limit?: number;
}

export interface KitchenItem {
    orderId: string;
    itemId: string;
    orderNo: string;
    orderType: OrderType;
    outletId: string;
    tableId: string | null;
    table?: { _id?: string; name?: string; tableName?: string; tableNumber?: number; tableNo?: string };
    name: string;
    quantity: number;
    notes?: string;
    status: KitchenItemStatus;
    sentToKitchenAt: string;
    readyAt?: string;
    servedAt?: string;
}

export interface KitchenItemsResponse {
    items: KitchenItem[];
    counts: Record<KitchenItemStatus, number>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}



// ── 7. Kitchen board (item-level KOT view) ──────────────────────────────────
// Route: GET /api/orders/v1/:organizationId/kitchen
// Allowed: owner, admin, cto, staff
export const useGetKitchenItems = (
    filters: KitchenItemFilters = {},
) => {
    const { currentRole, organizationId } = useAuthData();
    // const { pollIntervalMs = 15000 } = options;

    // Normalise so the same filters always produce the same query key
    const statusParam = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;

    return useQuery({
        queryKey: [
            'orders',
            'kitchen',
            organizationId,
            filters.outletId ?? '',
            statusParam ?? '',
            filters.orderType ?? '',
            filters.scope ?? 'running',
            filters.page ?? 1,
            filters.limit ?? 50,
        ],
        queryFn: async (): Promise<KitchenItemsResponse> => {
            try {
                checkPermission(currentRole, ORDER_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.get<BaseApiResponse<KitchenItemsResponse>>(
                    `${BASE_ORDERS_URL}/${organizationId}/kitchen`,
                    {
                        params: {
                            outletId: filters.outletId || undefined,
                            status: statusParam || undefined,
                            orderType: filters.orderType || undefined,
                            scope: filters.scope || undefined,
                            page: filters.page || undefined,
                            limit: filters.limit || undefined,
                        },
                    }
                );

                // if (data.ok) return data.data;
                if (data.ok && data.data) return data.data;

                throw new Error(data.message || 'Failed to fetch kitchen items');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!organizationId && !!currentRole,
        retry: false
        // placeholderData: keepPreviousData, // no flicker when switching tabs or pages
        // refetchInterval: pollIntervalMs,   // kitchen screens should refresh themselves
        // refetchIntervalInBackground: false,
    });
};