import { useMutation, useQuery } from '@tanstack/react-query';
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

// --- 5. Update Profile Image ---
export const useUpdateProfileImage = () => {
  return useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await Api.put<BaseApiResponse>(
          `/api/auth/v1/update-profile-img/${userId}`,
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
  });
};

// --- 7. Get All Users (Multi-tenant by organizationId) ---
export const useGetAllUsers = ({
  role,
  organizationId,
}: {
  role?: string;
  organizationId: string;
}) => {
  const { currentRole } = useAuthData();

  return useQuery({
    queryKey: ['all-users', organizationId, role],
    queryFn: async () => {
      try {
        checkPermission(currentRole, ['owner', 'cto', 'admin', 'staff']);

        const { data } = await Api.get<BaseApiResponse<UserData[]>>(
          `/api/auth/v1/org/${organizationId}`,
          { params: { role } }
        );

        if (data.ok) {
          return data.data;
        }
        throw new Error(data.message || 'Failed to fetch users');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
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

        const { data } = await Api.delete<BaseApiResponse>(`/api/auth/v1/delete/${userId}`);

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