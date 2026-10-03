import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── Role Constants based on Express Router ───────────────────────────────────
export const OFFER_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const OFFER_INACTIVE_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const OFFER_WRITE_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const OFFER_HARD_DELETE_ROLES: UserRole[] = ['owner', 'cto'] as const;

// ── Types & Payload Interfaces ──────────────────────────────────────────────
export type DiscountType = 'percentage' | 'flat';
export type ApplicableOnType = 'all' | 'category' | 'menu_item';

export interface OfferPayload {
  title: string;
  code?: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  applicableOn?: ApplicableOnType;
  categoryIds?: string[];
  menuItemIds?: string[];
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  [key: string]: any;
}

export interface UpdateOfferPayload {
  offerId: string;
  data: Partial<OfferPayload>;
}

export interface OfferItem extends OfferPayload {
  _id: string;
  organizationId: string;
  createdBy: string;
  updatedBy?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfferDropdownItem {
  _id: string;
  title: string;
  code?: string;
}

// ── Base URL Resolver ────────────────────────────────────────────────────────
// Mounted as: app.use('/api/offer', offerRoutes);
// Inner router routes: /v1/:organizationId...
const BASE_OFFER_URL = '/api/offer/v1';

// ── 1. Get Offer Dropdown ────────────────────────────────────────────────────
// Route: GET /api/offer/v1/:organizationId/dropdown
// Allowed: owner, admin, cto, staff
export const useGetOfferDropdown = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['offers', 'dropdown', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, OFFER_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_OFFER_URL}/${organizationId}/dropdown${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<OfferDropdownItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch offer dropdown');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. Get Active Offer List ─────────────────────────────────────────────────
// Route: GET /api/offer/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetOfferList = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['offers', 'list', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, OFFER_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_OFFER_URL}/${organizationId}${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<OfferItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch offer list');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 3. Get Inactive / Soft-Deleted Offer List ────────────────────────────────
// Route: GET /api/offer/v1/:organizationId/inactive
// Allowed: owner, admin, cto
export const useGetInactiveOfferList = (queryParams?: Record<string, any>) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['offers', 'inactive', organizationId, queryParams],
    queryFn: async () => {
      try {
        checkPermission(currentRole, OFFER_INACTIVE_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = new URLSearchParams(queryParams || {}).toString();
        const url = `${BASE_OFFER_URL}/${organizationId}/inactive${params ? `?${params}` : ''}`;

        const { data } = await Api.get<BaseApiResponse<OfferItem[]>>(url);

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inactive offer list');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 4. Get Offer by ID ───────────────────────────────────────────────────────
// Route: GET /api/offer/v1/:organizationId/:offerId
// Allowed: owner, admin, cto, staff
export const useGetOfferById = (offerId?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['offers', 'detail', organizationId, offerId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, OFFER_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!offerId) throw new Error('Offer ID is missing');

        const { data } = await Api.get<BaseApiResponse<OfferItem>>(
          `${BASE_OFFER_URL}/${organizationId}/${offerId}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch offer details');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId && !!offerId,
  });
};

// ── 5. Create Offer ──────────────────────────────────────────────────────────
// Route: POST /api/offer/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateOffer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: OfferPayload) => {
      try {
        checkPermission(currentRole, OFFER_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<OfferItem>>(
          `${BASE_OFFER_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Offer creation failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'dropdown', organizationId] });
    },
  });
};

// ── 6. Update Offer ──────────────────────────────────────────────────────────
// Route: PATCH /api/offer/v1/:organizationId/:offerId
// Allowed: owner, admin, cto
export const useUpdateOffer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId, data: payload }: UpdateOfferPayload) => {
      try {
        checkPermission(currentRole, OFFER_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!offerId) throw new Error('Offer ID is missing');

        const { data } = await Api.patch<BaseApiResponse<OfferItem>>(
          `${BASE_OFFER_URL}/${organizationId}/${offerId}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Offer update failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, { offerId }) => {
      queryClient.invalidateQueries({ queryKey: ['offers', 'detail', organizationId, offerId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'dropdown', organizationId] });
    },
  });
};

// ── 7. Soft Delete / Deactivate Offer ─────────────────────────────────────────
// Route: PATCH /api/offer/v1/:organizationId/:offerId/deactivate
// Allowed: owner, admin, cto
export const useSoftDeleteOffer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      try {
        checkPermission(currentRole, OFFER_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!offerId) throw new Error('Offer ID is missing');

        const { data } = await Api.patch<BaseApiResponse<OfferItem>>(
          `${BASE_OFFER_URL}/${organizationId}/${offerId}/deactivate`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to deactivate offer');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, offerId) => {
      queryClient.invalidateQueries({ queryKey: ['offers', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'dropdown', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'detail', organizationId, offerId] });
    },
  });
};

// ── 8. Restore Offer ─────────────────────────────────────────────────────────
// Route: PATCH /api/offer/v1/:organizationId/:offerId/restore
// Allowed: owner, admin, cto
export const useRestoreOffer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      try {
        checkPermission(currentRole, OFFER_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!offerId) throw new Error('Offer ID is missing');

        const { data } = await Api.patch<BaseApiResponse<OfferItem>>(
          `${BASE_OFFER_URL}/${organizationId}/${offerId}/restore`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to restore offer');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, offerId) => {
      queryClient.invalidateQueries({ queryKey: ['offers', 'list', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'dropdown', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'detail', organizationId, offerId] });
    },
  });
};

// ── 9. Hard Delete Offer ─────────────────────────────────────────────────────
// Route: DELETE /api/offer/v1/:organizationId/:offerId
// Allowed: owner, cto (strictly restricted per router definition)
export const useHardDeleteOffer = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      try {
        checkPermission(currentRole, OFFER_HARD_DELETE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!offerId) throw new Error('Offer ID is missing');

        const { data } = await Api.delete<BaseApiResponse<void>>(
          `${BASE_OFFER_URL}/${organizationId}/${offerId}`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Offer permanent deletion failed');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, offerId) => {
      queryClient.invalidateQueries({ queryKey: ['offers', 'inactive', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'list', organizationId] });
      queryClient.removeQueries({ queryKey: ['offers', 'detail', organizationId, offerId] });
    },
  });
};