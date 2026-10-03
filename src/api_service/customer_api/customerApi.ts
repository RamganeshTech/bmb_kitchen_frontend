import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── Role Constants based on Express Router ───────────────────────────────────
export const CUSTOMER_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const CUSTOMER_CREATE_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const CUSTOMER_UPDATE_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const CUSTOMER_INACTIVE_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const CUSTOMER_ADMIN_WRITE_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;

// ── Types & Payload Interfaces ──────────────────────────────────────────────
export interface CustomerPayload {
  name: string;
  phone: string;
  email?: string;
  [key: string]: any;
}

export interface UpdateCustomerPayload {
  id: string;
  data: Partial<CustomerPayload>;
}

export interface CustomerItem extends CustomerPayload {
  _id: string;
  organizationId: string;
  createdBy: string;
  updatedBy?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDropdownItem {
  _id: string;
  name: string;
  phone: string;
}

// ── Base URL Resolver ────────────────────────────────────────────────────────
// Mounted as: app.use("/api/customer", customerRoutes);
// Inner router routes: /v1/:organizationId...
const BASE_CUSTOMER_URL = '/api/customer/v1';

// ── 1. Get Customer Dropdown ─────────────────────────────────────────────────
// Route: GET /api/customer/v1/:organizationId/dropdown
// Allowed: owner, admin, cto, staff
export const useGetCustomerDropdown = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['customers', 'dropdown', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, CUSTOMER_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_CUSTOMER_URL}/${organizationId}/dropdown${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<CustomerDropdownItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch customer dropdown');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. Get Active Customers List ─────────────────────────────────────────────
// Route: GET /api/customer/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetActiveCustomers = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['customers', 'list', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, CUSTOMER_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_CUSTOMER_URL}/${organizationId}${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<CustomerItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch customer list');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 3. Get Inactive / Soft-Deleted Customers List ────────────────────────────
// Route: GET /api/customer/v1/:organizationId/inactive
// Allowed: owner, admin, cto
export const useGetInactiveCustomers = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['customers', 'inactive', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, CUSTOMER_INACTIVE_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_CUSTOMER_URL}/${organizationId}/inactive${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<CustomerItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inactive customer list');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 4. Get Customer by ID ────────────────────────────────────────────────────
// Route: GET /api/customer/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useGetCustomerById = (id?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['customers', 'detail', organizationId, id],
    queryFn: async () => {
      try {
        checkPermission(currentRole, CUSTOMER_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Customer ID is missing');

        const { data } = await Api.get<BaseApiResponse<CustomerItem>>(
          `${BASE_CUSTOMER_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch customer details');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId && !!id,
  });
};

// ── 5. Create Customer ───────────────────────────────────────────────────────
// Route: POST /api/customer/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useCreateCustomer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CustomerPayload) => {
      try {
        checkPermission(currentRole, CUSTOMER_CREATE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<CustomerItem>>(
          `${BASE_CUSTOMER_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Customer creation failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'dropdown', organizationId] });
    },
  });
};

// ── 6. Update Customer ───────────────────────────────────────────────────────
// Route: PUT /api/customer/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useUpdateCustomer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: payload }: UpdateCustomerPayload) => {
      try {
        checkPermission(currentRole, CUSTOMER_UPDATE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Customer ID is missing');

        const { data } = await Api.put<BaseApiResponse<CustomerItem>>(
          `${BASE_CUSTOMER_URL}/${organizationId}/${id}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Customer update failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', organizationId, id] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'dropdown', organizationId] });
    },
  });
};

// ── 7. Soft Delete Customer ──────────────────────────────────────────────────
// Route: PATCH /api/customer/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useSoftDeleteCustomer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, CUSTOMER_ADMIN_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Customer ID is missing');

        const { data } = await Api.patch<BaseApiResponse<void>>(
          `${BASE_CUSTOMER_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to deactivate customer');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'dropdown', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', organizationId, id] });
    },
  });
};

// ── 8. Recover / Restore Customer ────────────────────────────────────────────
// Route: PATCH /api/customer/v1/:organizationId/:id/recover
// Allowed: owner, admin, cto
export const useRecoverCustomer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, CUSTOMER_ADMIN_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Customer ID is missing');

        const { data } = await Api.patch<BaseApiResponse<void>>(
          `${BASE_CUSTOMER_URL}/${organizationId}/${id}/recover`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to recover customer');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'dropdown', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', organizationId, id] });
    },
  });
};

// ── 9. Hard Delete Customer ──────────────────────────────────────────────────
// Route: DELETE /api/customer/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useHardDeleteCustomer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, CUSTOMER_ADMIN_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Customer ID is missing');

        const { data } = await Api.delete<BaseApiResponse<void>>(
          `${BASE_CUSTOMER_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Customer permanent deletion failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'list', organizationId] });
      queryClient.removeQueries({ queryKey: ['customers', 'detail', organizationId, id] });
    },
  });
};