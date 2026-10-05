import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../features/slices/authSlice';
import { useAuthData } from '../../hooks/useAuthData';
import { checkPermission } from '../../utils/utils';
import { Api } from '../../lib/api';
import type { BaseApiResponse } from '../auth_api/authApi';

// ── Types ────────────────────────────────────────────────────────────────────
export type NotificationChannel = 'whatsapp' | 'sms' | 'email';

export type NotificationEvent =
  | 'billShare'
  | 'orderReady'
  | 'lowStock'
  | 'dayClosing'
  | 'newOnline'
  | 'offerBlast';

export interface NotificationChannelsState {
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}

export interface NotificationEventsState {
  billShare: boolean;
  orderReady: boolean;
  lowStock: boolean;
  dayClosing: boolean;
  newOnline: boolean;
  offerBlast: boolean;
}

export interface NotificationSettingsItem {
  _id: string;
  organizationId: string;
  channels: NotificationChannelsState;
  events: NotificationEventsState;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationSettingsPayload {
  channels?: Partial<NotificationChannelsState>;
  events?: Partial<NotificationEventsState>;
}

export interface UpdateTogglePayload<T extends string> {
  key: T;
  isEnabled: boolean;
}

// ── Base URL & Role Constants ────────────────────────────────────────────────
const BASE_NOTIFICATION_SETTINGS_URL = '/api/notification-settings/v1';

export const NOTIFICATION_SETTINGS_ROLES: UserRole[] = ['owner', 'admin', 'cto'] as const;

// ── 1. Get Notification Settings ─────────────────────────────────────────────
// Route: GET /api/notification-settings/v1/:organizationId
// Allowed: owner, admin, cto
export const useGetNotificationSettings = () => {
  const { currentRole, organizationId } = useAuthData();

  return useQuery({
    queryKey: ['notification-settings', organizationId],
    queryFn: async () => {
      try {
        checkPermission(currentRole, NOTIFICATION_SETTINGS_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.get<BaseApiResponse<NotificationSettingsItem>>(
          `${BASE_NOTIFICATION_SETTINGS_URL}/${organizationId}`
        );

        if (data.ok) return data.data;
        throw new Error(data.message || 'Failed to fetch notification settings');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    enabled: !!currentRole && !!organizationId,
  });
};

// ── 2. Create Notification Settings (Initial Setup) ──────────────────────────
// Route: POST /api/notification-settings/v1/:organizationId
// Allowed: owner, admin, cto
export const useCreateNotificationSettings = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateNotificationSettingsPayload) => {
      try {
        checkPermission(currentRole, NOTIFICATION_SETTINGS_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');

        const { data } = await Api.post<BaseApiResponse<NotificationSettingsItem>>(
          `${BASE_NOTIFICATION_SETTINGS_URL}/${organizationId}`,
          payload
        );

        if (data.ok) return data;
        throw new Error(data.message || 'Failed to initialize notification settings');
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', organizationId] });
    },
  });
};

// ── 3. Update Channel Toggle (WhatsApp / SMS / Email) ────────────────────────
// Route: PATCH /api/notification-settings/v1/:organizationId/channels/:channel
// Allowed: owner, admin, cto
export const useUpdateNotificationChannel = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channel,
      isEnabled,
    }: {
      channel: NotificationChannel;
      isEnabled: boolean;
    }) => {
      try {
        checkPermission(currentRole, NOTIFICATION_SETTINGS_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!channel) throw new Error('Channel name is required');

        const { data } = await Api.patch<BaseApiResponse<NotificationSettingsItem>>(
          `${BASE_NOTIFICATION_SETTINGS_URL}/${organizationId}/channels/${channel}`,
          { isEnabled }
        );

        if (data.ok) return data;
        throw new Error(data.message || `Failed to update ${channel} setting`);
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', organizationId] });
    },
  });
};

// ── 4. Update Event Toggle (billShare / orderReady / lowStock / etc.) ─────────
// Route: PATCH /api/notification-settings/v1/:organizationId/events/:event
// Allowed: owner, admin, cto
export const useUpdateNotificationEvent = () => {
  const { currentRole, organizationId } = useAuthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      event,
      isEnabled,
    }: {
      event: NotificationEvent;
      isEnabled: boolean;
    }) => {
      try {
        checkPermission(currentRole, NOTIFICATION_SETTINGS_ROLES);
        if (!organizationId) throw new Error('Organization ID is missing');
        if (!event) throw new Error('Event name is required');

        const { data } = await Api.patch<BaseApiResponse<NotificationSettingsItem>>(
          `${BASE_NOTIFICATION_SETTINGS_URL}/${organizationId}/events/${event}`,
          { isEnabled }
        );

        if (data.ok) return data;
        throw new Error(data.message || `Failed to update ${event} event setting`);
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || error.message || 'An unexpected error occurred';
        throw new Error(errorMessage, { cause: error });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', organizationId] });
    },
  });
};