import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';
import { checkPermission } from '../../utils/utils';
import { useAuthData } from '../../hooks/useAuthData';

// ── Role Constants based on Express Router ───────────────────────────────────
export const INVENTORY_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const INVENTORY_INACTIVE_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const INVENTORY_WRITE_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const INVENTORY_ADJUST_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const INVENTORY_HARD_DELETE_ROLES: UserRole[] = ['owner', 'admin'] as const;

// ── Types & Payload Interfaces ──────────────────────────────────────────────
export interface InventoryPayload {
  material: string;
  category: string;
  unit: string;
  rate: number;
  inStock?: number;
  minLevel?: number;
  vendorId?: string;
  [key: string]: any;
}

export interface UpdateInventoryPayload {
  inventoryId: string;
  data: Partial<InventoryPayload>;
}

export interface StockAdjustmentPayload {
  inventoryId: string;
  action: 'add' | 'remove';
  quantity: number;
  reason?: string;
}

export interface InventoryItem extends InventoryPayload {
  _id: string;
  organizationId: string;
  createdBy: string;
  updatedBy?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryDropdownItem {
  _id: string;
  material: string;
  rate: number;
}

// ── Base URL Resolver ────────────────────────────────────────────────────────
// Mounted as: app.use('/api/inventory', inventoryRoutes);
// Inner router routes: /v1/:organizationId...
const BASE_INVENTORY_URL = '/api/inventory/v1';

// ── 1. Get Inventory Dropdown ────────────────────────────────────────────────
// Route: GET /api/inventory/v1/:organizationId/dropdown
// Allowed: owner, admin, cto, staff
export const useGetInventoryDropdown = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['inventory', 'dropdown', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, INVENTORY_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_INVENTORY_URL}/${organizationId}/dropdown${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<InventoryDropdownItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inventory dropdown');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. Get Active Inventory List ─────────────────────────────────────────────
// Route: GET /api/inventory/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetInventoryList = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['inventory', 'list', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, INVENTORY_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_INVENTORY_URL}/${organizationId}${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<InventoryItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inventory list');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 3. Get Inactive / Soft-Deleted Inventory List ────────────────────────────
// Route: GET /api/inventory/v1/:organizationId/inactive
// Allowed: owner, admin, cto
export const useGetInactiveInventoryList = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['inventory', 'inactive', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, INVENTORY_INACTIVE_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_INVENTORY_URL}/${organizationId}/inactive${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<InventoryItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inactive inventory list');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 4. Get Inventory Item by ID ──────────────────────────────────────────────
// Route: GET /api/inventory/v1/:organizationId/:inventoryId
// Allowed: owner, admin, cto, staff
export const useGetInventoryById = (inventoryId?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['inventory', 'detail', organizationId, inventoryId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, INVENTORY_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!inventoryId) throw new Error('Inventory ID is missing');

        const { data } = await Api.get<BaseApiResponse<InventoryItem>>(
          `${BASE_INVENTORY_URL}/${organizationId}/${inventoryId}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inventory item');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId && !!inventoryId,
  });
};

// ── 5. Create Inventory Item ─────────────────────────────────────────────────
// Route: POST /api/inventory/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateInventory = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InventoryPayload) => {
      try {
        checkPermission(currentRole, INVENTORY_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<InventoryItem>>(
          `${BASE_INVENTORY_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Inventory item creation failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dropdown', organizationId] });
    },
  });
};

// ── 6. Update Inventory Item ─────────────────────────────────────────────────
// Route: PUT /api/inventory/v1/:organizationId/:inventoryId
// Allowed: owner, admin, cto
export const useUpdateInventory = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inventoryId, data: payload }: UpdateInventoryPayload) => {
      try {
        checkPermission(currentRole, INVENTORY_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!inventoryId) throw new Error('Inventory ID is missing');

        const { data } = await Api.put<BaseApiResponse<InventoryItem>>(
          `${BASE_INVENTORY_URL}/${organizationId}/${inventoryId}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Inventory item update failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, { inventoryId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'detail', organizationId, inventoryId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dropdown', organizationId] });
    },
  });
};

// ── 7. Adjust Stock (Add / Remove) ──────────────────────────────────────────
// Route: POST /api/inventory/v1/:organizationId/:inventoryId/adjust
// Allowed: owner, admin, cto, staff
export const useAdjustInventoryStock = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inventoryId, action, quantity, reason }: StockAdjustmentPayload) => {
      try {
        checkPermission(currentRole, INVENTORY_ADJUST_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!inventoryId) throw new Error('Inventory ID is missing');

        const { data } = await Api.post<BaseApiResponse<InventoryItem>>(
          `${BASE_INVENTORY_URL}/${organizationId}/${inventoryId}/adjust`,
          { action, quantity, reason }
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to adjust inventory stock');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, { inventoryId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'detail', organizationId, inventoryId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'list', organizationId] });
    },
  });
};

// ── 8. Soft Delete Inventory Item ───────────────────────────────────────────
// Route: DELETE /api/inventory/v1/:organizationId/:inventoryId
// Allowed: owner, admin, cto
export const useSoftDeleteInventory = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inventoryId: string) => {
      try {
        checkPermission(currentRole, INVENTORY_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!inventoryId) throw new Error('Inventory ID is missing');

        const { data } = await Api.delete<BaseApiResponse<InventoryItem>>(
          `${BASE_INVENTORY_URL}/${organizationId}/${inventoryId}`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to deactivate inventory item');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, inventoryId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dropdown', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'detail', organizationId, inventoryId] });
    },
  });
};

// ── 9. Restore Inventory Item ───────────────────────────────────────────────
// Route: PATCH /api/inventory/v1/:organizationId/:inventoryId/restore
// Allowed: owner, admin, cto
export const useRestoreInventory = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inventoryId: string) => {
      try {
        checkPermission(currentRole, INVENTORY_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!inventoryId) throw new Error('Inventory ID is missing');

        const { data } = await Api.patch<BaseApiResponse<InventoryItem>>(
          `${BASE_INVENTORY_URL}/${organizationId}/${inventoryId}/restore`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to restore inventory item');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, inventoryId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dropdown', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'detail', organizationId, inventoryId] });
    },
  });
};

// ── 10. Hard Delete Inventory Item ──────────────────────────────────────────
// Route: DELETE /api/inventory/v1/:organizationId/:inventoryId/hard
// Allowed: owner, admin
export const useHardDeleteInventory = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inventoryId: string) => {
      try {
        checkPermission(currentRole, INVENTORY_HARD_DELETE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!inventoryId) throw new Error('Inventory ID is missing');

        const { data } = await Api.delete<BaseApiResponse<void>>(
          `${BASE_INVENTORY_URL}/${organizationId}/${inventoryId}/hard`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Permanent deletion failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, inventoryId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'list', organizationId] });
      queryClient.removeQueries({ queryKey: ['inventory', 'detail', organizationId, inventoryId] });
    },
  });
};