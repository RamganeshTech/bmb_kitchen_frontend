import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── Types ────────────────────────────────────────────────────────────────────
export type IntegrationCategory =
  | 'Aggregator'
  | 'Payments'
  | 'Messaging'
  | 'Accounting'
  | 'Reputation';

export type IntegrationStatus = 'connected' | 'not_connected';

export interface IntegrationItem {
  _id: string;
  organizationId: string;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  note: string;
  connectedSince: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Base URL & Role Constants ────────────────────────────────────────────────
const BASE_INTEGRATION_URL = '/api/integration/v1';

export const INTEGRATION_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;

// ── 1. List Integrations ─────────────────────────────────────────────────────
// Route: GET /api/integration/v1/:organizationId
// Allowed: owner, admin, cto
export const useListIntegrations = () => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['integrations', 'list', organizationId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, INTEGRATION_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<IntegrationItem[]>>(
          `${BASE_INTEGRATION_URL}/${organizationId}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch integrations');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. Get Integration by ID ─────────────────────────────────────────────────
// Route: GET /api/integration/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useGetIntegrationById = (id?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['integrations', 'detail', organizationId, id],
    queryFn: async () => {
      try {
        checkPermission(currentRole, INTEGRATION_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Integration ID is missing');

        const { data } = await Api.get<BaseApiResponse<IntegrationItem>>(
          `${BASE_INTEGRATION_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch integration details');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId && !!id,
  });
};

// ── 3. Seed Default Integrations ─────────────────────────────────────────────
// Route: POST /api/integration/v1/:organizationId/seed
// Allowed: owner, admin, cto
export const useSeedDefaultIntegrations = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        checkPermission(currentRole, INTEGRATION_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<IntegrationItem[]>>(
          `${BASE_INTEGRATION_URL}/${organizationId}/seed`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to seed integrations');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'list', organizationId] });
    },
  });
};

// ── 4. Connect Integration ───────────────────────────────────────────────────
// Route: PATCH /api/integration/v1/:organizationId/:id/connect
// Allowed: owner, admin, cto
export const useConnectIntegration = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, INTEGRATION_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Integration ID is missing');

        const { data } = await Api.patch<BaseApiResponse<IntegrationItem>>(
          `${BASE_INTEGRATION_URL}/${organizationId}/${id}/connect`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to connect integration');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['integrations', 'detail', organizationId, id] });
    },
  });
};

// ── 5. Disconnect Integration ────────────────────────────────────────────────
// Route: PATCH /api/integration/v1/:organizationId/:id/disconnect
// Allowed: owner, admin, cto
export const useDisconnectIntegration = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, INTEGRATION_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Integration ID is missing');

        const { data } = await Api.patch<BaseApiResponse<IntegrationItem>>(
          `${BASE_INTEGRATION_URL}/${organizationId}/${id}/disconnect`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to disconnect integration');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['integrations', 'detail', organizationId, id] });
    },
  });
};