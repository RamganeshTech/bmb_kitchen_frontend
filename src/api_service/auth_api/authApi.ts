import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Api } from '../../lib/api';
import { type UserRole } from '../../features/slices/authSlice';
import { queryClient } from '../../lib/queryClient';
import { useAuthData } from '../../hooks/useAuthData';
import { AUTH_CHECK_ROLES } from '../../constants/constants';
import { checkPermission } from '../../utils/utils';

// --- Interfaces ---
export interface LoginParams {
  email: string;
  password: string;
}

export interface UserData {
  _id: string;
  userName: string;
  email: string;
  role: UserRole;
  organizationId: string;
  isActive?: boolean;
  profileImageUrl?: string;
}

export interface BaseApiResponse<T = any> {
  ok: boolean;
  message?: string;
  token?: string;
  data?: T;
}

export interface RegisterUserParams {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organizationId: string;
}

const ALLOWED_ROLES: UserRole[] = AUTH_CHECK_ROLES;



export const fetchAuthSession = async () => {
  try {
    // Calls the GET /me route you set up in your backend
    const { data } = await Api.get('/api/auth/v1/isauthenticated');
    return data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Session expired or invalid';
    throw new Error(errorMessage, { cause: error });
  }
};

// --- 1. Login Hook ---
export const useLoginUser = () => {
  return useMutation({
    mutationFn: async ({ email, password }: LoginParams) => {
      try {
        const { data } = await Api.post<BaseApiResponse<UserData>>('/api/auth/v1/login', {
          email,
          password,
        });

        if (data.ok) {
          return data;
        }
        throw new Error(data.message || 'Login failed');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
  });
};

// --- 2. Register Hook (Matches POST /api/auth/v1/register) ---
export const useRegisterUser = () => {
  const { currentRole } = useAuthData();

  return useMutation({
    mutationFn: async (userData: RegisterUserParams) => {
      try {
        checkPermission(currentRole, ['owner', 'admin', 'cto']);

        const { data } = await Api.post<BaseApiResponse<UserData>>('/api/auth/v1/register', userData);

        if (data.ok) {
          return data;
        }
        throw new Error(data.message || 'Failed to register user');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-users'] }),
  });
};

// --- 3. Logout Hook ---
export const useLogoutUser = () => {
  return useMutation({
    mutationFn: async () => {
      try {
        const { data } = await Api.post<BaseApiResponse>('/api/auth/v1/logout');
        return data;
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'Logout failed';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.clear(); // Clear cached query data upon logout
    },
  });
};

// --- 4. Get Current Auth User Hook (Matches GET /api/auth/v1/me) ---
export const useUserIsAuthenticated = () => {
  const { currentRole } = useAuthData();

  return useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        checkPermission(currentRole, ALLOWED_ROLES);

        const { data } = await Api.get<BaseApiResponse<UserData>>('/api/auth/v1/me');
        if (data.ok) return data.data;

        throw new Error(data.message || 'Not authenticated');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'Session expired';
        throw new Error(errorMessage, { cause: error });
      }
    },
    retry: false,
    enabled: !!currentRole,
  });
};



export interface UpdateUserDataPayload {
  email?: string;
  userName?: string;
  phoneNo?: string;
}


export const useUpdateUserData = () => {

  return useMutation({
    mutationFn: async (payload: UpdateUserDataPayload) => {
      try {
        const { data } = await Api.put<BaseApiResponse<any>>(
          `/api/auth/v1/update`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to update profile');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};


// --- 5. Update Profile Image ---
export const useUpdateProfileImage = () => {
  return useMutation({
    mutationFn: async ({ userId, file, organizationId }: { userId: string; file: File , organizationId:string}) => {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await Api.put<BaseApiResponse>(
          `/api/auth/v1/${organizationId}/${userId}/profile-image`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Image upload failed');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
    },
  });
};



export interface UpdateUserRolePayload {
  userId: string;
  role: string;
}

// --- Update User Role ---
// Route: PATCH /api/auth/:userId/role
export const useUpdateUserRole = () => {
  const { currentRole } = useAuthData();

  return useMutation({
    mutationFn: async ({ userId, role }: UpdateUserRolePayload) => {
      try {
        checkPermission(currentRole, ['owner', 'admin', "cto"]);

        const { data } = await Api.put<BaseApiResponse<UserData>>(
          `/api/auth/v1/${userId}/role`,
          { role }
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to update user role');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    },
  });
};


export const USER_PERMISSION_MANAGE_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;

export interface ActionPermission {
  create: boolean;
  get: boolean;
  update: boolean;
  delete: boolean;
}

export type UserPermissionMap = Record<string, ActionPermission>;

// ── Update a user's module permissions ──────────────────────────────────────
// Route: PUT /api/auth/v1/:organizationId/:userId/permissions   (body: { permissions })
// Allowed: owner, admin, cto
export const useUpdateUserPermissions = () => {
  const { currentRole, organizationId } = useAuthData();

  return useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: UserPermissionMap }) => {
      try {
        checkPermission(currentRole, USER_PERMISSION_MANAGE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!userId) throw new Error('User ID is required');

        const { data } = await Api.put<BaseApiResponse>(
          `/api/auth/v1/${organizationId}/${userId}/permissions`,
          { permissions }
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to update permissions');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Saving permissions failed';
        throw new Error(errorMessage, { cause: error });
      }
    },
    // Patch the cached user directly so revisiting the page shows the saved values without a refetch
    onSuccess: (_, { userId}) => {
      // queryClient.setQueryData(['user', userId], (cached: any) =>
      //   cached ? { ...cached, permissions } : cached
      // );
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
  });
};



// --- 6. Get Single User ---
export const useGetSingleUser = (userId: string | undefined) => {
  const { currentRole } = useAuthData();

  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, ['owner', 'cto', 'admin', 'staff']);

        const { data } = await Api.get<BaseApiResponse<UserData>>(`/api/auth/v1/${userId}`);

        if (data.ok) {
          return data.data;
        }
        throw new Error(data.message || 'Failed to fetch user');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!userId,
    retry: false
  });
};



export interface UserFilters {
  email?: string;
  phoneNo?: string;
  userName?: string;
  role?: string;
  isActive?: boolean;
  limit?: number;
}
 
export interface UsersPage {
  users: UserData[];
  total: number;
  page: number;
  limit: number;
}
 
const USERS_PAGE_SIZE = 20;
 
// --- 7. Get All Users (Multi-tenant, server-side filters, infinite scroll) ---
// Route: GET /api/auth/?email&phoneNo&userName&role&isActive&page&limit
export const useGetAllUsers = ({
  organizationId,
  filters = {},
}: {
  organizationId: string;
  filters?: UserFilters;
}) => {
  const { currentRole } = useAuthData();
  const { limit = USERS_PAGE_SIZE, ...searchFilters } = filters;
 
  return useInfiniteQuery({
    queryKey: ['all-users', organizationId, filters],
    queryFn: async ({ pageParam }) => {
      try {
        checkPermission(currentRole, ['owner', 'cto', 'admin', 'staff']);
 
        // Drop empty filters so they never reach the backend
        const params = Object.fromEntries(
          Object.entries({ ...searchFilters, page: pageParam, limit }).filter(
            ([, value]) => value !== undefined && value !== ''
          )
        );
 
        const { data } = await Api.get<BaseApiResponse<UsersPage>>('/api/auth/', { params });
 
        if (data.ok && data.data) return data.data;
        throw new Error(data.message || 'Failed to fetch users');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined,
    enabled: !!organizationId,
  });
};

// --- 8. Delete User ---
export const useDeleteUser = () => {
  const { currentRole } = useAuthData();

  return useMutation({
    mutationFn: async (userId: string) => {
      try {
        checkPermission(currentRole, ['owner', 'admin']);

        const { data } = await Api.delete<BaseApiResponse>(`/api/auth/v1/${userId}/delete`);

        if (data.ok) {
          return data;
        }
        throw new Error(data.message || 'Failed to delete user');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-users'] }),
  });
};

// --- 9. Password Recovery Hooks ---
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      try {
        const { data } = await Api.post<BaseApiResponse>(`/api/auth/v1/forgot-password`, { email });
        return data;
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage);
      }
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ id, token, newPassword, confirmPassword }: any) => {
      try {
        const { data } = await Api.post<BaseApiResponse>(
          `/api/auth/v1/reset-password/${id}/${token}`,
          { newPassword, confirmPassword }
        );
        return data;
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage);
      }
    },
  });
};




// --- Soft Delete User (Deactivate) ---
// Route: PATCH /api/auth/:userId/deactivate
export const useSoftDeleteUser = () => {
  const { currentRole } = useAuthData();

  return useMutation({
    mutationFn: async (userId: string) => {
      try {
        checkPermission(currentRole, ['owner', 'admin']);

        const { data } = await Api.patch<BaseApiResponse>(
          `/api/auth/v1/${userId}/deactivate`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to deactivate user');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      // Refetches all user lists (both active and inactive lists update automatically)
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    },
  });
};

// --- Recover User (Reactivate) ---
// Route: PATCH /api/auth/:userId/recover
export const useRecoverUser = () => {
  const { currentRole } = useAuthData();

  return useMutation({
    mutationFn: async (userId: string) => {
      try {
        checkPermission(currentRole, ['owner', 'admin']);

        const { data } = await Api.patch<BaseApiResponse>(
          `/api/auth/v1/${userId}/recover`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to recover user');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      // Refetches all user lists
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    },
  });
};