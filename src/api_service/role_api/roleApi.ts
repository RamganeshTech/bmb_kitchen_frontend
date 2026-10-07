import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── Base URL ────────────────────────────────────────────────────────────────
const BASE_ROLE_URL = '/api/role/v1';

// ── Role Constants based on Express Router ──────────────────────────────────
export const ROLE_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const ROLE_WRITE_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;

// ── Types ───────────────────────────────────────────────────────────────────
export interface RoleItem {
  _id: string;
  name: string;
  description?: string;
  isFullAccess?: boolean;
  permissions?: string[] | Record<string, any>;
  isActive?: boolean;
  organizationId: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleDropdownItem {
  _id: string;
  name: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  isFullAccess?: boolean;
  permissions?: string[] | Record<string, any>;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  isFullAccess?: boolean;
  permissions?: string[] | Record<string, any>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const extractErrorMessage = (error: any, fallback: string): Error => {
  const errorMessage =
    error.response?.data?.message || error.message || fallback;
  return new Error(errorMessage, { cause: error });
};

// ============================================================================
// QUERIES
// ============================================================================

// ── 1. List Active Roles ─────────────────────────────────────────────────────
// Route: GET /api/role/v1/:organizationId
// Allowed: owner, admin, cto
export const useGetActiveRoles = () => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['roles', 'list', 'active', organizationId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, ROLE_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<RoleItem[]>>(
          `${BASE_ROLE_URL}/${organizationId}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch active roles');
      } catch (error: any) {
        throw extractErrorMessage(error, 'Failed to fetch active roles');
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. List Inactive Roles ───────────────────────────────────────────────────
// Route: GET /api/role/v1/:organizationId/inactive
// Allowed: owner, admin, cto
export const useGetInactiveRoles = () => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['roles', 'list', 'inactive', organizationId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, ROLE_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<RoleItem[]>>(
          `${BASE_ROLE_URL}/${organizationId}/inactive`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inactive roles');
      } catch (error: any) {
        throw extractErrorMessage(error, 'Failed to fetch inactive roles');
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 3. List Roles Dropdown ───────────────────────────────────────────────────
// Route: GET /api/role/v1/:organizationId/dropdown
// Allowed: owner, admin, cto
export const useGetRolesDropdown = () => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['roles', 'dropdown', organizationId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, ROLE_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<RoleDropdownItem[]>>(
          `${BASE_ROLE_URL}/${organizationId}/dropdown`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch roles dropdown');
      } catch (error: any) {
        throw extractErrorMessage(error, 'Failed to fetch roles dropdown');
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 4. Get Role By ID ────────────────────────────────────────────────────────
// Route: GET /api/role/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useGetRoleById = (id?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['roles', 'detail', organizationId, id],
    queryFn: async () => {
      try {
        checkPermission(currentRole, ROLE_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Role ID is required');

        const { data } = await Api.get<BaseApiResponse<RoleItem>>(
          `${BASE_ROLE_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch role');
      } catch (error: any) {
        throw extractErrorMessage(error, 'Failed to fetch role');
      }
    },
    enabled: !!currentRole && !!organizationId && !!id,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

// ── 5. Create Role ───────────────────────────────────────────────────────────
// Route: POST /api/role/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateRole = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRolePayload) => {
      try {
        checkPermission(currentRole, ROLE_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<RoleItem>>(
          `${BASE_ROLE_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to create role');
      } catch (error: any) {
        throw extractErrorMessage(error, 'Role creation failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'list', 'active', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'dropdown', organizationId] });
    },
  });
};

// ── 6. Update Role ───────────────────────────────────────────────────────────
// Route: PATCH /api/role/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useUpdateRole = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateRolePayload }) => {
      try {
        checkPermission(currentRole, ROLE_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Role ID is required');

        const { data } = await Api.patch<BaseApiResponse<RoleItem>>(
          `${BASE_ROLE_URL}/${organizationId}/${id}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to update role');
      } catch (error: any) {
        throw extractErrorMessage(error, 'Role update failed');
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'list', 'active', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'dropdown', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'detail', organizationId, variables.id] });
    },
  });
};

// ── 7. Soft Delete (Deactivate) Role ─────────────────────────────────────────
// Route: PATCH /api/role/v1/:organizationId/:id/deactivate
// Allowed: owner, admin, cto
export const useDeactivateRole = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, ROLE_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Role ID is required');

        const { data } = await Api.patch<BaseApiResponse<RoleItem>>(
          `${BASE_ROLE_URL}/${organizationId}/${id}/deactivate`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to deactivate role');
      } catch (error: any) {
        throw extractErrorMessage(error, 'Deactivating role failed');
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'list', 'active', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'list', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'dropdown', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'detail', organizationId, id] });
    },
  });
};

// ── 8. Restore Role ──────────────────────────────────────────────────────────
// Route: PATCH /api/role/v1/:organizationId/:id/restore
// Allowed: owner, admin, cto
export const useRestoreRole = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, ROLE_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Role ID is required');

        const { data } = await Api.patch<BaseApiResponse<RoleItem>>(
          `${BASE_ROLE_URL}/${organizationId}/${id}/restore`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to restore role');
      } catch (error: any) {
        throw extractErrorMessage(error, 'Restoring role failed');
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'list', 'active', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'list', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'dropdown', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'detail', organizationId, id] });
    },
  });
};

// ── 9. Hard Delete Role ──────────────────────────────────────────────────────
// Route: DELETE /api/role/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useHardDeleteRole = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, ROLE_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Role ID is required');

        const { data } = await Api.delete<BaseApiResponse<{ ok: boolean; message: string }>>(
          `${BASE_ROLE_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to permanently delete role');
      } catch (error: any) {
        throw extractErrorMessage(error, 'Hard deleting role failed');
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'list', 'active', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'list', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'dropdown', organizationId] });
      queryClient.removeQueries({ queryKey: ['roles', 'detail', organizationId, id] });
    },
  });
};