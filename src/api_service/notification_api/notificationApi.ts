import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── Types ────────────────────────────────────────────────────────────────────
export type NotificationEventKey =
    | 'billShare'
    | 'orderReady'
    | 'lowStock'
    | 'dayClosing'
    | 'newOnline'
    | 'offerBlast'
    | 'general';

export interface NotificationItem {
    _id: string;
    organizationId: string;
    outletId: string | null;
    eventKey: NotificationEventKey;
    title: string;
    message: string;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    isRead: boolean;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UnreadCountResponse {
    unreadCount: number;
}

export interface NotificationListFilters {
    unreadOnly?: boolean;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface PaginatedNotificationsResponse {
    items: NotificationItem[];
    pagination: PaginationMeta;
}
// ── Base URL & Role Constants ────────────────────────────────────────────────
const BASE_NOTIFICATION_URL = '/api/notification/v1';

export const NOTIFICATION_READ_ROLES: UserRole[] = [
    'owner',
    'admin',
    'cto',
    'staff',
] as const;

// ── 1. List Notifications by Outlet ──────────────────────────────────────────
// NOTE: IGNORE THIS HOOK DONT USE THIS HOOK INSTEAD USE THE useListNotifications
// Route: GET /api/notification/v1/:organizationId/:outletId?unreadOnly=true
// Allowed: owner, admin, cto, staff
// 
export const useListNotificationsByOutlet = (
    outletId?: string,
    filters: NotificationListFilters = {}
) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['notifications', 'list', organizationId, outletId, filters],
        queryFn: async () => {
            try {
                checkPermission(currentRole, NOTIFICATION_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!outletId) throw new Error('Outlet ID is missing');

                const { data } = await Api.get<BaseApiResponse<NotificationItem[]>>(
                    `${BASE_NOTIFICATION_URL}/${organizationId}/${outletId}`,
                    {
                        params: {
                            unreadOnly: filters.unreadOnly ? 'true' : undefined,
                        },
                    }
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch notifications');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId && !!outletId,
    });
};



const EMPTY_NOTIFICATIONS_PAGE: PaginatedNotificationsResponse = {
    items: [],
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
    },
};

// ── 2. Infinite Scroll Notification Hook ─────────────────────────────────────
export const useInfiniteNotifications = (
    params: { outletId?: string; limit?: number } = {}
) => {
    const { currentRole, organizationId } = useAuthData();
    const { outletId, limit = 20 } = params;

    return useInfiniteQuery({
        queryKey: ['notifications', 'infinite', organizationId, { outletId, limit }],
        queryFn: async ({ pageParam = 1 }) => {
            try {
                checkPermission(currentRole, NOTIFICATION_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');

                const { data } = await Api.get<BaseApiResponse<PaginatedNotificationsResponse>>(
                    `${BASE_NOTIFICATION_URL}/${organizationId}`,
                    {
                        params: {
                            ...(outletId ? { outletId } : {}),
                            page: pageParam,
                            limit,
                        },
                    }
                );

                // if (data.ok) return data.data;
                if (data.ok) return data.data ?? EMPTY_NOTIFICATIONS_PAGE;
                throw new Error(data.message || 'Failed to fetch notifications');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        initialPageParam: 1,
        // getNextPageParam: (lastPage) =>
        //     lastPage?.pagination?.hasNextPage ? lastPage.pagination.page + 1 : undefined,

        getNextPageParam: (lastPage) =>
            lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
        
        enabled: !!currentRole && !!organizationId,
    });
};

// ── 2. Get Unread Notification Count ────────────────────────────────────────
// Route: GET /api/notification/v1/:organizationId/:outletId/unread-count
// Allowed: owner, admin, cto, staff
export const useGetUnreadNotificationCount = (outletId?: string) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['notifications', 'unread-count', organizationId, outletId],
        queryFn: async () => {
            try {
                checkPermission(currentRole, NOTIFICATION_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!outletId) throw new Error('Outlet ID is missing');

                const { data } = await Api.get<BaseApiResponse<UnreadCountResponse>>(
                    `${BASE_NOTIFICATION_URL}/${organizationId}/${outletId}/unread-count`
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch unread count');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId && !!outletId,
        refetchInterval: 30000, // Optional: Polls unread badge count every 30 seconds
    });
};

// ── 3. Get Single Notification ───────────────────────────────────────────────
// Route: GET /api/notification/v1/:organizationId/single/:id
// Allowed: owner, admin, cto, staff
export const useGetNotificationById = (id?: string) => {
    const { currentRole, organizationId } = useAuthData();

    return useQuery({
        queryKey: ['notifications', 'detail', organizationId, id],
        queryFn: async () => {
            try {
                checkPermission(currentRole, NOTIFICATION_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Notification ID is missing');

                const { data } = await Api.get<BaseApiResponse<NotificationItem>>(
                    `${BASE_NOTIFICATION_URL}/${organizationId}/single/${id}`
                );

                if (data.ok) return data.data;
                throw new Error(data.message || 'Failed to fetch notification');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        enabled: !!currentRole && !!organizationId && !!id,
    });
};

// ── 4. Mark Notification As Read ────────────────────────────────────────────
// Route: PATCH /api/notification/v1/:organizationId/:id/read
// Allowed: owner, admin, cto, staff
export const useMarkNotificationAsRead = () => {
    const { currentRole, organizationId } = useAuthData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                checkPermission(currentRole, NOTIFICATION_READ_ROLES);
                if (!organizationId) throw new Error('Organization ID is missing');
                if (!id) throw new Error('Notification ID is missing');

                const { data } = await Api.patch<BaseApiResponse<NotificationItem>>(
                    `${BASE_NOTIFICATION_URL}/${organizationId}/${id}/read`
                );

                if (data.ok) return data;
                throw new Error(data.message || 'Failed to mark notification as read');
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.message || error.message || 'An unexpected error occurred';
                throw new Error(errorMessage, { cause: error });
            }
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['notifications', 'list', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'detail', organizationId, id] });
        },
    });
};