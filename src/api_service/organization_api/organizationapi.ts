import { useMutation, useQuery } from '@tanstack/react-query';
import { Api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import type { UserData } from '../auth_api/authApi';

// --- Interfaces ---


// Dedicated generic Base Response for Organization API
export interface BaseApiResponse<T = any> {
  ok: boolean;
  message?: string;
  token?: string;
  data?: T;
}

export interface OrganizationData {
  _id: string;
  name: string;
  contactEmail: string;
  phone?: string;
  ownerId: string | UserData; // Can be populated
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterOrganizationParams {
  userName: string;
  email: string;
  password: string;
  organizationName: string;
  phone?: string;
}

export interface UpdateOrganizationParams {
  id: string;
  data: {
    name?: string;
    contactEmail?: string;
    phone?: string;
  };
}

// --- 1. Register Organization Hook (Public) ---
export const useRegisterOrganization = () => {
  return useMutation({
    mutationFn: async (orgData: RegisterOrganizationParams) => {
      try {
        // This is a public route to create an org + owner user
        const { data } = await Api.post<BaseApiResponse<UserData>>(
          '/api/organization/v1/register',
          orgData
        );

        if (data.ok) {
          return data;
        }
        throw new Error(data.message || 'Failed to register organization');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    // No specific invalidation needed here unless you're rendering an admin dashboard of all orgs
  });
};

// --- 2. Get All Organizations Hook ---
export const useGetAllOrganizations = () => {
  const { currentRole } = useAuthData();

  return useQuery({
    queryKey: ['all-organizations'],
    queryFn: async () => {
      try {
        checkPermission(currentRole, ['owner', 'admin', 'cto', 'staff']);

        const { data } = await Api.get<BaseApiResponse<OrganizationData[]>>(
          '/api/organization/v1/'
        );

        if (data.ok) {
          return data.data;
        }
        throw new Error(data.message || 'Failed to fetch organizations');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole,
  });
};

// --- 3. Get Single Organization Hook ---
export const useGetSingleOrganization = (organizationId: string | undefined) => {
  const { currentRole } = useAuthData();

  return useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, ['owner', 'admin', 'cto', 'staff']);

        const { data } = await Api.get<BaseApiResponse<OrganizationData>>(
          `/api/organization/v1/${organizationId}`
        );

        if (data.ok) {
          return data.data;
        }
        throw new Error(data.message || 'Failed to fetch organization details');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!organizationId,
  });
};

// --- 4. Update Organization Hook ---
export const useUpdateOrganization = () => {
  const { currentRole } = useAuthData();

  return useMutation({
    mutationFn: async ({ id, data: updateData }: UpdateOrganizationParams) => {
      try {
        checkPermission(currentRole, ['owner', 'admin', 'cto']);

        // Note: Using PATCH as defined in your Express routes
        const { data } = await Api.patch<BaseApiResponse<OrganizationData>>(
          `/api/organization/v1/${id}`,
          updateData
        );

        if (data.ok) {
          return data;
        }
        throw new Error(data.message || 'Update failed');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both the single org cache and the list cache
      queryClient.invalidateQueries({ queryKey: ['organization', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['all-organizations'] });
    },
  });
};

// --- 5. Delete Organization Hook ---
export const useDeleteOrganization = () => {
  const { currentRole } = useAuthData();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      try {
        checkPermission(currentRole, ['owner', 'admin']);

        const { data } = await Api.delete<BaseApiResponse>(
          `/api/organization/v1/${organizationId}`
        );

        if (data.ok) {
          return data;
        }
        throw new Error(data.message || 'Failed to delete organization');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-organizations'] });
    },
  });
};