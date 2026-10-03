import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    variantId?: string;
    quantity: number;
    notes?: string;
    modifiers?: string[];
    [key: string]: any;
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
        },
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