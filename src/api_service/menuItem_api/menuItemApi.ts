import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import type { BaseApiResponse } from '../auth_api/authApi';
import { Api } from '../../lib/api';
import type { UserRole } from '../../features/slices/authSlice';

// ── User Role Types & Permission Arrays ───────────────────────────────────────

export const MENU_ITEM_READ_ROLES: UserRole[] = [
    'owner',
    'admin',
    'cto',
    'staff',
] as const;

export const MENU_ITEM_WRITE_ROLES: UserRole[] = [
    'owner',
    'admin',
    'cto',
] as const;

// ── Types & Payload Interfaces ──────────────────────────────────────────────
export interface IVariant {
    name: string;
    priceDifference: number;
}

export interface IAddOn {
    name: string;
    price: number;
}

export interface CreateMenuItemPayload {
    name: string;
    categoryId: string;
    basePrice: number;
    foodType?: 'Veg' | 'Non-veg' | 'Egg';
    prepTime?: number;
    variants?: IVariant[];
    addOns?: IAddOn[];
    images?: File[];
    [key: string]: any;
}

export interface UpdateMenuItemPayload {
    id: string;
    name?: string;
    categoryId?: string;
    basePrice?: number;
    foodType?: 'Veg' | 'Non-veg' | 'Egg';
    prepTime?: number;
    variants?: IVariant[];
    addOns?: IAddOn[];
    [key: string]: any;
}

export interface MenuItemQueryParams {
    search?: string;
    categoryId?: string;
    foodType?: 'Veg' | 'Non-veg' | 'Egg';
    minPrice?: number;
    maxPrice?: number;
    maxPrepTime?: number;
    hasVariants?: boolean;
    hasAddOns?: boolean;
    sortBy?: 'name' | 'basePrice' | 'prepTime' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    [key: string]: any;
}

// ── Base URL Resolver ────────────────────────────────────────────────────────
// Mounted as: app.use('/api/menu-item', menuItemRoutes);
// Routes pattern: /v1/:organizationId...
const BASE_MENU_ITEM_URL = '/api/menu-item/v1';

const cleanParams = (params?: Record<string, any>): Record<string, string> => {
    if (!params) return {};
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            cleaned[key] = String(value);
        }
    }
    return cleaned;
};

// ── 1. Get Category Menu Item Dropdown ────────────────────────────────────────
// Route: GET /api/menu-item/v1/:organizationId/:categoryId/dropdown
// Allowed: owner, admin, cto, staff
export const useGetMenuItemDropdown = (categoryId?: string, queryParams?: Record<string, any>) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['menu-items', 'dropdown', organizationId, categoryId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, MENU_ITEM_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!categoryId) throw new Error('Category ID is missing');

                const queryString = new URLSearchParams(cleanParams(queryParams)).toString();
                const url = `${BASE_MENU_ITEM_URL}/${organizationId}/${categoryId}/dropdown${queryString ? `?${queryString}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch menu items dropdown');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId && !!categoryId,
    });
};

// ── 2. Get Inactive Menu Items ───────────────────────────────────────────────
// Route: GET /api/menu-item/v1/:organizationId/inactive
// Allowed: owner, admin, cto, staff
export const useGetInactiveMenuItems = (queryParams?: Record<string, any>) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['menu-items', 'inactive', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, MENU_ITEM_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const queryString = new URLSearchParams(cleanParams(queryParams)).toString();
                const url = `${BASE_MENU_ITEM_URL}/${organizationId}/inactive${queryString ? `?${queryString}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch inactive menu items');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 3. Get Active Menu Items (with Multi-Filters) ────────────────────────────
// Route: GET /api/menu-item/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetActiveMenuItems = (queryParams?: MenuItemQueryParams) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['menu-items', 'active', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, MENU_ITEM_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const queryString = new URLSearchParams(cleanParams(queryParams)).toString();
                const url = `${BASE_MENU_ITEM_URL}/${organizationId}${queryString ? `?${queryString}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch active menu items');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 4. Get Menu Item By ID ───────────────────────────────────────────────────
// Route: GET /api/menu-item/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useGetMenuItemById = (id?: string) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['menu-items', 'detail', organizationId, id],
        queryFn: async () => {
            try {
                checkPermission(currentRole, MENU_ITEM_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Menu item ID is missing');

                const url = `${BASE_MENU_ITEM_URL}/${organizationId}/${id}`;
                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch menu item details');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId && !!id,
    });
};

// ── 5. Create Menu Item ──────────────────────────────────────────────────────
// Route: POST /api/menu-item/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateMenuItem = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateMenuItemPayload) => {
            try {
                checkPermission(currentRole, MENU_ITEM_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');



                const formData = new FormData();

                formData.append('name', payload.name);
                formData.append('categoryId', payload.categoryId);
                formData.append('basePrice', String(payload.basePrice));

                if (payload.foodType) {
                    formData.append('foodType', payload.foodType);
                }

                if (payload.prepTime !== undefined) {
                    formData.append('prepTime', String(payload.prepTime));
                }

                if (payload.variants) {
                    formData.append('variants', JSON.stringify(payload.variants));
                }

                if (payload.addOns) {
                    formData.append('addOns', JSON.stringify(payload.addOns));
                }

                payload.images?.forEach((file) => {
                    formData.append('files', file);
                });

                console.log('Images:', payload.images);
                console.log('Image count:', payload.images?.length);

                for (const file of payload.images ?? []) {
                    console.log('File:', file.name, file.type, file.size);
                }

                console.log('FormData:');

                for (const [key, value] of formData.entries()) {
                    console.log(key, value);
                }

                const { data } = await Api.post<BaseApiResponse<any>>(
                    `${BASE_MENU_ITEM_URL}/${organizationId}`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    }
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Menu item creation failed');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'active', organizationId] });
            queryClient.invalidateQueries({
                queryKey: ['menu-items', 'dropdown', organizationId, variables.categoryId],
            });
        },
    });
};

