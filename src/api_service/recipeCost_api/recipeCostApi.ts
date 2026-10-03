import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';
import type { UserRole } from '../../features/slices/authSlice';

// ── Role Definitions & Base URL ─────────────────────────────────────────────
const BASE_RECIPE_COST_URL = '/api/recipe-cost/v1';

export const RECIPE_COST_READ_ROLES:UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const RECIPE_COST_WRITE_ROLES:UserRole[] = ['owner', 'admin', 'cto'] as const;
export const RECIPE_COST_HARD_DELETE_ROLES:UserRole[] = ['owner', 'admin'] as const;

// ── Types ───────────────────────────────────────────────────────────────────
export interface RecipeCostIngredient {
    inventoryId: string;
    unit: string;
    rate: number;
    unitValue: number;
}

export interface CreateRecipeCostPayload {
    menuItemId: string;
    ingredients: RecipeCostIngredient[];
    sellingPrice?: number;
}

export interface UpdateRecipeCostPayload {
    recipeCostId: string;
    menuItemId?: string;
    ingredients?: RecipeCostIngredient[];
    sellingPrice?: number;
}

// ── 1. Fetch Active Recipe Costs List ───────────────────────────────────────
// Route: GET /api/recipe-costs/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetRecipeCostList = () => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['recipe-costs', 'active', organizationId],
        queryFn: async () => {
            try {
                checkPermission(currentRole, RECIPE_COST_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.get<BaseApiResponse<any>>(
                    `${BASE_RECIPE_COST_URL}/${organizationId}`
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch recipe costs');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!organizationId && !!currentRole,
    });
};

// ── 2. Fetch Inactive / Soft-Deleted Recipe Costs ────────────────────────────
// Route: GET /api/recipe-costs/v1/:organizationId/inactive
// Allowed: owner, admin, cto
export const useGetInactiveRecipeCostList = () => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['recipe-costs', 'inactive', organizationId],
        queryFn: async () => {
            try {
                checkPermission(currentRole, RECIPE_COST_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.get<BaseApiResponse<any>>(
                    `${BASE_RECIPE_COST_URL}/${organizationId}/inactive`
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch inactive recipe costs');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!organizationId && !!currentRole,
    });
};

// ── 3. Fetch Single Recipe Cost by ID ───────────────────────────────────────
// Route: GET /api/recipe-costs/v1/:organizationId/:recipeCostId
// Allowed: owner, admin, cto, staff
export const useGetRecipeCostById = (recipeCostId?: string) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['recipe-costs', 'detail', organizationId, recipeCostId],
        queryFn: async () => {
            try {
                checkPermission(currentRole, RECIPE_COST_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!recipeCostId) throw new Error('Recipe Cost ID is missing');

                const { data } = await Api.get<BaseApiResponse<any>>(
                    `${BASE_RECIPE_COST_URL}/${organizationId}/${recipeCostId}`
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch recipe cost');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!organizationId && !!recipeCostId && !!currentRole,
    });
};

// ── 4. Create Recipe Cost ───────────────────────────────────────────────────
// Route: POST /api/recipe-costs/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateRecipeCost = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateRecipeCostPayload) => {
            try {
                checkPermission(currentRole, RECIPE_COST_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!payload.menuItemId) throw new Error('Menu Item ID is required');
                if (!Array.isArray(payload.ingredients) || payload.ingredients.length === 0) {
                    throw new Error('At least one ingredient is required');
                }

                const { data } = await Api.post<BaseApiResponse<any>>(
                    `${BASE_RECIPE_COST_URL}/${organizationId}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to create recipe cost');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipe-costs', 'active', organizationId] });
        },
    });
};

// ── 5. Update Recipe Cost ───────────────────────────────────────────────────
// Route: PUT /api/recipe-costs/v1/:organizationId/:recipeCostId
// Allowed: owner, admin, cto
export const useUpdateRecipeCost = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ recipeCostId, ...payload }: UpdateRecipeCostPayload) => {
            try {
                checkPermission(currentRole, RECIPE_COST_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!recipeCostId) throw new Error('Recipe Cost ID is missing');

                const { data } = await Api.put<BaseApiResponse<any>>(
                    `${BASE_RECIPE_COST_URL}/${organizationId}/${recipeCostId}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to update recipe cost');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, { recipeCostId }) => {
            queryClient.invalidateQueries({ queryKey: ['recipe-costs', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['recipe-costs', 'detail', organizationId, recipeCostId] });
        },
    });
};

// ── 6. Soft Delete Recipe Cost ──────────────────────────────────────────────
// Route: DELETE /api/recipe-costs/v1/:organizationId/:recipeCostId
// Allowed: owner, admin, cto
export const useSoftDeleteRecipeCost = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (recipeCostId: string) => {
            try {
                checkPermission(currentRole, RECIPE_COST_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!recipeCostId) throw new Error('Recipe Cost ID is missing');

                const { data } = await Api.delete<BaseApiResponse<any>>(
                    `${BASE_RECIPE_COST_URL}/${organizationId}/${recipeCostId}`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to deactivate recipe cost');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, recipeCostId) => {
            queryClient.invalidateQueries({ queryKey: ['recipe-costs', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['recipe-costs', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['recipe-costs', 'detail', organizationId, recipeCostId] });
        },
    });
};

// ── 7. Restore Recipe Cost ──────────────────────────────────────────────────
// Route: PATCH /api/recipe-costs/v1/:organizationId/:recipeCostId/restore
// Allowed: owner, admin, cto
export const useRestoreRecipeCost = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (recipeCostId: string) => {
            try {
                checkPermission(currentRole, RECIPE_COST_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!recipeCostId) throw new Error('Recipe Cost ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_RECIPE_COST_URL}/${organizationId}/${recipeCostId}/restore`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to restore recipe cost');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, recipeCostId) => {
            queryClient.invalidateQueries({ queryKey: ['recipe-costs', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['recipe-costs', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['recipe-costs', 'detail', organizationId, recipeCostId] });
        },
    });
};

// ── 8. Hard Delete Recipe Cost ──────────────────────────────────────────────
// Route: DELETE /api/recipe-costs/v1/:organizationId/:recipeCostId/hard
// Allowed: owner, admin
export const useHardDeleteRecipeCost = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (recipeCostId: string) => {
            try {
                checkPermission(currentRole, RECIPE_COST_HARD_DELETE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!recipeCostId) throw new Error('Recipe Cost ID is missing');

                const { data } = await Api.delete<BaseApiResponse<any>>(
                    `${BASE_RECIPE_COST_URL}/${organizationId}/${recipeCostId}/hard`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to permanently delete recipe cost');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, recipeCostId) => {
            queryClient.invalidateQueries({ queryKey: ['recipe-costs', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['recipe-costs', 'active', organizationId] });
            queryClient.removeQueries({ queryKey: ['recipe-costs', 'detail', organizationId, recipeCostId] });
        },
    });
};