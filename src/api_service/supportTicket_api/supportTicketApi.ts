// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { useAuthData } from '../../hooks/useAuthData';
// import { checkPermission } from '../../utils/utils';
// import type { UserRole } from '../../features/slices/authSlice';
// import { Api } from '../../lib/api';
// import type { BaseApiResponse } from '../auth_api/authApi';
// // ── Types & Constants ─────────────────────────────────────────────────────────

// // ── Types & Constants ─────────────────────────────────────────────────────────

// // Exact base route from app.use('/api/support-ticket', supportTicketRoutes)
// export const BASE_SUPPORT_TICKET_URL = '/api/support-ticket/v1';

// export const SUPPORT_TICKET_READ_ROLES:UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
// export const SUPPORT_TICKET_CREATE_ROLES:UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
// export const SUPPORT_TICKET_MANAGEMENT_ROLES:UserRole[] = ['owner', 'admin', 'cto'] as const;

// export interface SupportTicketItem {
//   _id: string;
//   id?: string;
//   organizationId: string;
//   outletId: string;
//   subject: string;
//   category?: string;
//   priority?: 'low' | 'medium' | 'high' | 'urgent' | string;
//   details?: string;
//   status: 'open' | 'in_progress' | 'closed' | string;
//   isActive?: boolean;
//   createdBy?: string;
//   createdAt?: string;
//   updatedAt?: string;
// }

// export interface CreateSupportTicketPayload {
//   outletId: string;
//   subject: string;
//   category?: string;
//   priority?: string;
//   details?: string;
// }

// export interface ListActiveTicketsParams {
//   outletId?: string;
//   status?: string;
//   category?: string;
//   priority?: string;
// }

// // ── 1. List Active Support Tickets ────────────────────────────────────────────
// // Route: GET /api/support-ticket/v1/:organizationId?outletId=&status=&category=&priority=
// // Allowed: owner, admin, cto, staff
// export const useListActiveSupportTickets = (filters?: ListActiveTicketsParams) => {
//   const { currentRole, organizationId } = useAuthData();

//   return useQuery({
//     queryKey: ['support-ticket', organizationId, 'active', filters || {}],
//     queryFn: async () => {
//       try {
//         checkPermission(currentRole, SUPPORT_TICKET_READ_ROLES);
//         if (!organizationId) throw new Error('Organization ID is missing');

//         const { data } = await Api.get<BaseApiResponse<SupportTicketItem[]>>(
//           `${BASE_SUPPORT_TICKET_URL}/${organizationId}`,
//           { params: filters }
//         );

//         if (data.ok) return data.data;
//         throw new Error(data.message || 'Failed to fetch active support tickets');
//       } catch (error: any) {
//         const errorMessage =
//           error.response?.data?.message || error.message || 'An unexpected error occurred';
//         throw new Error(errorMessage, { cause: error });
//       }
//     },
//     enabled: !!currentRole && !!organizationId,
//   });
// };

// // ── 2. List Inactive Support Tickets ──────────────────────────────────────────
// // Route: GET /api/support-ticket/v1/:organizationId/inactive
// // Allowed: owner, admin, cto
// export const useListInactiveSupportTickets = () => {
//   const { currentRole, organizationId } = useAuthData();

//   return useQuery({
//     queryKey: ['support-ticket', organizationId, 'inactive'],
//     queryFn: async () => {
//       try {
//         checkPermission(currentRole, SUPPORT_TICKET_MANAGEMENT_ROLES);
//         if (!organizationId) throw new Error('Organization ID is missing');

//         const { data } = await Api.get<BaseApiResponse<SupportTicketItem[]>>(
//           `${BASE_SUPPORT_TICKET_URL}/${organizationId}/inactive`
//         );

//         if (data.ok) return data.data;
//         throw new Error(data.message || 'Failed to fetch inactive support tickets');
//       } catch (error: any) {
//         const errorMessage =
//           error.response?.data?.message || error.message || 'An unexpected error occurred';
//         throw new Error(errorMessage, { cause: error });
//       }
//     },
//     enabled: !!currentRole && !!organizationId,
//   });
// };

// // ── 3. Get Single Support Ticket ──────────────────────────────────────────────
// // Route: GET /api/support-ticket/v1/:organizationId/:id
// // Allowed: owner, admin, cto, staff
// export const useGetSupportTicket = (id?: string) => {
//   const { currentRole, organizationId } = useAuthData();

//   return useQuery({
//     queryKey: ['support-ticket', organizationId, 'detail', id],
//     queryFn: async () => {
//       try {
//         checkPermission(currentRole, SUPPORT_TICKET_READ_ROLES);
//         if (!organizationId) throw new Error('Organization ID is missing');
//         if (!id) throw new Error('Ticket ID is missing');

