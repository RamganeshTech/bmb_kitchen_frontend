import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── Types & Constants ─────────────────────────────────────────────────────────

// Exact base route from app.use('/api/printer', printerRoutes)
export const BASE_PRINTER_URL = '/api/printer/v1';

export const PRINTER_READ_ROLES:UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const PRINTER_WRITE_ROLES:UserRole[] = ['owner', 'admin', 'cto'] as const;

  export type PrinterType=  'Bill' | 'KOT';
  export type PrinterPaperSize =  '80mm' | '58mm';

export interface PrinterItem {
  _id: string;
  id?: string;
  organizationId: string;
  outletId: {_id: string , name:string};
  name: string;
  type: string;
  printerModel?: string;
  conn?: string;
  size?: string;
  copies?: number;
  categories?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePrinterPayload {
  outletId: string;
  name: string;
  type: string;
  printerModel?: string;
  conn?: string;
  size?: string;
  copies?: number;
  categories?: string[];
}

export interface UpdatePrinterPayload {
  outletId?: string;
  name?: string;
  type?: string;
  printerModel?: string;
  conn?: string;
  size?: string;
  copies?: number;
  categories?: string[];
}

// ── 1. List Active Printers ───────────────────────────────────────────────────
// Route: GET /api/printer/v1/:organizationId?outletId=...
// Allowed: owner, admin, cto, staff
export const useListActivePrinters = (outletId?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['printer', organizationId, 'active', outletId || 'all'],
    queryFn: async () => {
      try {
        checkPermission(currentRole, PRINTER_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = outletId ? { outletId } : {};
        const { data } = await Api.get<BaseApiResponse<PrinterItem[]>>(
          `${BASE_PRINTER_URL}/${organizationId}`,
          { params }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch active printers');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
    retry: false

  });
};

// ── 2. List Inactive Printers ─────────────────────────────────────────────────
// Route: GET /api/printer/v1/:organizationId/inactive?outletId=...
// Allowed: owner, admin, cto
export const useListInactivePrinters = (outletId?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['printer', organizationId, 'inactive', outletId || 'all'],
    queryFn: async () => {
      try {
        checkPermission(currentRole, PRINTER_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = outletId ? { outletId } : {};
        const { data } = await Api.get<BaseApiResponse<PrinterItem[]>>(
          `${BASE_PRINTER_URL}/${organizationId}/inactive`,
          { params }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inactive printers');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
    retry: false

  });
};

// ── 3. Get Single Printer ─────────────────────────────────────────────────────
// Route: GET /api/printer/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useGetPrinter = (id?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['printer', organizationId, 'detail', id],
    queryFn: async () => {
      try {
        checkPermission(currentRole, PRINTER_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Printer ID is missing');

        const { data } = await Api.get<BaseApiResponse<PrinterItem>>(
          `${BASE_PRINTER_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch printer details');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId && !!id,
    retry: false
  });
};

// ── 4. Create Printer ─────────────────────────────────────────────────────────
// Route: POST /api/printer/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreatePrinter = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePrinterPayload) => {
      try {
        checkPermission(currentRole, PRINTER_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<PrinterItem>>(
          `${BASE_PRINTER_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to create printer');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['printer', organizationId, 'active'],
      });
    },
  });
};

// ── 5. Update Printer ─────────────────────────────────────────────────────────
// Route: PATCH /api/printer/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useUpdatePrinter = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdatePrinterPayload }) => {
      try {
        checkPermission(currentRole, PRINTER_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Printer ID is missing');

        const { data } = await Api.patch<BaseApiResponse<PrinterItem>>(
          `${BASE_PRINTER_URL}/${organizationId}/${id}`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to update printer');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['printer', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['printer', organizationId, 'detail', variables.id],
      });
    },
    
  });
};

// ── 6. Soft Delete Printer (Deactivate) ───────────────────────────────────────
// Route: PATCH /api/printer/v1/:organizationId/:id/deactivate
// Allowed: owner, admin, cto
export const useSoftDeletePrinter = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, PRINTER_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Printer ID is missing');

        const { data } = await Api.patch<BaseApiResponse<PrinterItem>>(
          `${BASE_PRINTER_URL}/${organizationId}/${id}/deactivate`,
          {}
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to deactivate printer');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ['printer', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['printer', organizationId, 'inactive'],
      });
      queryClient.invalidateQueries({
        queryKey: ['printer', organizationId, 'detail', id],
      });
    },
  });
};

// ── 7. Restore Printer ────────────────────────────────────────────────────────
// Route: PATCH /api/printer/v1/:organizationId/:id/restore
// Allowed: owner, admin, cto
export const useRestorePrinter = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, PRINTER_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Printer ID is missing');

        const { data } = await Api.patch<BaseApiResponse<PrinterItem>>(
          `${BASE_PRINTER_URL}/${organizationId}/${id}/restore`,
          {}
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to restore printer');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ['printer', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['printer', organizationId, 'inactive'],
      });
      queryClient.invalidateQueries({
        queryKey: ['printer', organizationId, 'detail', id],
      });
    },
  });
};

// ── 8. Hard Delete Printer ────────────────────────────────────────────────────
// Route: DELETE /api/printer/v1/:organizationId/:id
// Allowed: owner, admin, cto
export const useHardDeletePrinter = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, PRINTER_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Printer ID is missing');

        const { data } = await Api.delete<BaseApiResponse<{ message: string }>>(
          `${BASE_PRINTER_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to permanently delete printer');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ['printer', organizationId, 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['printer', organizationId, 'inactive'],
      });
      queryClient.removeQueries({
        queryKey: ['printer', organizationId, 'detail', id],
      });
    },
  });
};