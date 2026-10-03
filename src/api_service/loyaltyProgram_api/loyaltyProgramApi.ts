import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';
import { checkPermission } from '../../utils/utils';
import { useAuthData } from '../../hooks/useAuthData';


// ── Role Constants based on Express Router ───────────────────────────────────
export const LOYALTY_PROGRAM_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const LOYALTY_PROGRAM_WRITE_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;

// ── Types & Payload Interfaces ──────────────────────────────────────────────
export interface LoyaltyTier {
  name: string;
  minPoints: number;
  multiplier?: number;
  benefits?: string[];
  [key: string]: any;
}

export interface LoyaltyProgramPayload {
  isEnabled?: boolean;
  spendPerBlock?: number;
  pointsPerBlock?: number;
  pointValue?: number;
  minPointsToRedeem?: number;
  pointsExpireAfterDays?: number;
  tiers?: LoyaltyTier[];
  [key: string]: any;
}

export interface LoyaltyProgramItem extends LoyaltyProgramPayload {
  _id: string;
  organizationId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Base URL Resolver ────────────────────────────────────────────────────────
// Mounted as: app.use('/api/loyalty-program', loyaltyProgramRoutes);
// Inner router routes: /v1/:organizationId
const BASE_LOYALTY_PROGRAM_URL = '/api/loyalty-program/v1';

// ── 1. Get Loyalty Program (Singleton per Organization) ───────────────────────
// Route: GET /api/loyalty-program/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useGetLoyaltyProgram = () => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['loyalty-program', organizationId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, LOYALTY_PROGRAM_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<LoyaltyProgramItem>>(
          `${BASE_LOYALTY_PROGRAM_URL}/${organizationId}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch loyalty program');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. Create Loyalty Program (One-Time Setup) ────────────────────────────────
// Route: POST /api/loyalty-program/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateLoyaltyProgram = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LoyaltyProgramPayload) => {
      try {
        checkPermission(currentRole, LOYALTY_PROGRAM_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<LoyaltyProgramItem>>(
          `${BASE_LOYALTY_PROGRAM_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to setup loyalty program');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-program', organizationId] });
    },
  });
};

// ── 3. Update Loyalty Program (Rules, Tiers, Toggle Status) ───────────────────
// Route: PATCH /api/loyalty-program/v1/:organizationId
// Allowed: owner, admin, cto
export const useUpdateLoyaltyProgram = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LoyaltyProgramPayload) => {
      try {
        checkPermission(currentRole, LOYALTY_PROGRAM_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.patch<BaseApiResponse<LoyaltyProgramItem>>(
          `${BASE_LOYALTY_PROGRAM_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to update loyalty program');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-program', organizationId] });
    },
  });
};