//         const { data } = await Api.get<BaseApiResponse<SupportTicketItem>>(
//           `${BASE_SUPPORT_TICKET_URL}/${organizationId}/${id}`
//         );

//         if (data.ok) return data.data;
//         throw new Error(data.message || 'Failed to fetch support ticket details');
//       } catch (error: any) {
//         const errorMessage =
//           error.response?.data?.message || error.message || 'An unexpected error occurred';
//         throw new Error(errorMessage, { cause: error });
//       }
//     },
//     enabled: !!currentRole && !!organizationId && !!id,
//   });
// };

// // ── 4. Create Support Ticket ──────────────────────────────────────────────────
// // Route: POST /api/support-ticket/v1/:organizationId
// // Allowed: owner, admin, cto, staff
// export const useCreateSupportTicket = () => {
//   const { currentRole, organizationId } = useAuthData();
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async (payload: CreateSupportTicketPayload) => {
//       try {
//         checkPermission(currentRole, SUPPORT_TICKET_CREATE_ROLES);
//         if (!organizationId) throw new Error('Organization ID is missing');

//         const { data } = await Api.post<BaseApiResponse<SupportTicketItem>>(
//           `${BASE_SUPPORT_TICKET_URL}/${organizationId}`,
//           payload
//         );

//         if (data.ok) return data.data;
//         throw new Error(data.message || 'Failed to create support ticket');
//       } catch (error: any) {
//         const errorMessage =
//           error.response?.data?.message || error.message || 'An unexpected error occurred';
//         throw new Error(errorMessage, { cause: error });
//       }
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ['support-ticket', organizationId, 'active'],
//       });
//     },
//   });
// };

// // ── 5. Advance Support Ticket Status ──────────────────────────────────────────
// // Route: PATCH /api/support-ticket/v1/:organizationId/:id/advance
// // Allowed: owner, admin, cto
// export const useAdvanceSupportTicketStatus = () => {
//   const { currentRole, organizationId } = useAuthData();
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async (id: string) => {
//       try {
//         checkPermission(currentRole, SUPPORT_TICKET_MANAGEMENT_ROLES);
//         if (!organizationId) throw new Error('Organization ID is missing');
//         if (!id) throw new Error('Ticket ID is missing');

//         const { data } = await Api.patch<BaseApiResponse<SupportTicketItem>>(
//           `${BASE_SUPPORT_TICKET_URL}/${organizationId}/${id}/advance`,
//           {}
//         );

//         if (data.ok) return data.data;
//         throw new Error(data.message || 'Failed to advance support ticket status');
//       } catch (error: any) {
//         const errorMessage =
//           error.response?.data?.message || error.message || 'An unexpected error occurred';
//         throw new Error(errorMessage, { cause: error });
//       }
//     },
//     onSuccess: (_, id) => {
//       queryClient.invalidateQueries({
//         queryKey: ['support-ticket', organizationId, 'active'],
//       });
//       queryClient.invalidateQueries({
//         queryKey: ['support-ticket', organizationId, 'detail', id],
//       });
//     },
//   });
// };

// // ── 6. Soft Delete Support Ticket ─────────────────────────────────────────────
// // Route: PATCH /api/support-ticket/v1/:organizationId/:id/deactivate
// // Allowed: owner, admin, cto
// export const useSoftDeleteSupportTicket = () => {
//   const { currentRole, organizationId } = useAuthData();
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async (id: string) => {
//       try {
//         checkPermission(currentRole, SUPPORT_TICKET_MANAGEMENT_ROLES);
//         if (!organizationId) throw new Error('Organization ID is missing');
//         if (!id) throw new Error('Ticket ID is missing');

//         const { data } = await Api.patch<BaseApiResponse<SupportTicketItem>>(
//           `${BASE_SUPPORT_TICKET_URL}/${organizationId}/${id}/deactivate`,
//           {}
//         );

//         if (data.ok) return data.data;
//         throw new Error(data.message || 'Failed to deactivate support ticket');
//       } catch (error: any) {
//         const errorMessage =
//           error.response?.data?.message || error.message || 'An unexpected error occurred';
//         throw new Error(errorMessage, { cause: error });
//       }
//     },
//     onSuccess: (_, id) => {
//       queryClient.invalidateQueries({
//         queryKey: ['support-ticket', organizationId, 'active'],
//       });
//       queryClient.invalidateQueries({
//         queryKey: ['support-ticket', organizationId, 'inactive'],
//       });
//       queryClient.invalidateQueries({
//         queryKey: ['support-ticket', organizationId, 'detail', id],
//       });
//     },
//   });
// };

// // ── 7. Restore Support Ticket ─────────────────────────────────────────────────
// // Route: PATCH /api/support-ticket/v1/:organizationId/:id/restore
// // Allowed: owner, admin, cto
// export const useRestoreSupportTicket = () => {
//   const { currentRole, organizationId } = useAuthData();
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async (id: string) => {
//       try {
//         checkPermission(currentRole, SUPPORT_TICKET_MANAGEMENT_ROLES);
//         if (!organizationId) throw new Error('Organization ID is missing');
//         if (!id) throw new Error('Ticket ID is missing');

//         const { data } = await Api.patch<BaseApiResponse<SupportTicketItem>>(
//           `${BASE_SUPPORT_TICKET_URL}/${organizationId}/${id}/restore`,
//           {}
//         );

//         if (data.ok) return data.data;
//         throw new Error(data.message || 'Failed to restore support ticket');
//       } catch (error: any) {
//         const errorMessage =
//           error.response?.data?.message || error.message || 'An unexpected error occurred';
//         throw new Error(errorMessage, { cause: error });
//       }
//     },
//     onSuccess: (_, id) => {
//       queryClient.invalidateQueries({
//         queryKey: ['support-ticket', organizationId, 'active'],
//       });
//       queryClient.invalidateQueries({
//         queryKey: ['support-ticket', organizationId, 'inactive'],
//       });
//       queryClient.invalidateQueries({
//         queryKey: ['support-ticket', organizationId, 'detail', id],
//       });
//     },
//   });
// };

// // ── 8. Hard Delete Support Ticket ─────────────────────────────────────────────
// // Route: DELETE /api/support-ticket/v1/:organizationId/:id
// // Allowed: owner, admin, cto
// export const useHardDeleteSupportTicket = () => {
//   const { currentRole, organizationId } = useAuthData();
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async (id: string) => {
//       try {
//         checkPermission(currentRole, SUPPORT_TICKET_MANAGEMENT_ROLES);
//         if (!organizationId) throw new Error('Organization ID is missing');
//         if (!id) throw new Error('Ticket ID is missing');

//         const { data } = await Api.delete<BaseApiResponse<{ message: string }>>(
//           `${BASE_SUPPORT_TICKET_URL}/${organizationId}/${id}`
//         );

//         if (data.ok) return data.data;
//         throw new Error(data.message || 'Failed to permanently delete support ticket');
//       } catch (error: any) {
//         const errorMessage =
//           error.response?.data?.message || error.message || 'An unexpected error occurred';
//         throw new Error(errorMessage, { cause: error });
//       }
//     },
//     onSuccess: (_, id) => {
//       queryClient.invalidateQueries({
//         queryKey: ['support-ticket', organizationId, 'active'],
//       });
//       queryClient.invalidateQueries({
//         queryKey: ['support-ticket', organizationId, 'inactive'],
//       });
//       queryClient.removeQueries({
//         queryKey: ['support-ticket', organizationId, 'detail', id],
//       });
//     },
//   });
// };



import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── Types & Constants ─────────────────────────────────────────────────────────

// NOTE: confirm this base route against app.use('/api/...', supportTicketRoutes) on the backend.
export const BASE_SUPPORT_TICKET_URL = '/api/support-ticket/v1';

export const SUPPORT_TICKET_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const SUPPORT_TICKET_WRITE_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'] as const;
export const SUPPORT_TICKET_MANAGEMENT_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;
export const SUPPORT_TICKET_ADMIN_ROLES: UserRole[] = ['owner', 'cto'] as const;

export type TicketCategory =
  | 'Billing / POS'
  | 'Printer'
  | 'Inventory'
  | 'Reports'
  | 'Integration'
  | 'Account & plan'
  | 'Other';

export type TicketPriority = 'Low' | 'Medium' | 'High';
export type TicketStatus = 'Open' | 'In progress' | 'Closed';

export interface PopulatedOutletReference {
  _id: string;
  name: string;
}

export interface PopulatedUserReference {
  _id: string;
  userName?: string;
  name?: string;
}

export interface SupportTicketItem {
  _id: string;
  id?: string;
  organizationId: string;
  outletId: string | PopulatedOutletReference;
  ticketNo: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  details: string;
  status: TicketStatus;
  raisedBy: string | PopulatedUserReference;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupportTicketPayload {
  outletId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  details?: string;
}

// ── 1. List Active Tickets ────────────────────────────────────────────────────
// Route: GET /api/support-ticket/v1/:organizationId?outletId=...
// Allowed: owner, admin, cto, staff
export const useListActiveTickets = (outletId?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['support-ticket', organizationId, 'active', outletId || 'all'],
    queryFn: async () => {
      try {
        checkPermission(currentRole, SUPPORT_TICKET_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = outletId ? { outletId } : {};
        const { data } = await Api.get<BaseApiResponse<SupportTicketItem[]>>(
          `${BASE_SUPPORT_TICKET_URL}/${organizationId}`,
          { params }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch tickets');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. List Inactive Tickets ──────────────────────────────────────────────────
// Route: GET /api/support-ticket/v1/:organizationId/inactive?outletId=...
// Allowed: owner, admin, cto
export const useListInactiveTickets = (outletId?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['support-ticket', organizationId, 'inactive', outletId || 'all'],
    queryFn: async () => {
      try {
        checkPermission(currentRole, SUPPORT_TICKET_MANAGEMENT_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const params = outletId ? { outletId } : {};
        const { data } = await Api.get<BaseApiResponse<SupportTicketItem[]>>(
          `${BASE_SUPPORT_TICKET_URL}/${organizationId}/inactive`,
          { params }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch inactive tickets');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 3. Get Single Ticket ──────────────────────────────────────────────────────
// Route: GET /api/support-ticket/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useGetTicket = (id?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['support-ticket', organizationId, 'detail', id],
    queryFn: async () => {
      try {
        checkPermission(currentRole, SUPPORT_TICKET_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Ticket ID is missing');

        const { data } = await Api.get<BaseApiResponse<SupportTicketItem>>(
          `${BASE_SUPPORT_TICKET_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch ticket details');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId && !!id,
  });
};

// ── 4. Raise Ticket ───────────────────────────────────────────────────────────
// Route: POST /api/support-ticket/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useCreateTicket = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSupportTicketPayload) => {
      try {
        checkPermission(currentRole, SUPPORT_TICKET_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<SupportTicketItem>>(
          `${BASE_SUPPORT_TICKET_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to raise ticket');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', organizationId, 'active'] });
    },
  });
};

// ── 5. Advance Ticket Status ──────────────────────────────────────────────────
// Cycles Open → In progress → Closed → Open (mirrors the reference HTML's cycleTicket).
// NOTE: confirm the route path against the backend.
// Route: PATCH /api/support-ticket/v1/:organizationId/:id/status
// Allowed: owner, admin, cto, staff
export const useAdvanceTicketStatus = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({id, status}:{id: string ,status: TicketStatus}) => {
      try {
        checkPermission(currentRole, SUPPORT_TICKET_WRITE_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Ticket ID is missing');

        const { data } = await Api.patch<BaseApiResponse<SupportTicketItem>>(
          `${BASE_SUPPORT_TICKET_URL}/${organizationId}/${id}/status`,
          {status }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to update ticket status');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', organizationId, 'active'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', organizationId, 'detail', id] });
    },
  });
};

// ── 6. Soft Delete Ticket (Deactivate) ────────────────────────────────────────
// Route: PATCH /api/support-ticket/v1/:organizationId/:id/deactivate
// Allowed: owner, admin, cto
export const useSoftDeleteTicket = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, SUPPORT_TICKET_MANAGEMENT_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Ticket ID is missing');

        const { data } = await Api.patch<BaseApiResponse<SupportTicketItem>>(
          `${BASE_SUPPORT_TICKET_URL}/${organizationId}/${id}/deactivate`,
          {}
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to deactivate ticket');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', organizationId, 'active'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', organizationId, 'inactive'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', organizationId, 'detail', id] });
    },
  });
};

// ── 7. Restore Ticket ─────────────────────────────────────────────────────────
// Route: PATCH /api/support-ticket/v1/:organizationId/:id/restore
// Allowed: owner, admin, cto
export const useRestoreTicket = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, SUPPORT_TICKET_MANAGEMENT_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Ticket ID is missing');

        const { data } = await Api.patch<BaseApiResponse<SupportTicketItem>>(
          `${BASE_SUPPORT_TICKET_URL}/${organizationId}/${id}/restore`,
          {}
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to restore ticket');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', organizationId, 'active'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', organizationId, 'inactive'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', organizationId, 'detail', id] });
    },
  });
};

// ── 8. Hard Delete Ticket ─────────────────────────────────────────────────────
// Route: DELETE /api/support-ticket/v1/:organizationId/:id
// Allowed: owner, cto
export const useHardDeleteTicket = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        checkPermission(currentRole, SUPPORT_TICKET_ADMIN_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!id) throw new Error('Ticket ID is missing');

        const { data } = await Api.delete<BaseApiResponse<{ message: string }>>(
          `${BASE_SUPPORT_TICKET_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to permanently delete ticket');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', organizationId, 'active'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', organizationId, 'inactive'] });
      queryClient.removeQueries({ queryKey: ['support-ticket', organizationId, 'detail', id] });
    },
  });
};