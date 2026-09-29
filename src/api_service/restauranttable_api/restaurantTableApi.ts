import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── User Role Types & Permission Arrays ───────────────────────────────────────
export type UserRole = 'owner' | 'admin' | 'cto' | 'staff';

export const TABLE_READ_ROLES: UserRole[] = [
    'owner',
    'admin',
    'cto',
    'staff',
];

export const TABLE_WRITE_ROLES: UserRole[] = [
    'owner',
    'admin',
    'cto',
];

export const TABLE_OPERATION_ROLES: UserRole[] = [
    'owner',
    'admin',
    'cto',
    'staff',
];

// ── Types & Interfaces ───────────────────────────────────────────────────────
export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface CreateTablePayload {
    tableName: string;
    capacity: number;
    location?: string;
    outletId?: string;
    [key: string]: any;
}

export interface UpdateTableDetailsPayload {
    id: string;
    tableName?: string;
    capacity?: number;
    location?: string;
    outletId?: string;
    [key: string]: any;
}

export interface UpdateTableStatusPayload {
    id: string;
    status: TableStatus;
}

export interface ReserveTablePayload {
    id: string;
    customerName: string;
    reservationTime: string | Date;
    phone?: string;
    notes?: string;
}

export interface TableQueryParams {
    outletId?: string;
    [key: string]: any;
}

// ── Base URL Resolver ────────────────────────────────────────────────────────
// Mounted as: app.use('/api/table', restaurantTableRoutes);
// Inner router routes: /v1/:organizationId...
const BASE_TABLE_URL = '/api/table/v1';

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

