import { useQuery } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── Scope & Filter Types ─────────────────────────────────────────────────────
export type ReportScope = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface BaseReportFilters {
  outletId?: string;
  scope?: ReportScope;
  from?: string;
  to?: string;
}

export interface ExpenseReportFilters extends BaseReportFilters {
  category?: string;
}

export interface GstSummaryFilters extends BaseReportFilters {
  page?: number;
  limit?: number;
}

// ── Response Data Types ──────────────────────────────────────────────────────
export interface DateRange {
  from: string | Date;
  to: string | Date;
}

export interface DailyTrendItem {
  date: string;
  sales: number;
  bills: number;
}

export interface OrderTypeSplit {
  [orderType: string]: {
    amount: number;
    count: number;
  };
}

export interface SalesReportData {
  range: DateRange;
  grossSales: number;
  taxableValue: number;
  totalDiscounts: number;
  totalGST: number;
  totalBills: number;
  avgBillValue: number;
  cancelledOrders: number;
  orderTypeSplit: OrderTypeSplit;
  dailyTrend: DailyTrendItem[];
}

export interface ItemSaleRow {
  rank: number;
  menuItemId: string;
  name: string;
  qtySold: number;
  revenue: number;
  sharePercent: number;
}

export interface ItemSalesReportData {
  range: DateRange;
  items: ItemSaleRow[];
}

export interface ExpenseGroupSummary {
  category?: string;
  mode?: string;
  amount: number;
  count: number;
}

export interface ExpenseReportData {
  range: DateRange;
  totalExpenses: number;
  totalEntries: number;
  byCategory: ExpenseGroupSummary[];
  byPaymentMode: ExpenseGroupSummary[];
}

export interface PaymentModeSummary {
  mode: string;
  amount: number;
  count: number;
  sharePercent: number;
}

export interface PaymentOrderTypeSummary {
  orderType: string;
  amount: number;
  count: number;
}

export interface PaymentModeReportData {
  range: DateRange;
  totalCollected: number;
  byMode: PaymentModeSummary[];
  byOrderType: PaymentOrderTypeSummary[];
}

export interface GstBillItem {
  billNo: string;
  orderNo: string;
  paidAt: string | Date;
  subTotal: number;
  discountAmount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
}

export interface GstSummaryData {
  range: DateRange;
  gstRatePercent: number | null;
  taxableValue: number;
  cgst: number;
  sgst: number;
  totalGST: number;
  page: number;
  limit: number;
  total: number;
  bills: GstBillItem[];
}

// ── Base URL & Role Constants ────────────────────────────────────────────────
const BASE_REPORT_URL = '/api/report/v1';

export const REPORT_READ_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;

// ── 1. Sales Report ──────────────────────────────────────────────────────────
// Route: GET /api/report/v1/:organizationId/sales
// Allowed: owner, admin, cto
export const useGetSalesReport = (filters: BaseReportFilters = {}) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['reports', 'sales', organizationId, filters],
    queryFn: async () => {
      try {
        checkPermission(currentRole, REPORT_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<SalesReportData>>(
          `${BASE_REPORT_URL}/${organizationId}/sales`,
          { params: filters }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch sales report');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. Item-Wise Sales Report ────────────────────────────────────────────────
// Route: GET /api/report/v1/:organizationId/items
// Allowed: owner, admin, cto
export const useGetItemSalesReport = (filters: BaseReportFilters = {}) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['reports', 'items', organizationId, filters],
    queryFn: async () => {
      try {
        checkPermission(currentRole, REPORT_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<ItemSalesReportData>>(
          `${BASE_REPORT_URL}/${organizationId}/items`,
          { params: filters }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch item sales report');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 3. Expense Report ────────────────────────────────────────────────────────
// Route: GET /api/report/v1/:organizationId/expenses
// Allowed: owner, admin, cto
export const useGetExpenseReport = (filters: ExpenseReportFilters = {}) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['reports', 'expenses', organizationId, filters],
    queryFn: async () => {
      try {
        checkPermission(currentRole, REPORT_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<ExpenseReportData>>(
          `${BASE_REPORT_URL}/${organizationId}/expenses`,
          { params: filters }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch expense report');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 4. Payment Mode / Source Report ──────────────────────────────────────────
// Route: GET /api/report/v1/:organizationId/payments-summary
// Allowed: owner, admin, cto
export const useGetPaymentModeReport = (filters: BaseReportFilters = {}) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['reports', 'payments-summary', organizationId, filters],
    queryFn: async () => {
      try {
        checkPermission(currentRole, REPORT_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<PaymentModeReportData>>(
          `${BASE_REPORT_URL}/${organizationId}/payments-summary`,
          { params: filters }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch payments summary report');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 5. GST Summary Report ────────────────────────────────────────────────────
// Route: GET /api/report/v1/:organizationId/gst-summary
// Allowed: owner, admin, cto
export const useGetGstSummaryReport = (filters: GstSummaryFilters = {}) => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['reports', 'gst-summary', organizationId, filters],
    queryFn: async () => {
      try {
        checkPermission(currentRole, REPORT_READ_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<GstSummaryData>>(
          `${BASE_REPORT_URL}/${organizationId}/gst-summary`,
          { params: filters }
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch GST summary report');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};