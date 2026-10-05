import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';
import { checkPermission } from '../../utils/utils';
import { useAuthData } from '../../hooks/useAuthData';


export const BASE_EXPENSE_URL = '/api/expense/v1';

// Role permissions aligned with expenseRoutes
export const EXPENSE_READ_ROLES:UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const EXPENSE_CREATE_ROLES:UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const EXPENSE_MANAGE_ROLES:UserRole[] = ['owner', 'admin', 'cto'] as const;
export const EXPENSE_HARD_DELETE_ROLES:UserRole[] = ['owner', 'cto'] as const;


export interface Expense {
  _id: string;
  organizationId: string;
  outletId: string;
  expenseNo: string;
  date: string;
  category: string;
  description: string;
  payee: string | null;
  paymentMode: string;
  amount: number;
  isActive: boolean;
  createdBy: { _id: string; name: string; email: string };
  updatedBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePayload {
  outletId: string;
  date: string | Date;
  category: string;
  description: string;
  payee?: string | null;
  paymentMode: string;
  amount: number;
}

export interface UpdateExpensePayload extends Partial<CreateExpensePayload> {}



// ── 1. List Active Expenses ──────────────────────────────────────────────────
// Route: GET /api/expense/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useListActiveExpenses = (outletId?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['expense', organizationId, 'active', outletId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, EXPENSE_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<Expense[]>>(
          `${BASE_EXPENSE_URL}/${organizationId}`,
          { params: outletId ? { outletId } : undefined }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch active expenses');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. List Inactive Expenses ────────────────────────────────────────────────
// Route: GET /api/expense/v1/:organizationId/inactive
// Allowed: owner, admin, cto
export const useListInactiveExpenses = (outletId?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['expense', organizationId, 'inactive', outletId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, EXPENSE_MANAGE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<Expense[]>>(
          `${BASE_EXPENSE_URL}/${organizationId}/inactive`,
          { params: outletId ? { outletId } : undefined }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inactive expenses');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 3. Get Expense By ID ─────────────────────────────────────────────────────
// Route: GET /api/expense/v1/:organizationId/:expenseId
// Allowed: owner, admin, cto, staff
export const useGetExpenseById = (expenseId?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['expense', organizationId, 'detail', expenseId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, EXPENSE_READ_ROLES);
        if (!organizationId || !expenseId) {
          throw new Error('Organization ID and Expense ID are required');
        }

        const { data } = await Api.get<BaseApiResponse<Expense>>(
          `${BASE_EXPENSE_URL}/${organizationId}/${expenseId}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch expense details');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId && !!expenseId,
  });
};

// ── 4. Create Expense ────────────────────────────────────────────────────────
// Route: POST /api/expense/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  const { currentRole, organizationId } = useAuthData();

  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      try {
        checkPermission(currentRole, EXPENSE_CREATE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<Expense>>(
          `${BASE_EXPENSE_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to create expense');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['expense', organizationId, 'active'],
      });
    },
  });
};

// ── 5. Update Expense ────────────────────────────────────────────────────────
// Route: PATCH /api/expense/v1/:organizationId/:expenseId
// Allowed: owner, admin, cto
export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  const { currentRole, organizationId } = useAuthData();

  return useMutation({
    mutationFn: async ({
      expenseId,
      payload,
    }: {
      expenseId: string;
      payload: UpdateExpensePayload;
    }) => {
      try {
        checkPermission(currentRole, EXPENSE_MANAGE_ROLES);
        if (!organizationId || !expenseId) {
          throw new Error('Organization ID and Expense ID are required');
        }

        const { data } = await Api.patch<BaseApiResponse<Expense>>(
          `${BASE_EXPENSE_URL}/${organizationId}/${expenseId}`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to update expense');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['expense', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['expense', organizationId, 'detail', variables.expenseId],
      });
    },
  });
};

// ── 6. Deactivate / Soft Delete Expense ───────────────────────────────────────
// Route: PATCH /api/expense/v1/:organizationId/:expenseId/deactivate
// Allowed: owner, admin, cto
export const useSoftDeleteExpense = () => {
  const queryClient = useQueryClient();
  const { currentRole, organizationId } = useAuthData();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      try {
        checkPermission(currentRole, EXPENSE_MANAGE_ROLES);
        if (!organizationId || !expenseId) {
          throw new Error('Organization ID and Expense ID are required');
        }

        const { data } = await Api.patch<BaseApiResponse<Expense>>(
          `${BASE_EXPENSE_URL}/${organizationId}/${expenseId}/deactivate`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to deactivate expense');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['expense', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['expense', organizationId, 'inactive'],
      });
    },
  });
};

// ── 7. Restore Expense ───────────────────────────────────────────────────────
// Route: PATCH /api/expense/v1/:organizationId/:expenseId/restore
// Allowed: owner, admin, cto
export const useRestoreExpense = () => {
  const queryClient = useQueryClient();
  const { currentRole, organizationId } = useAuthData();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      try {
        checkPermission(currentRole, EXPENSE_MANAGE_ROLES);
        if (!organizationId || !expenseId) {
          throw new Error('Organization ID and Expense ID are required');
        }

        const { data } = await Api.patch<BaseApiResponse<Expense>>(
          `${BASE_EXPENSE_URL}/${organizationId}/${expenseId}/restore`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to restore expense');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['expense', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['expense', organizationId, 'inactive'],
      });
    },
  });
};

// ── 8. Hard Delete Expense ───────────────────────────────────────────────────
// Route: DELETE /api/expense/v1/:organizationId/:expenseId
// Allowed: owner, cto
export const useHardDeleteExpense = () => {
  const queryClient = useQueryClient();
  const { currentRole, organizationId } = useAuthData();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      try {
        checkPermission(currentRole, EXPENSE_HARD_DELETE_ROLES);
        if (!organizationId || !expenseId) {
          throw new Error('Organization ID and Expense ID are required');
        }

        const { data } = await Api.delete<BaseApiResponse<null>>(
          `${BASE_EXPENSE_URL}/${organizationId}/${expenseId}`
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to delete expense');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['expense', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['expense', organizationId, 'inactive'],
      });
    },
  });
};