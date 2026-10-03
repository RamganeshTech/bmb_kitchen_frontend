import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';
import { checkPermission } from '../../utils/utils';
import { useAuthData } from '../../hooks/useAuthData';

// ── Types & Constants ─────────────────────────────────────────────────────────

// Exact base route from app.use('/api/central-kitchen', centralKitchenRoutes)
export const BASE_CENTRAL_KITCHEN_URL = '/api/central-kitchen/v1';

export const CENTRAL_KITCHEN_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const CENTRAL_KITCHEN_WRITE_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const CENTRAL_KITCHEN_MANAGEMENT_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const CENTRAL_KITCHEN_ADMIN_ROLES: UserRole[] = ['owner', 'cto'] as const;



export type TransferStatus = 'Requested' | 'Approved' | 'Dispatched' | 'Received';

export interface PopulatedOutlet {
  _id: string;
  name: string;
  code?: string;
}

export interface PopulatedInventoryItem {
  _id: string;
  material: string;
  rate?: number;
}

// The API may return a bare id or a populated document, so both are allowed.
export type OutletReference = string | PopulatedOutlet;
export type InventoryReference = string | PopulatedInventoryItem;

export interface TransferLineItem {
  _id?: string;
  inventoryId: InventoryReference;
  quantity: number;
}

export interface CentralKitchenTransfer {
  _id: string;
  id?: string;
  organizationId: string;
  transferNo: string;
  fromOutletId: OutletReference;
  toOutletId: OutletReference;
  lines: TransferLineItem[];
  value: number;
  status: TransferStatus;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Payloads only ever send plain ids, never populated objects.
export interface CreateTransferPayload {
  fromOutletId: string;
  toOutletId: string;
  lines: { inventoryId: string; quantity: number }[];
}

export interface UpdateStagePayload {
  id: string;
  status: TransferStatus;
}

// ── 1. List Active Transfers ──────────────────────────────────────────────────
// Route: GET /api/central-kitchen/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useListActiveTransfers = () => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['central-kitchen', organizationId, 'active'],
    queryFn: async () => {
      try {
        checkPermission(currentRole, CENTRAL_KITCHEN_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<CentralKitchenTransfer[]>>(
          `${BASE_CENTRAL_KITCHEN_URL}/${organizationId}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch active transfers');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. List Inactive Transfers ────────────────────────────────────────────────
// Route: GET /api/central-kitchen/v1/:organizationId/inactive
// Allowed: owner, admin, cto
export const useListInactiveTransfers = () => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['central-kitchen', organizationId, 'inactive'],
    queryFn: async () => {
      try {
        checkPermission(currentRole, CENTRAL_KITCHEN_MANAGEMENT_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<CentralKitchenTransfer[]>>(
          `${BASE_CENTRAL_KITCHEN_URL}/${organizationId}/inactive`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inactive transfers');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 3. Get Single Transfer ────────────────────────────────────────────────────
// Route: GET /api/central-kitchen/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useGetTransfer = (id?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['central-kitchen', organizationId, 'detail', id],
    queryFn: async () => {
      try {
        checkPermission(currentRole, CENTRAL_KITCHEN_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Transfer ID is missing');

        const { data } = await Api.get<BaseApiResponse<CentralKitchenTransfer>>(
          `${BASE_CENTRAL_KITCHEN_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch transfer details');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId && !!id,
  });
};

// ── 4. Create Transfer ────────────────────────────────────────────────────────
// Route: POST /api/central-kitchen/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useCreateTransfer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTransferPayload) => {
      try {
        checkPermission(currentRole, CENTRAL_KITCHEN_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<CentralKitchenTransfer>>(
          `${BASE_CENTRAL_KITCHEN_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to create transfer');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['central-kitchen', organizationId, 'active'],
      });
    },
  });
};

// ── 5. Update Transfer Stage ──────────────────────────────────────────────────
// Route: PATCH /api/central-kitchen/v1/:organizationId/:id/stage
// Allowed: owner, admin, cto, staff
export const useUpdateTransferStage = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: UpdateStagePayload) => {
      try {
        checkPermission(currentRole, CENTRAL_KITCHEN_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Transfer ID is missing');

        const { data } = await Api.patch<BaseApiResponse<CentralKitchenTransfer>>(
          `${BASE_CENTRAL_KITCHEN_URL}/${organizationId}/${id}/stage`,
          { status }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to update transfer stage');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['central-kitchen', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['central-kitchen', organizationId, 'detail', variables.id],
      });
    },
  });
};

// ── 6. Soft Delete Transfer ───────────────────────────────────────────────────
// Route: PATCH /api/central-kitchen/v1/:organizationId/:id/deactivate
// Allowed: owner, admin, cto
export const useSoftDeleteTransfer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, CENTRAL_KITCHEN_MANAGEMENT_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Transfer ID is missing');

        const { data } = await Api.patch<BaseApiResponse<CentralKitchenTransfer>>(
          `${BASE_CENTRAL_KITCHEN_URL}/${organizationId}/${id}/deactivate`,
          {}
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to deactivate transfer');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ['central-kitchen', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['central-kitchen', organizationId, 'inactive'],
      });
      queryClient.invalidateQueries({
        queryKey: ['central-kitchen', organizationId, 'detail', id],
      });
    },
  });
};

// ── 7. Restore Transfer ───────────────────────────────────────────────────────
// Route: PATCH /api/central-kitchen/v1/:organizationId/:id/restore
// Allowed: owner, admin, cto
export const useRestoreTransfer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, CENTRAL_KITCHEN_MANAGEMENT_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Transfer ID is missing');

        const { data } = await Api.patch<BaseApiResponse<CentralKitchenTransfer>>(
          `${BASE_CENTRAL_KITCHEN_URL}/${organizationId}/${id}/restore`,
          {}
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to restore transfer');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ['central-kitchen', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['central-kitchen', organizationId, 'inactive'],
      });
      queryClient.invalidateQueries({
        queryKey: ['central-kitchen', organizationId, 'detail', id],
      });
    },
  });
};

// ── 8. Hard Delete Transfer ───────────────────────────────────────────────────
// Route: DELETE /api/central-kitchen/v1/:organizationId/:id
// Allowed: owner, cto
export const useHardDeleteTransfer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, CENTRAL_KITCHEN_ADMIN_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Transfer ID is missing');

        const { data } = await Api.delete<BaseApiResponse<{ message: string }>>(
          `${BASE_CENTRAL_KITCHEN_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to permanently delete transfer');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ['central-kitchen', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['central-kitchen', organizationId, 'inactive'],
      });
      queryClient.removeQueries({
        queryKey: ['central-kitchen', organizationId, 'detail', id],
      });
    },
  });
};