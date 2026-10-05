
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';



// Route mounted at app.use('/api/payment', paymentRoutes)
export const BASE_PAYMENT_URL = '/api/payment/v1';

// Permissions aligned with paymentRoutes
export const PAYMENT_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto', 'staff'];

export type PaymentScope = 'today' | 'week' | 'month' | 'all';
// export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank transfer' | 'Cheque' | string;
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'split' | 'unpaid';

// export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | string;
export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'online';



// The receipt endpoint returns the populated order. The hook file still types it as PaymentRecord,
// so the shape the page actually uses is described here.
export interface PaymentReceiptItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  itemTotal: number;
  notes?: string;
  status: string;
}

export interface PaymentReceipt {
  _id: string;
  billNo?: string;
  orderNo: string;
  orderType: string;
  outletId?: { _id: string; name: string; code: string } | null;
  tableId?: { _id: string; name: string } | null;
  customerId?: { _id: string; name: string; phone: string } | null;
  items: PaymentReceiptItem[];
  subTotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  loyaltyPointsRedeemed: number;
  paymentMethod: string;
  paidAt: string;
}

export interface PaymentListFilters {
  outletId?: string;
  paymentMethod?: PaymentMethod;
  orderType?: OrderType;
  scope?: PaymentScope;
  from?: string; // YYYY-MM-DD or ISO string
  to?: string;   // YYYY-MM-DD or ISO string
  page?: number;
  limit?: number;
}

export interface PaymentOrderItem {
  _id: string;
  billNo: string;
  orderNo: string;
  orderType: OrderType;
  outletId: {
    _id: string;
    name: string;
    code: string;
  };
  tableId?: string;
  customerId?: {
    _id: string;
    name: string;
    phone: string;
  } | null;
  grandTotal: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  paidAt: string;
}

export interface PaymentRecord {
  _id: string;
  organizationId: string;
  outletId: string;
  orderId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  orderType?: OrderType;
  status: string;
  transactionReference?: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface PaymentSummaryByMode {
  amount: number;
  count: number;
}

export interface PaymentListResponse {
  payments: PaymentOrderItem[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalCollected: number;
    byMode: Record<string, PaymentSummaryByMode>;
  };
}

export type InfinitePaymentListFilters = Omit<PaymentListFilters, 'page'>;

// ── 1. List Payments ──────────────────────────────────────────────────────────
// Route: GET /api/payment/v1/:organizationId
// Allowed: owner, admin, cto, staff
// ── Infinite List Payments ──────────────────────────────────────────────────
// Route: GET /api/payment/v1/:organizationId
// Allowed: owner, admin, cto, staff
export const useInfiniteListPayments = (
  filters?: InfinitePaymentListFilters,
  pageSize: number = 20
) => {
  const { currentRole, organizationId } = useAuthData();

  return useInfiniteQuery({
    queryKey: ['payment', organizationId, 'infinite', filters, pageSize],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      try {
        checkPermission(currentRole, PAYMENT_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<PaymentListResponse>>(
          `${BASE_PAYMENT_URL}/${organizationId}`,
          {
            params: {
              ...filters,
              page: pageParam,
              limit: pageSize,
            },
          }
        );

        // if (data.ok) return data.data;
        if (data.ok && data?.data) return data.data;

        throw new Error(data.message || 'Failed to fetch payments');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    // getNextPageParam: (lastPage, allPages) => {
    //   // Calculate how many items loaded so far
    //   const totalLoaded = allPages.length * (lastPage?.limit || pageSize);

    //   // If there are more items to fetch, return next page index, else undefined
    //   if (totalLoaded < lastPage?.total) {
    //     return allPages.length + 1;
    //   }
    //   return undefined;
    // },

    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined,

    enabled: !!currentRole && !!organizationId,
  });
};



// ── 2. Get Payment / Receipt By ID ───────────────────────────────────────────
// Route: GET /api/payment/v1/:organizationId/:id
// Allowed: owner, admin, cto, staff
export const useGetPaymentById = (id?: string) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['payment', organizationId, 'detail', id],
    queryFn: async () => {
      try {
        checkPermission(currentRole, PAYMENT_READ_ROLES);
        if (!organizationId || !id) {
          throw new Error('Organization ID and Order/Payment ID are required');
        }

        const { data } = await Api.get<BaseApiResponse<PaymentReceipt>>(
          `${BASE_PAYMENT_URL}/${organizationId}/${id}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch payment details');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId && !!id,
  });
};