// ── 1. Get Table Dropdown ────────────────────────────────────────────────────
// Route: GET /api/table/v1/:organizationId/dropdown
// Allowed: owner, admin, cto, staff
export const useGetTableDropdown = (queryParams?: TableQueryParams) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['tables', 'dropdown', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, TABLE_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const queryString = new URLSearchParams(cleanParams(queryParams)).toString();
                const url = `${BASE_TABLE_URL}/${organizationId}/dropdown${queryString ? `?${queryString}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch table dropdown');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 2. Get Inactive Tables ───────────────────────────────────────────────────
// Route: GET /api/table/v1/:organizationId/inactive
// Allowed: owner, admin, cto, staff
export const useGetInactiveTables = (queryParams?: TableQueryParams) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['tables', 'inactive', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, TABLE_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const queryString = new URLSearchParams(cleanParams(queryParams)).toString();
                const url = `${BASE_TABLE_URL}/${organizationId}/inactive${queryString ? `?${queryString}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch inactive tables');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 3. Get Active Tables (List) ──────────────────────────────────────────────
// Route: GET /api/table/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetActiveTables = (queryParams?: TableQueryParams) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['tables', 'active', organizationId, queryParams],
        queryFn: async () => {
            try {
                checkPermission(currentRole, TABLE_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const queryString = new URLSearchParams(cleanParams(queryParams)).toString();
                const url = `${BASE_TABLE_URL}/${organizationId}${queryString ? `?${queryString}` : ''}`;

                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch active tables');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 4. Get Table By ID ───────────────────────────────────────────────────────
// Route: GET /api/table/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useGetTableById = (id?: string) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['tables', 'detail', organizationId, id],
        queryFn: async () => {
            try {
                checkPermission(currentRole, TABLE_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Table ID is missing');

                const url = `${BASE_TABLE_URL}/${organizationId}/${id}`;
                const { data } = await Api.get<BaseApiResponse<any>>(url);

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch table details');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId && !!id,
    });
};

// ── 5. Create Table ──────────────────────────────────────────────────────────
// Route: POST /api/table/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateTable = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateTablePayload) => {
            try {
                checkPermission(currentRole, TABLE_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.post<BaseApiResponse<any>>(
                    `${BASE_TABLE_URL}/${organizationId}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Table creation failed');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'dropdown', organizationId] });
        },
    });
};

// ── 6. Update Table Details (PUT) ────────────────────────────────────────────
// Route: PUT /api/table/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useUpdateTableDetails = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...payload }: UpdateTableDetailsPayload) => {
            try {
                checkPermission(currentRole, TABLE_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Table ID is missing');

                const { data } = await Api.put<BaseApiResponse<any>>(
                    `${BASE_TABLE_URL}/${organizationId}/${id}`,
                    payload
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to update table details');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tables', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'detail', organizationId, variables.id] });
        },
    });
};

// ── 7. Update Table Status ───────────────────────────────────────────────────
// Route: PATCH /api/table/v1/:organizationId/:id/status
// Allowed: owner, admin, cto, staff
export const useUpdateTableStatus = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: UpdateTableStatusPayload) => {
            try {
                checkPermission(currentRole, TABLE_OPERATION_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Table ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_TABLE_URL}/${organizationId}/${id}/status`,
                    { status }
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to update table status');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tables', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'detail', organizationId, variables.id] });
        },
    });
};

// ── 8. Reserve Table ─────────────────────────────────────────────────────────
// Route: PATCH /api/table/v1/:organizationId/:id/reserve
// Allowed: owner, admin, cto, staff
export const useReserveTable = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...reservationData }: ReserveTablePayload) => {
            try {
                checkPermission(currentRole, TABLE_OPERATION_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Table ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_TABLE_URL}/${organizationId}/${id}/reserve`,
                    reservationData
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to reserve table');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tables', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'detail', organizationId, variables.id] });
        },
    });
};


// ── 9. Update Reservation ────────────────────────────────────────────────────
// Route: PUT /api/table/v1/:organizationId/:id/reservation
// Allowed: owner, admin, cto, staff
export const useUpdateReservation = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...reservationData }: ReserveTablePayload) => {
            try {
                checkPermission(currentRole, TABLE_OPERATION_ROLES);

                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Table ID is missing');

                const { data } = await Api.put<BaseApiResponse<any>>(
                    `${BASE_TABLE_URL}/${organizationId}/${id}/reservation`,
                    reservationData
                );

                if (data.ok) return data;

                throw new Error(data.message || 'Failed to update reservation');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message ||
                    error.message ||
                    'An unexpected error occurred';

                throw new Error(errorMessage, { cause: error });
            }
        },

        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['tables', 'active', organizationId],
            });

            queryClient.invalidateQueries({
                queryKey: ['tables', 'dropdown', organizationId],
            });

            queryClient.invalidateQueries({
                queryKey: ['tables', 'detail', organizationId, variables.id],
            });
        },
    });
};

// ── 9. Soft Delete Table ─────────────────────────────────────────────────────
// Route: PATCH /api/table/v1/:organizationId/:id (or deactivate)
// Allowed: owner, admin, cto
export const useSoftDeleteTable = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                checkPermission(currentRole, TABLE_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Table ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_TABLE_URL}/${organizationId}/${id}`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to deactivate table');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['tables', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'detail', organizationId, id] });
        },
    });
};

// ── 10. Recover Table ────────────────────────────────────────────────────────
// Route: PATCH /api/table/v1/:organizationId/:id/recover
// Allowed: owner, admin, cto
export const useRecoverTable = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                checkPermission(currentRole, TABLE_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Table ID is missing');

                const { data } = await Api.patch<BaseApiResponse<any>>(
                    `${BASE_TABLE_URL}/${organizationId}/${id}/recover`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to recover table');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['tables', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'inactive', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'detail', organizationId, id] });
        },
    });
};

// ── 11. Hard Delete Table ────────────────────────────────────────────────────
// Route: DELETE /api/table/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useHardDeleteTable = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                checkPermission(currentRole, TABLE_WRITE_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Table ID is missing');

                const { data } = await Api.delete<BaseApiResponse<any>>(
                    `${BASE_TABLE_URL}/${organizationId}/${id}`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to permanently delete table');
            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['tables', 'active', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'dropdown', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['tables', 'inactive', organizationId] });
            queryClient.removeQueries({ queryKey: ['tables', 'detail', organizationId, id] });
        },
    });
};