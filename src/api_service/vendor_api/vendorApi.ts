import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── Role Constants based on Express Router ───────────────────────────────────
export const VENDOR_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const VENDOR_INACTIVE_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const VENDOR_WRITE_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const VENDOR_HARD_DELETE_ROLES: UserRole[] = ['owner', 'admin'] as const;

// ── Types & Payload Interfaces ──────────────────────────────────────────────
export interface VendorPayload {
  vendorName: string;
  contactPerson?: string;
  phone?: string;
  gstin?: string;
  category?: string;
  address?: string;
  paymentTerms?: string;
  [key: string]: any;
}

export interface UpdateVendorPayload {
  vendorId: string;
  data: Partial<VendorPayload>;
}

export interface VendorItem extends VendorPayload {
  _id: string;
  organizationId: string;
  createdBy: string;
  updatedBy?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorDropdownItem {
  _id: string;
  vendorName: string;
}

// ── Base URL Resolver ────────────────────────────────────────────────────────
// Mounted as: app.use('/api/vendor', vendorRoutes);
// Inner router routes: /v1/:organizationId...
const BASE_VENDOR_URL = '/api/vendor/v1';

// ── 1. Get Vendor Dropdown ───────────────────────────────────────────────────
// Route: GET /api/vendor/v1/:organizationId/dropdown
// Allowed: owner, admin, cto, staff
export const useGetVendorDropdown = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['vendors', 'dropdown', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, VENDOR_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_VENDOR_URL}/${organizationId}/dropdown${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<VendorDropdownItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch vendor dropdown');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. Get Active Vendor List ────────────────────────────────────────────────
// Route: GET /api/vendor/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetVendorList = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['vendors', 'list', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, VENDOR_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_VENDOR_URL}/${organizationId}${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<VendorItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch vendor list');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 3. Get Inactive / Soft-Deleted Vendor List ───────────────────────────────
// Route: GET /api/vendor/v1/:organizationId/inactive
// Allowed: owner, admin, cto
export const useGetInactiveVendorList = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['vendors', 'inactive', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, VENDOR_INACTIVE_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_VENDOR_URL}/${organizationId}/inactive${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<VendorItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inactive vendor list');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 4. Get Vendor by ID ──────────────────────────────────────────────────────
// Route: GET /api/vendor/v1/:organizationId/:vendorId
// Allowed: owner, admin, cto, staff
export const useGetVendorById = (vendorId?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['vendors', 'detail', organizationId, vendorId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, VENDOR_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!vendorId) throw new Error('Vendor ID is missing');

        const { data } = await Api.get<BaseApiResponse<VendorItem>>(
          `${BASE_VENDOR_URL}/${organizationId}/${vendorId}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch vendor details');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId && !!vendorId,
  });
};

// ── 5. Create Vendor ─────────────────────────────────────────────────────────
// Route: POST /api/vendor/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateVendor = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: VendorPayload) => {
      try {
        checkPermission(currentRole, VENDOR_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<VendorItem>>(
          `${BASE_VENDOR_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Vendor creation failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'dropdown', organizationId] });
    },
  });
};

// ── 6. Update Vendor ─────────────────────────────────────────────────────────
// Route: PUT /api/vendor/v1/:organizationId/:vendorId
// Allowed: owner, admin, cto
export const useUpdateVendor = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vendorId, data: payload }: UpdateVendorPayload) => {
      try {
        checkPermission(currentRole, VENDOR_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!vendorId) throw new Error('Vendor ID is missing');

        const { data } = await Api.put<BaseApiResponse<VendorItem>>(
          `${BASE_VENDOR_URL}/${organizationId}/${vendorId}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Vendor update failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, { vendorId }) => {
      queryClient.invalidateQueries({ queryKey: ['vendors', 'detail', organizationId, vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'dropdown', organizationId] });
    },
  });
};

// ── 7. Soft Delete Vendor ────────────────────────────────────────────────────
// Route: DELETE /api/vendor/v1/:organizationId/:vendorId
// Allowed: owner, admin, cto
export const useSoftDeleteVendor = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorId: string) => {
      try {
        checkPermission(currentRole, VENDOR_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!vendorId) throw new Error('Vendor ID is missing');

        const { data } = await Api.delete<BaseApiResponse<VendorItem>>(
          `${BASE_VENDOR_URL}/${organizationId}/${vendorId}`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to deactivate vendor');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, vendorId) => {
      queryClient.invalidateQueries({ queryKey: ['vendors', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'dropdown', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'detail', organizationId, vendorId] });
    },
  });
};

// ── 8. Restore Vendor ────────────────────────────────────────────────────────
// Route: PATCH /api/vendor/v1/:organizationId/:vendorId/restore
// Allowed: owner, admin, cto
export const useRestoreVendor = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorId: string) => {
      try {
        checkPermission(currentRole, VENDOR_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!vendorId) throw new Error('Vendor ID is missing');

        const { data } = await Api.patch<BaseApiResponse<VendorItem>>(
          `${BASE_VENDOR_URL}/${organizationId}/${vendorId}/restore`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to restore vendor');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, vendorId) => {
      queryClient.invalidateQueries({ queryKey: ['vendors', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'dropdown', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'detail', organizationId, vendorId] });
    },
  });
};

// ── 9. Hard Delete Vendor ────────────────────────────────────────────────────
// Route: DELETE /api/vendor/v1/:organizationId/:vendorId/hard
// Allowed: owner, admin
export const useHardDeleteVendor = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorId: string) => {
      try {
        checkPermission(currentRole, VENDOR_HARD_DELETE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!vendorId) throw new Error('Vendor ID is missing');

        const { data } = await Api.delete<BaseApiResponse<void>>(
          `${BASE_VENDOR_URL}/${organizationId}/${vendorId}/hard`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Permanent deletion failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, vendorId) => {
      queryClient.invalidateQueries({ queryKey: ['vendors', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['vendors', 'list', organizationId] });
      queryClient.removeQueries({ queryKey: ['vendors', 'detail', organizationId, vendorId] });
    },
  });
};