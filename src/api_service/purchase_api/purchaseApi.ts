import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';


// ── Roles & Base URL Configuration ──────────────────────────────────────────
const BASE_PURCHASE_URL = '/api/purchase/v1';

export const PURCHASE_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const PURCHASE_WRITE_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const PURCHASE_HARD_DELETE_ROLES: UserRole[] = ['owner', 'admin'] as const;

// ── Types ───────────────────────────────────────────────────────────────────
export interface PurchaseItemInput {
    inventoryId: string;
    quantity: number;
    rate: number;
}

export interface CreatePurchasePayload {
    vendorId: string;
    items: PurchaseItemInput[];
    paymentStatus?: 'pending' | 'paid' | 'partial' | string;
}

export interface UpdatePurchasePayload {
    purchaseId: string;
    paymentStatus?: 'pending' | 'paid' | 'partial' | string;
}

// ── 1. Fetch Active Purchases List ──────────────────────────────────────────
// Route: GET /api/purchases/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetPurchaseList = () => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['purchases', 'active', organizationId],
        queryFn: async () => {
            try {
                checkPermission(currentRole, PURCHASE_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.get<BaseApiResponse<any>>(
                    `${BASE_PURCHASE_URL}/${organizationId}`
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch purchases');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!organizationId && !!currentRole,
    });
};

// ── 2. Fetch Inactive / Soft-Deleted Purchases List ──────────────────────────
// Route: GET /api/purchases/v1/:organizationId/inactive
// Allowed: owner, admin, cto
export const useGetInactivePurchaseList = () => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['purchases', 'inactive', organizationId],
        queryFn: async () => {
            try {
                checkPermission(currentRole, PURCHASE_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.get<BaseApiResponse<any>>(
                    `${BASE_PURCHASE_URL}/${organizationId}/inactive`
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch inactive purchases');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!organizationId && !!currentRole,
    });
};

// ── 3. Fetch Single Purchase by ID ──────────────────────────────────────────
// Route: GET /api/purchases/v1/:organizationId/:purchaseId
// Allowed: owner, admin, cto, staff
export const useGetPurchaseById = (purchaseId?: string) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['purchases', 'detail', organizationId, purchaseId],
        queryFn: async () => {
            try {
                checkPermission(currentRole, PURCHASE_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!purchaseId) throw new Error('Purchase ID is missing');

                const { data } = await Api.get<BaseApiResponse<any>>(
                    `${BASE_PURCHASE_URL}/${organizationId}/${purchaseId}`
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch purchase details');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!organizationId && !!purchaseId && !!currentRole,
    });
};

// ── 4. Create Purchase (Stock Bump) ─────────────────────────────────────────
// Route: POST /api/purchases/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreatePurchase = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreatePurchasePayload) => {
            try {
                checkPermission(currentRole, PURCHASE_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!payload.vendorId) throw new Error('Vendor ID is required');
                if (!Array.isArray(payload.items) || payload.items.length === 0) {
                    throw new Error('At least one item is required in the purchase');
                }

                const { data } = await Api.post<BaseApiResponse<any>>(
                    `${BASE_PURCHASE_URL}/${organizationId}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to create purchase');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases', 'active', organizationId] });
            // Since creating a purchase modifies stock counts, invalidate inventories
            queryClient.invalidateQueries({ queryKey: ['inventory', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['inventories', organizationId] });
        },
    });
};

// ── 5. Update Purchase (e.g., Payment Status) ───────────────────────────────
// Route: PUT /api/purchases/v1/:organizationId/:purchaseId
// Allowed: owner, admin, cto
export const useUpdatePurchase = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ purchaseId, ...payload }: UpdatePurchasePayload) => {
            try {
                checkPermission(currentRole, PURCHASE_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!purchaseId) throw new Error('Purchase ID is missing');

                const { data } = await Api.put<BaseApiResponse<any>>(
                    `${BASE_PURCHASE_URL}/${organizationId}/${purchaseId}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to update purchase');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, { purchaseId }) => {
            queryClient.invalidateQueries({ queryKey: ['purchases', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['purchases', 'detail', organizationId, purchaseId] });
        },
    });
};

// ── 6. Soft Delete Purchase ─────────────────────────────────────────────────
// Route: DELETE /api/purchases/v1/:organizationId/:purchaseId
// Allowed: owner, admin, cto
export const useSoftDeletePurchase = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (purchaseId: string) => {
            try {
                checkPermission(currentRole, PURCHASE_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!purchaseId) throw new Error('Purchase ID is missing');

                const { data } = await Api.delete<BaseApiResponse<any>>(
                    `${BASE_PURCHASE_URL}/${organizationId}/${purchaseId}`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to soft delete purchase');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, purchaseId) => {
            queryClient.invalidateQueries({ queryKey: ['purchases', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['purchases', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['purchases', 'detail', organizationId, purchaseId] });
        },
    });
};

// ── 7. Restore Soft-Deleted Purchase ────────────────────────────────────────
// Route: PATCH /api/purchases/v1/:organizationId/:purchaseId/restore
// Allowed: owner, admin, cto
export const useRestorePurchase = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (purchaseId: string) => {
            try {
                checkPermission(currentRole, PURCHASE_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!purchaseId) throw new Error('Purchase ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_PURCHASE_URL}/${organizationId}/${purchaseId}/restore`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to restore purchase');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, purchaseId) => {
            queryClient.invalidateQueries({ queryKey: ['purchases', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['purchases', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['purchases', 'detail', organizationId, purchaseId] });
        },
    });
};

// ── 8. Hard Delete Purchase (Permanent) ─────────────────────────────────────
// Route: DELETE /api/purchases/v1/:organizationId/:purchaseId/hard
// Allowed: owner, admin
export const useHardDeletePurchase = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (purchaseId: string) => {
            try {
                checkPermission(currentRole, PURCHASE_HARD_DELETE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!purchaseId) throw new Error('Purchase ID is missing');

                const { data } = await Api.delete<BaseApiResponse<any>>(
                    `${BASE_PURCHASE_URL}/${organizationId}/${purchaseId}/hard`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to permanently delete purchase');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, purchaseId) => {
            queryClient.invalidateQueries({ queryKey: ['purchases', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['purchases', 'inactive', organizationId] });
            queryClient.removeQueries({ queryKey: ['purchases', 'detail', organizationId, purchaseId] });
        },
    });
};