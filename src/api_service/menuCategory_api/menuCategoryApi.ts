import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── User Role Types & Permission Arrays ───────────────────────────────────────
export type UserRole = 'owner' | 'admin' | 'cto' | 'staff';

export const MENU_CATEGORY_ROLES:UserRole[] = [
    'owner',
    'admin',
    'cto',
    'staff',
] as const;

// ── Request Payload Interfaces ───────────────────────────────────────────────
export interface CreateMenuCategoryPayload {
    name: string;
    description?: string;
    [key: string]: any;
}

export interface UpdateMenuCategoryPayload {
    id: string;
    name?: string;
    description?: string;
    [key: string]: any;
}

// ── Base URL Resolver ────────────────────────────────────────────────────────
// Mounted as: app.use('/api/menu-category', menuCategoryRoutes);
// Inner router routes: /v1/:organizationId...
const BASE_MENU_CATEGORY_URL = '/api/menu-category/v1';

// ── 1. Get Active Menu Categories (List) ─────────────────────────────────────
// Route: GET /api/menu-category/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetActiveMenuCategories = (queryParams?: Record<string, any>) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['menu-categories', 'active', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, MENU_CATEGORY_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const params = new URLSearchParams(queryParams || {}).toString();
                const url = `${BASE_MENU_CATEGORY_URL}/${organizationId}${params ? `?${params}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch menu categories');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 2. Get Menu Category Dropdown ────────────────────────────────────────────
// Route: GET /api/menu-category/v1/:organizationId/dropdown
// Allowed: owner, admin, cto, staff
export const useGetMenuCategoryDropdown = (queryParams?: Record<string, any>) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['menu-categories', 'dropdown', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, MENU_CATEGORY_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const params = new URLSearchParams(queryParams || {}).toString();
                const url = `${BASE_MENU_CATEGORY_URL}/${organizationId}/dropdown${params ? `?${params}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch menu category dropdown');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 3. Get Inactive Menu Categories ──────────────────────────────────────────
// Route: GET /api/menu-category/v1/:organizationId/inactive
// Allowed: owner, admin, cto, staff
export const useGetInactiveMenuCategories = (queryParams?: Record<string, any>) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['menu-categories', 'inactive', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, MENU_CATEGORY_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const params = new URLSearchParams(queryParams || {}).toString();
                const url = `${BASE_MENU_CATEGORY_URL}/${organizationId}/inactive${params ? `?${params}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch inactive menu categories');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 4. Get Menu Category By ID ───────────────────────────────────────────────
// Route: GET /api/menu-category/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useGetMenuCategoryById = (id?: string) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['menu-categories', 'detail', organizationId, id],
        queryFn: async () => {
            try {
                checkPermission(currentRole, MENU_CATEGORY_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Category ID is missing');

                const url = `${BASE_MENU_CATEGORY_URL}/${organizationId}/${id}`;
                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch menu category');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId && !!id,
    });
};

// ── 5. Create Menu Category ──────────────────────────────────────────────────
// Route: POST /api/menu-category/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useCreateMenuCategory = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateMenuCategoryPayload) => {
            try {
                checkPermission(currentRole, MENU_CATEGORY_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.post<BaseApiResponse<any>>(
                    `${BASE_MENU_CATEGORY_URL}/${organizationId}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Category creation failed');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'dropdown', organizationId] });
        },
    });
};

// ── 6. Update Menu Category ──────────────────────────────────────────────────
// Route: PUT /api/menu-category/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useUpdateMenuCategory = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...payload }: UpdateMenuCategoryPayload) => {
            try {
                checkPermission(currentRole, MENU_CATEGORY_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Category ID is missing');

                const { data } = await Api.put<BaseApiResponse<any>>(
                    `${BASE_MENU_CATEGORY_URL}/${organizationId}/${id}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Category update failed');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'detail', organizationId, variables.id] });
        },
    });
};

// ── 7. Soft Delete Menu Category ─────────────────────────────────────────────
// Route: PATCH /api/menu-category/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useSoftDeleteMenuCategory = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                checkPermission(currentRole, MENU_CATEGORY_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Category ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_MENU_CATEGORY_URL}/${organizationId}/${id}`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to deactivate menu category');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'detail', organizationId, id] });
        },
    });
};

// ── 8. Recover Menu Category ─────────────────────────────────────────────────
// Route: PATCH /api/menu-category/v1/:organizationId/:id/recover
// Allowed: owner, admin, cto, staff
export const useRecoverMenuCategory = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                checkPermission(currentRole, MENU_CATEGORY_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Category ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_MENU_CATEGORY_URL}/${organizationId}/${id}/recover`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to recover menu category');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'detail', organizationId, id] });
        },
    });
};

// ── 9. Hard Delete Menu Category ─────────────────────────────────────────────
// Route: DELETE /api/menu-category/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useHardDeleteMenuCategory = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                checkPermission(currentRole, MENU_CATEGORY_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Category ID is missing');

                const { data } = await Api.delete<BaseApiResponse<any>>(
                    `${BASE_MENU_CATEGORY_URL}/${organizationId}/${id}`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to permanently delete menu category');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-categories', 'inactive', organizationId] });
            queryClient.removeQueries({ queryKey: ['menu-categories', 'detail', organizationId, id] });
        },
    });
};