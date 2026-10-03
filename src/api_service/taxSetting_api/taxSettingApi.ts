import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';
// ── Types & Constants ─────────────────────────────────────────────────────────

export const BASE_TAX_SETTINGS_URL = '/api/tax-settings/v1';

export const TAX_SETTINGS_READ_ROLES:UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const TAX_SETTINGS_WRITE_ROLES:UserRole[] = ['owner', 'admin', 'cto'] as const;


export type TaxMode = 'exclusive' | 'inclusive'
export interface TaxRate {
  _id: string;
  name: string;
  percentage: number;
  isActive?: boolean;
}

export interface TaxSettingsItem {
  id: string;
  organizationId: string;
  mode?: TaxMode;
  serviceCharge?: number;
  scOnDinein?: boolean;
  rates?: TaxRate[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaxSettingsPayload {
  mode?: string;
  serviceCharge?: number;
  scOnDinein?: boolean;
}

export interface UpdateTaxSettingsPayload {
  mode?: string;
  serviceCharge?: number;
  scOnDinein?: boolean;
}

export interface AddTaxRatePayload {
  name: string;
  percentage: number;
}

// ── 1. Get Tax Settings (Singleton per Organization) ──────────────────────────
// Route: GET /api/tax-settings/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetTaxSettings = () => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['tax-settings', organizationId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, TAX_SETTINGS_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<TaxSettingsItem>>(
          `${BASE_TAX_SETTINGS_URL}/${organizationId}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch tax settings');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. Create Tax Settings (Initial Setup) ────────────────────────────────────
// Route: POST /api/tax-settings/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateTaxSettings = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTaxSettingsPayload) => {
      try {
        checkPermission(currentRole, TAX_SETTINGS_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<TaxSettingsItem>>(
          `${BASE_TAX_SETTINGS_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to setup tax settings');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-settings', organizationId] });
    },
  });
};

// ── 3. Update Tax Settings ────────────────────────────────────────────────────
// Route: PATCH /api/tax-settings/v1/:organizationId
// Allowed: owner, admin, cto
export const useUpdateTaxSettings = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateTaxSettingsPayload) => {
      try {
        checkPermission(currentRole, TAX_SETTINGS_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.patch<BaseApiResponse<TaxSettingsItem>>(
          `${BASE_TAX_SETTINGS_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to update tax settings');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-settings', organizationId] });
    },
  });
};

// ── 4. Add Tax Rate ───────────────────────────────────────────────────────────
// Route: POST /api/tax-settings/v1/:organizationId/rates
// Allowed: owner, admin, cto
export const useAddTaxRate = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddTaxRatePayload) => {
      try {
        checkPermission(currentRole, TAX_SETTINGS_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<TaxSettingsItem>>(
          `${BASE_TAX_SETTINGS_URL}/${organizationId}/rates`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to add tax rate');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-settings', organizationId] });
    },
  });
};

// ── 5. Set Default Tax Rate ───────────────────────────────────────────────────
// Route: PATCH /api/tax-settings/v1/:organizationId/rates/:rateId/default
// Allowed: owner, admin, cto
export const useSetDefaultTaxRate = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rateId: string) => {
      try {
        checkPermission(currentRole, TAX_SETTINGS_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!rateId) throw new Error('Rate ID is required');

        const { data } = await Api.patch<BaseApiResponse<TaxSettingsItem>>(
          `${BASE_TAX_SETTINGS_URL}/${organizationId}/rates/${rateId}/default`,
          {}
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to set default tax rate');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-settings', organizationId] });
    },
  });
};