// ── 6. Update Menu Item ──────────────────────────────────────────────────────
// Route: PUT /api/menu-item/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useUpdateMenuItem = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...payload }: UpdateMenuItemPayload) => {
            try {
                checkPermission(currentRole, MENU_ITEM_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Menu item ID is missing');

                const { data } = await Api.put<BaseApiResponse<any>>(
                    `${BASE_MENU_ITEM_URL}/${organizationId}/${id}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Menu item update failed');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'detail', organizationId, variables.id] });
            if (variables.categoryId) {
                queryClient.invalidateQueries({
                    queryKey: ['menu-items', 'dropdown', organizationId, variables.categoryId],
                });
            } else {
                // Invalidate all dropdown variants if categoryId wasn't specified in partial payload
                queryClient.invalidateQueries({ queryKey: ['menu-items', 'dropdown', organizationId] });
            }
        },
    });
};


// ── Types ───────────────────────────────────────────────────────────────────
export interface AddMenuItemImagesPayload {
    menuItemId: string;
    files: File[];
}

export interface RemoveMenuItemImagePayload {
    menuItemId: string;
    imageId: string;
}

// ── Add Menu Item Images ────────────────────────────────────────────────────
// Route: POST /api/menu-item/v1/:organizationId/:menuItemId/images
// Allowed: owner, admin, cto
export const useAddMenuItemImages = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ menuItemId, files }: AddMenuItemImagesPayload) => {
            try {
                checkPermission(currentRole, MENU_ITEM_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!menuItemId) throw new Error('Menu item ID is missing');
                if (!files || files.length === 0) throw new Error('At least one image file is required');

                const formData = new FormData();
                files.forEach((file) => {
                    formData.append('files', file);
                });

                const { data } = await Api.post<BaseApiResponse<any>>(
                    `${BASE_MENU_ITEM_URL}/${organizationId}/${menuItemId}/images`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    }
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to add menu item images');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, { menuItemId }) => {
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'detail', organizationId, menuItemId] });
        },
    });
};

// ── Remove Menu Item Image ──────────────────────────────────────────────────
// Route: DELETE /api/menu-item/v1/:organizationId/:menuItemId/images/:imageId
// Allowed: owner, admin, cto
export const useRemoveMenuItemImage = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ menuItemId, imageId }: RemoveMenuItemImagePayload) => {
            try {
                checkPermission(currentRole, MENU_ITEM_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!menuItemId) throw new Error('Menu item ID is missing');
                if (!imageId) throw new Error('Image ID is missing');

                const { data } = await Api.delete<BaseApiResponse<any>>(
                    `${BASE_MENU_ITEM_URL}/${organizationId}/${menuItemId}/images/${imageId}`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to remove menu item image');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, { menuItemId }) => {
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'detail', organizationId, menuItemId] });
        },
    });
};

// ── 7. Soft Delete Menu Item ─────────────────────────────────────────────────
// Route: PATCH /api/menu-item/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useSoftDeleteMenuItem = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                checkPermission(currentRole, MENU_ITEM_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Menu item ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_MENU_ITEM_URL}/${organizationId}/${id}`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to deactivate menu item');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'detail', organizationId, id] });
        },
    });
};

// ── 8. Recover Menu Item ─────────────────────────────────────────────────────
// Route: PATCH /api/menu-item/v1/:organizationId/:id/recover
// Allowed: owner, admin, cto
export const useRecoverMenuItem = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                checkPermission(currentRole, MENU_ITEM_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Menu item ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_MENU_ITEM_URL}/${organizationId}/${id}/recover`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to recover menu item');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'detail', organizationId, id] });
        },
    });
};

// ── 9. Hard Delete Menu Item ─────────────────────────────────────────────────
// Route: DELETE /api/menu-item/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useHardDeleteMenuItem = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                checkPermission(currentRole, MENU_ITEM_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Menu item ID is missing');

                const { data } = await Api.delete<BaseApiResponse<any>>(
                    `${BASE_MENU_ITEM_URL}/${organizationId}/${id}`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to permanently delete menu item');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['menu-items', 'inactive', organizationId] });
            queryClient.removeQueries({ queryKey: ['menu-items', 'detail', organizationId, id] });
        },
    });
};