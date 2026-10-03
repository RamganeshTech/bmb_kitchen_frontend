import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import type { UserRole } from '../../features/slices/authSlice';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';
// ── Types & Constants ─────────────────────────────────────────────────────────

export const BASE_SUBSCRIPTION_URL = '/api/subscription/v1';

export const SUBSCRIPTION_MANAGEMENT_ROLES:UserRole[] = ['owner', 'admin', 'cto'] as const;

export interface SubscriptionItem {
  id: string;
  organizationId: string;
  plan: string;
  price: number;
  cycle?: string;
  outletsIncluded: number;
  renewsAt: string;
  invoices?: InvoiceItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSubscriptionPayload {
  plan: string;
  price: number;
  cycle?: string;
  outletsIncluded: number;
  renewsAt: string;
}

export interface ChangePlanPayload {
  plan: string;
  price: number;
  outletsIncluded: number;
}

export interface InvoiceItem {
  id?: string;
  invoiceNo: string;
  date?: string;
  amount: number;
  status?: string;
  createdAt?: string;
}

export interface AddInvoicePayload {
  invoiceNo: string;
  date?: string;
  amount: number;
  status?: string;
}

// ── 1. Get Subscription (Singleton per Organization) ─────────────────────────
// Route: GET /api/subscription/v1/:organizationId
// Allowed: owner, admin, cto
export const useGetSubscription = () => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['subscription', organizationId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, SUBSCRIPTION_MANAGEMENT_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<SubscriptionItem>>(
          `${BASE_SUBSCRIPTION_URL}/${organizationId}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch subscription');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. Create Subscription (Initial Setup) ───────────────────────────────────
// Route: POST /api/subscription/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateSubscription = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSubscriptionPayload) => {
      try {
        checkPermission(currentRole, SUBSCRIPTION_MANAGEMENT_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<SubscriptionItem>>(
          `${BASE_SUBSCRIPTION_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to setup subscription');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', organizationId] });
    },
  });
};

// ── 3. Change Plan ────────────────────────────────────────────────────────────
// Route: PATCH /api/subscription/v1/:organizationId/plan
// Allowed: owner, admin, cto
export const useChangePlan = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ChangePlanPayload) => {
      try {
        checkPermission(currentRole, SUBSCRIPTION_MANAGEMENT_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.patch<BaseApiResponse<SubscriptionItem>>(
          `${BASE_SUBSCRIPTION_URL}/${organizationId}/plan`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to update subscription plan');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', organizationId] });
    },
  });
};

// ── 4. Add Invoice ────────────────────────────────────────────────────────────
// Route: POST /api/subscription/v1/:organizationId/invoices
// Allowed: owner, admin, cto
export const useAddInvoice = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddInvoicePayload) => {
      try {
        checkPermission(currentRole, SUBSCRIPTION_MANAGEMENT_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<SubscriptionItem>>(
          `${BASE_SUBSCRIPTION_URL}/${organizationId}/invoices`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to record invoice');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      // Invalidates both invoices list and the general subscription cache (if invoices are embedded)
      queryClient.invalidateQueries({ queryKey: ['subscription', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['subscription-invoices', organizationId] });
    },
  });
};

// ── 5. List Invoices ──────────────────────────────────────────────────────────
// Route: GET /api/subscription/v1/:organizationId/invoices
// Allowed: owner, admin, cto
export const useListInvoices = () => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['subscription-invoices', organizationId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, SUBSCRIPTION_MANAGEMENT_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<InvoiceItem[]>>(
          `${BASE_SUBSCRIPTION_URL}/${organizationId}/invoices`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch invoices');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};