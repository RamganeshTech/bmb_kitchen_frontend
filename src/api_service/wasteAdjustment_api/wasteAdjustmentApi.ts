import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import type { BaseApiResponse } from '../auth_api/authApi';
import { Api } from '../../lib/api';
import { checkPermission } from '../../utils/utils';

// ── Role Constants based on Express Router ───────────────────────────────────
export const WASTAGE_ADJUSTMENT_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const WASTAGE_ADJUSTMENT_CREATE_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const WASTAGE_ADJUSTMENT_INACTIVE_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const WASTAGE_ADJUSTMENT_WRITE_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const WASTAGE_ADJUSTMENT_HARD_DELETE_ROLES: UserRole[] = ['owner', 'admin'] as const;

// ── Types & Payload Interfaces ──────────────────────────────────────────────
export type WastageAdjustmentType = 'wastage' | 'adjustment';

export interface CreateWastageAdjustmentPayload {
    inventoryId: string;
    type: WastageAdjustmentType;
    quantity: number;
    reason?: string;
    [key: string]: any;
}

export interface UpdateWastageAdjustmentPayload {
    type?: WastageAdjustmentType;
    reason?: string;
    quantity?: number;

    [key: string]: any;
}

export interface WastageAdjustmentItem {
    _id: string;
    organizationId: string;
    inventoryId: string;
    type: WastageAdjustmentType;
    quantity: number;
    reason?: string;
    createdBy: string;
    updatedBy?: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

// ── Base URL Resolver ────────────────────────────────────────────────────────
// Mounted as: app.use('/api/wastage-adjustments', wastageAdjustmentRoutes);
// Inner router routes: /v1/:organizationId...
const BASE_WASTAGE_ADJUSTMENT_URL = '/api/wastage-adjustments/v1';

// ── 1. Get Active Wastage & Adjustment List ───────────────────────────────────
// Route: GET /api/wastage-adjustments/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetWastageAdjustmentList = (queryParams?: Record<string, any>) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['wastage-adjustments', 'list', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, WASTAGE_ADJUSTMENT_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const params = new URLSearchParams(queryParams || {}).toString();
                const url = `${BASE_WASTAGE_ADJUSTMENT_URL}/${organizationId}${params ? `?${params}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<WastageAdjustmentItem[]>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch wastage/adjustment list');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 2. Get Inactive / Soft-Deleted Wastage & Adjustment List ──────────────────
// Route: GET /api/wastage-adjustments/v1/:organizationId/inactive
// Allowed: owner, admin, cto
export const useGetInactiveWastageAdjustmentList = (queryParams?: Record<string, any>) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['wastage-adjustments', 'inactive', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, WASTAGE_ADJUSTMENT_INACTIVE_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const params = new URLSearchParams(queryParams || {}).toString();
                const url = `${BASE_WASTAGE_ADJUSTMENT_URL}/${organizationId}/inactive${params ? `?${params}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<WastageAdjustmentItem[]>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch inactive wastage/adjustment list');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 3. Get Wastage & Adjustment by ID ─────────────────────────────────────────
// Route: GET /api/wastage-adjustments/v1/:organizationId/:wastageAdjustmentId
// Allowed: owner, admin, cto, staff
export const useGetWastageAdjustmentById = (wastageAdjustmentId?: string) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['wastage-adjustments', 'detail', organizationId, wastageAdjustmentId],
        queryFn: async () => {
            try {
                checkPermission(currentRole, WASTAGE_ADJUSTMENT_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!wastageAdjustmentId) throw new Error('Wastage/Adjustment ID is missing');

                const { data } = await Api.get<BaseApiResponse<WastageAdjustmentItem>>(
                    `${BASE_WASTAGE_ADJUSTMENT_URL}/${organizationId}/${wastageAdjustmentId}`
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch wastage/adjustment details');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId && !!wastageAdjustmentId,
    });
};

// ── 4. Create Wastage or Adjustment Entry ────────────────────────────────────
// Route: POST /api/wastage-adjustments/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useCreateWastageAdjustment = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateWastageAdjustmentPayload) => {
            try {
                checkPermission(currentRole, WASTAGE_ADJUSTMENT_CREATE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.post<BaseApiResponse<WastageAdjustmentItem>>(
                    `${BASE_WASTAGE_ADJUSTMENT_URL}/${organizationId}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to create wastage/adjustment entry');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wastage-adjustments', 'list', organizationId] });
            // Invalidates inventory list/detail if stock deduction occurred on creation
            queryClient.invalidateQueries({ queryKey: ['inventory', 'list', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['inventory', 'dropdown', organizationId] });
        },
    });
};

// ── 5. Update Wastage / Adjustment (Type / Reason) ───────────────────────────
// Route: PUT /api/wastage-adjustments/v1/:organizationId/:wastageAdjustmentId
// Allowed: owner, admin, cto
export const useUpdateWastageAdjustment = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            wastageAdjustmentId,
            data: payload,
        }: {
            wastageAdjustmentId: string;
            data: UpdateWastageAdjustmentPayload;
        }) => {
            try {
                checkPermission(currentRole, WASTAGE_ADJUSTMENT_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!wastageAdjustmentId) throw new Error('Wastage/Adjustment ID is missing');

                const { data } = await Api.put<BaseApiResponse<WastageAdjustmentItem>>(
                    `${BASE_WASTAGE_ADJUSTMENT_URL}/${organizationId}/${wastageAdjustmentId}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to update wastage/adjustment entry');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_, { wastageAdjustmentId }) => {
            queryClient.invalidateQueries({
                queryKey: ['wastage-adjustments', 'detail', organizationId, wastageAdjustmentId],
            });
            queryClient.invalidateQueries({ queryKey: ['wastage-adjustments', 'list', organizationId] });

            //  OPTIONAL TO CALL INVALITAION FO THE INVENTORY AFTER THE UPDATION IN WASTE 
            //   queryClient.invalidateQueries({ queryKey: ['inventory', 'list', organizationId] });
            //   queryClient.invalidateQueries({ queryKey: ['inventory', 'dropdown', organizationId] });
            //   queryClient.invalidateQueries({ queryKey: ['inventory', 'detail', organizationId] });
        },
    });
};

// ── 6. Soft Delete Wastage / Adjustment Entry ────────────────────────────────
// Route: DELETE /api/wastage-adjustments/v1/:organizationId/:wastageAdjustmentId
// Allowed: owner, admin, cto
export const useSoftDeleteWastageAdjustment = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (wastageAdjustmentId: string) => {
            try {
                checkPermission(currentRole, WASTAGE_ADJUSTMENT_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!wastageAdjustmentId) throw new Error('Wastage/Adjustment ID is missing');

                const { data } = await Api.delete<BaseApiResponse<WastageAdjustmentItem>>(
                    `${BASE_WASTAGE_ADJUSTMENT_URL}/${organizationId}/${wastageAdjustmentId}`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to deactivate entry');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_, wastageAdjustmentId) => {
            queryClient.invalidateQueries({ queryKey: ['wastage-adjustments', 'list', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['wastage-adjustments', 'inactive', organizationId] });
            queryClient.invalidateQueries({
                queryKey: ['wastage-adjustments', 'detail', organizationId, wastageAdjustmentId],
            });
        },
    });
};

// ── 7. Restore Wastage / Adjustment Entry ────────────────────────────────────
// Route: PATCH /api/wastage-adjustments/v1/:organizationId/:wastageAdjustmentId/restore
// Allowed: owner, admin, cto
export const useRestoreWastageAdjustment = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (wastageAdjustmentId: string) => {
            try {
                checkPermission(currentRole, WASTAGE_ADJUSTMENT_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!wastageAdjustmentId) throw new Error('Wastage/Adjustment ID is missing');

                const { data } = await Api.patch<BaseApiResponse<WastageAdjustmentItem>>(
                    `${BASE_WASTAGE_ADJUSTMENT_URL}/${organizationId}/${wastageAdjustmentId}/restore`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to restore entry');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_, wastageAdjustmentId) => {
            queryClient.invalidateQueries({ queryKey: ['wastage-adjustments', 'list', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['wastage-adjustments', 'inactive', organizationId] });
            queryClient.invalidateQueries({
                queryKey: ['wastage-adjustments', 'detail', organizationId, wastageAdjustmentId],
            });
        },
    });
};

// ── 8. Hard Delete Wastage / Adjustment Entry ────────────────────────────────
// Route: DELETE /api/wastage-adjustments/v1/:organizationId/:wastageAdjustmentId/hard
// Allowed: owner, admin
export const useHardDeleteWastageAdjustment = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (wastageAdjustmentId: string) => {
            try {
                checkPermission(currentRole, WASTAGE_ADJUSTMENT_HARD_DELETE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!wastageAdjustmentId) throw new Error('Wastage/Adjustment ID is missing');

                const { data } = await Api.delete<BaseApiResponse<void>>(
                    `${BASE_WASTAGE_ADJUSTMENT_URL}/${organizationId}/${wastageAdjustmentId}/hard`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Permanent deletion failed');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_, wastageAdjustmentId) => {
            queryClient.invalidateQueries({ queryKey: ['wastage-adjustments', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['wastage-adjustments', 'list', organizationId] });
            queryClient.removeQueries({
                queryKey: ['wastage-adjustments', 'detail', organizationId, wastageAdjustmentId],
            });
        },
    });
};