import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import type { UserRole } from '../../features/slices/authSlice';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../organization_api/organizationapi';

// ── Role Constants based on Express Router ───────────────────────────────────
export const OUTLET_READ_ROLES:UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const OUTLET_INACTIVE_READ_ROLES:UserRole[] = ['owner', 'admin', 'cto'] as const;
export const OUTLET_WRITE_ROLES:UserRole[] = ['owner', 'admin', 'cto'] as const;
export const OUTLET_HARD_DELETE_ROLES:UserRole[] = ['owner', 'cto'] as const;

// ── Types & Payload Interfaces ──────────────────────────────────────────────
export interface OutletPayload {
    name: string;
    code?: string;
    address?: string;
    phone?: string;
    [key: string]: any;
}

export interface UpdateOutletPayload {
    outletId: string;
    data: Partial<OutletPayload>;
}

// ── Base URL Resolver ────────────────────────────────────────────────────────
// Mounted as: app.use('/api/outlet', outletRoutes);
// Inner router routes: /v1/:organizationId...
const BASE_OUTLET_URL = '/api/outlet/v1';

// ── 1. Get Outlet Dropdown ───────────────────────────────────────────────────
// Route: GET /api/outlet/v1/:organizationId/dropdown
// Allowed: owner, admin, cto, staff
export const useGetOutletDropdown = (queryParams?: Record<string, any>) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['outlets', 'dropdown', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, OUTLET_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const params = new URLSearchParams(queryParams || {}).toString();
                const url = `${BASE_OUTLET_URL}/${organizationId}/dropdown${params ? `?${params}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch outlet dropdown');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 2. Get Inactive Outlets List ─────────────────────────────────────────────
// Route: GET /api/outlet/v1/:organizationId/inactive
// Allowed: owner, admin, cto
export const useGetInactiveOutlets = (queryParams?: Record<string, any>) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['outlets', 'inactive', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, OUTLET_INACTIVE_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const params = new URLSearchParams(queryParams || {}).toString();
                const url = `${BASE_OUTLET_URL}/${organizationId}/inactive${params ? `?${params}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch inactive outlets');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 3. Get Active Outlet List ────────────────────────────────────────────────
// Route: GET /api/outlet/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetOutletList = (queryParams?: Record<string, any>) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['outlets', 'list', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, OUTLET_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const params = new URLSearchParams(queryParams || {}).toString();
                const url = `${BASE_OUTLET_URL}/${organizationId}${params ? `?${params}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch outlet list');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 4. Get Outlet By ID ──────────────────────────────────────────────────────
// Route: GET /api/outlet/v1/:organizationId/:outletId
// Allowed: owner, admin, cto, staff
export const useGetOutletById = (outletId?: string) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['outlets', 'detail', organizationId, outletId],
        queryFn: async () => {
            try {
                checkPermission(currentRole, OUTLET_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!outletId) throw new Error('Outlet ID is missing');

                const url = `${BASE_OUTLET_URL}/${organizationId}/${outletId}`;
                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch outlet details');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId && !!outletId,
    });
};

// ── 5. Create Outlet ─────────────────────────────────────────────────────────
// Route: POST /api/outlet/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateOutlet = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: OutletPayload) => {
            try {
                checkPermission(currentRole, OUTLET_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.post<BaseApiResponse<any>>(
                    `${BASE_OUTLET_URL}/${organizationId}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Outlet creation failed');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outlets', 'list', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['outlets', 'dropdown', organizationId] });
        },
    });
};

// ── 6. Update Outlet ─────────────────────────────────────────────────────────
// Route: PATCH /api/outlet/v1/:organizationId/:outletId
// Allowed: owner, admin, cto
export const useUpdateOutlet = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ outletId, data: payload }: UpdateOutletPayload) => {
            try {
                checkPermission(currentRole, OUTLET_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!outletId) throw new Error('Outlet ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_OUTLET_URL}/${organizationId}/${outletId}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Outlet update failed');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['outlets', 'list', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['outlets', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['outlets', 'detail', organizationId, variables.outletId] });
        },
    });
};

// ── 7. Soft Delete / Deactivate Outlet ───────────────────────────────────────
// Route: PATCH /api/outlet/v1/:organizationId/:outletId/deactivate
// Allowed: owner, admin, cto
export const useSoftDeleteOutlet = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (outletId: string) => {
            try {
                checkPermission(currentRole, OUTLET_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!outletId) throw new Error('Outlet ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_OUTLET_URL}/${organizationId}/${outletId}/deactivate`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Outlet deactivation failed');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, outletId) => {
            queryClient.invalidateQueries({ queryKey: ['outlets', 'list', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['outlets', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['outlets', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['outlets', 'detail', organizationId, outletId] });
        },
    });
};

// ── 8. Restore Outlet ────────────────────────────────────────────────────────
// Route: PATCH /api/outlet/v1/:organizationId/:outletId/restore
// Allowed: owner, admin, cto
export const useRestoreOutlet = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (outletId: string) => {
            try {
                checkPermission(currentRole, OUTLET_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!outletId) throw new Error('Outlet ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_OUTLET_URL}/${organizationId}/${outletId}/restore`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Outlet restoration failed');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, outletId) => {
            queryClient.invalidateQueries({ queryKey: ['outlets', 'list', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['outlets', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['outlets', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['outlets', 'detail', organizationId, outletId] });
        },
    });
};

// ── 9. Hard Delete Outlet ────────────────────────────────────────────────────
// Route: DELETE /api/outlet/v1/:organizationId/:outletId
// Allowed: owner, cto (Restricted)
export const useHardDeleteOutlet = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (outletId: string) => {
            try {
                checkPermission(currentRole, OUTLET_HARD_DELETE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!outletId) throw new Error('Outlet ID is missing');

                const { data } = await Api.delete<BaseApiResponse<any>>(
                    `${BASE_OUTLET_URL}/${organizationId}/${outletId}`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Outlet deletion failed');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, outletId) => {
            queryClient.invalidateQueries({ queryKey: ['outlets', 'list', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['outlets', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['outlets', 'inactive', organizationId] });
            queryClient.removeQueries({ queryKey: ['outlets', 'detail', organizationId, outletId] });
        },
    });
};