import {
    AlertTriangle,
    BellRing,
    Mail,
    Megaphone,
    MessageCircle,
    MessageSquare,
    Moon,
    Receipt,
    RefreshCw,
    ShoppingBag,
    UtensilsCrossed,
    type LucideIcon,
} from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Toggle } from '../../components/ui/Toggle';
import {
    useCreateNotificationSettings,
    useGetNotificationSettings,
    useUpdateNotificationChannel,
    useUpdateNotificationEvent,
    type NotificationChannel,
    type NotificationEvent,
} from '../../api_service/notificationSetting_api/notificationSetttingApi';

// ── Static display config (labels/icons only, values always come from backend) ──
interface SettingDefinition<TKey extends string> {
    key: TKey;
    label: string;
    description: string;
    icon: LucideIcon;
}

const CHANNEL_DEFINITIONS: SettingDefinition<NotificationChannel>[] = [
    {
        key: 'whatsapp',
        label: 'WhatsApp',
        description: 'Send bills and updates to customers on WhatsApp.',
        icon: MessageCircle,
    },
    {
        key: 'sms',
        label: 'SMS',
        description: 'Send text messages to phone numbers.',
        icon: MessageSquare,
    },
    {
        key: 'email',
        label: 'Email',
        description: 'Send bills and reports to email addresses.',
        icon: Mail,
    },
];

const EVENT_DEFINITIONS: SettingDefinition<NotificationEvent>[] = [
    {
        key: 'billShare',
        label: 'Bill sharing',
        description: 'Share the bill with the customer after payment.',
        icon: Receipt,
    },
    {
        key: 'orderReady',
        label: 'Order ready',
        description: 'Tell the customer when their order is ready.',
        icon: UtensilsCrossed,
    },
    {
        key: 'lowStock',
        label: 'Low stock alert',
        description: 'Alert when an item drops to its minimum level.',
        icon: AlertTriangle,
    },
    {
        key: 'dayClosing',
        label: 'Day closing summary',
        description: 'Send the sales summary when an outlet closes the day.',
        icon: Moon,
    },
    {
        key: 'newOnline',
        label: 'New online order',
        description: 'Alert the team when an online order comes in.',
        icon: ShoppingBag,
    },
    {
        key: 'offerBlast',
        label: 'Offers and promotions',
        description: 'Send offers and promotions to customers.',
        icon: Megaphone,
    },
];

// ── Row ──────────────────────────────────────────────────────────────────────
interface SettingRowProps {
    label: string;
    description: string;
    icon: LucideIcon;
    isEnabled: boolean;
    isSaving: boolean;
    onToggle: (nextValue: boolean) => void;
}

const SettingRow = ({ label, description, icon: SettingIcon, isEnabled, isSaving, onToggle }: SettingRowProps) => (
    <li className="flex items-center gap-3 border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-surface-hover sm:gap-4 sm:px-5">
        <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isEnabled ? 'bg-primary-soft text-primary' : 'bg-page text-muted'
            }`}
        >
            <SettingIcon size={20} />
        </span>

        <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-heading">{label}</p>
            <p className="mt-0.5 text-sm leading-snug text-muted">{description}</p>
        </div>

        <Toggle
            checked={isEnabled}
            disabled={isSaving}
            onChange={onToggle}
            aria-label={`${isEnabled ? 'Turn off' : 'Turn on'} ${label}`}
        />
    </li>
);

// ── Section card ─────────────────────────────────────────────────────────────
interface SettingSectionProps {
    title: string;
    subtitle: string;
    enabledCount: number;
    totalCount: number;
    children: React.ReactNode;
}

const SettingSection = ({ title, subtitle, enabledCount, totalCount, children }: SettingSectionProps) => (
    <section className="w-full overflow-hidden rounded-xl border border-border bg-surface">
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
            <div className="min-w-0">
                <h2 className="text-lg font-semibold text-heading">{title}</h2>
                <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
            </div>
            <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium text-white ${
                    enabledCount === 0 ? 'bg-body' : 'bg-success'
                }`}
            >
                {enabledCount} of {totalCount} on
            </span>
        </header>
        <ul>{children}</ul>
    </section>
);

const SettingsSkeleton = () => (
    <div className="grid w-full gap-5 lg:grid-cols-2" aria-hidden="true">
        {[3, 6].map((rowCount) => (
            <div key={rowCount} className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="space-y-2 border-b border-border px-5 py-4">
                    <span className="block h-5 w-1/3 animate-pulse rounded bg-surface-hover" />
                    <span className="block h-3 w-2/3 animate-pulse rounded bg-surface-hover" />
                </div>
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                    <div key={rowIndex} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
                        <span className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-surface-hover" />
                        <div className="flex-1 space-y-2">
                            <span className="block h-4 w-1/2 animate-pulse rounded bg-surface-hover" />
                            <span className="block h-3 w-3/4 animate-pulse rounded bg-surface-hover" />
                        </div>
                        <span className="h-6 w-11 shrink-0 animate-pulse rounded-full bg-surface-hover" />
                    </div>
                ))}
            </div>
        ))}
    </div>
);

// ── Page ─────────────────────────────────────────────────────────────────────
const NotificationSettingMain = () => {
    const { data: notificationSettings, isLoading, isError, error, refetch } = useGetNotificationSettings();

    const { mutateAsync: createSettingsAsync, isPending: isCreatingSettings } = useCreateNotificationSettings();
    const {
        mutateAsync: updateChannelAsync,
        isPending: isUpdatingChannel,
        variables: updatingChannelVariables,
    } = useUpdateNotificationChannel();
    const {
        mutateAsync: updateEventAsync,
        isPending: isUpdatingEvent,
        variables: updatingEventVariables,
    } = useUpdateNotificationEvent();

    // The settings document is a per-organization singleton: a "not found" response means it was never created
    const isSettingsMissing = !notificationSettings && isError && /not found/i.test(error?.message ?? '');

    const enabledChannelCount = notificationSettings
        ? CHANNEL_DEFINITIONS.filter((channel) => notificationSettings.channels[channel.key]).length
        : 0;
    const enabledEventCount = notificationSettings
        ? EVENT_DEFINITIONS.filter((event) => notificationSettings.events[event.key]).length
        : 0;

    const handleCreateSettings = async () => {
        try {
            await createSettingsAsync({});
            toast.success('Notification settings are ready');
        } catch (createError: any) {
            toast.error(createError.message || 'Could not set up notification settings');
        }
    };

    const handleChannelToggle = async (channel: SettingDefinition<NotificationChannel>, nextValue: boolean) => {
        try {
            await updateChannelAsync({ channel: channel.key, isEnabled: nextValue });
            toast.success(`${channel.label} turned ${nextValue ? 'on' : 'off'}`);
        } catch (updateError: any) {
            toast.error(updateError.message || `Could not update ${channel.label}`);
        }
    };

    const handleEventToggle = async (event: SettingDefinition<NotificationEvent>, nextValue: boolean) => {
        try {
            await updateEventAsync({ event: event.key, isEnabled: nextValue });
            toast.success(`${event.label} turned ${nextValue ? 'on' : 'off'}`);
        } catch (updateError: any) {
            toast.error(updateError.message || `Could not update ${event.label}`);
        }
    };

    return (
        <div className="flex w-full flex-col gap-5 p-2">
            {/* Header */}
            <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <BellRing size={20} />
                </span>
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-heading">Notification settings</h1>
                    <p className="text-sm text-muted">Choose how alerts are sent and which events trigger them</p>
                </div>
            </div>

            {isLoading ? (
                <SettingsSkeleton />
            ) : isSettingsMissing ? (
                <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <BellRing size={20} />
                    </span>
                    <p className="text-base font-medium text-heading">Notifications are not set up yet</p>
                    <p className="max-w-sm text-sm text-muted">
                        Set up notifications to choose your channels and the events you want alerts for. You can change
                        everything afterwards.
                    </p>
                    <Button
                        variant="primary"
                        leftIcon={<BellRing size={16} />}
                        isLoading={isCreatingSettings}
                        loadingText="Setting up..."
                        onClick={handleCreateSettings}
                    >
                        Set up notifications
                    </Button>
                </div>
            ) : isError || !notificationSettings ? (
                <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-soft text-danger">
                        <AlertTriangle size={20} />
                    </span>
                    <p className="text-base font-medium text-heading">Could not load notification settings</p>
                    <p className="text-sm text-muted">{error?.message}</p>
                    <Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => refetch()}>
                        Try again
                    </Button>
                </div>
            ) : (
                <>
                    {enabledChannelCount === 0 && (
                        <div
                            role="alert"
                            className="flex items-start gap-3 rounded-xl border border-border bg-warning-soft px-4 py-3 text-sm text-heading"
                        >
                            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
                            <p>All channels are off. Turn on at least one channel so alerts can reach people.</p>
                        </div>
                    )}

                    <div className="grid w-full items-start gap-5 lg:grid-cols-2">
                        <SettingSection
                            title="Channels"
                            subtitle="Where alerts are delivered"
                            enabledCount={enabledChannelCount}
                            totalCount={CHANNEL_DEFINITIONS.length}
                        >
                            {CHANNEL_DEFINITIONS.map((channel) => (
                                <SettingRow
                                    key={channel.key}
                                    label={channel.label}
                                    description={channel.description}
                                    icon={channel.icon}
                                    isEnabled={notificationSettings.channels[channel.key]}
                                    isSaving={isUpdatingChannel && updatingChannelVariables?.channel === channel.key}
                                    onToggle={(nextValue) => handleChannelToggle(channel, nextValue)}
                                />
                            ))}
                        </SettingSection>

                        <SettingSection
                            title="Events"
                            subtitle="What triggers an alert"
                            enabledCount={enabledEventCount}
                            totalCount={EVENT_DEFINITIONS.length}
                        >
                            {EVENT_DEFINITIONS.map((event) => (
                                <SettingRow
                                    key={event.key}
                                    label={event.label}
                                    description={event.description}
                                    icon={event.icon}
                                    isEnabled={notificationSettings.events[event.key]}
                                    isSaving={isUpdatingEvent && updatingEventVariables?.event === event.key}
                                    onToggle={(nextValue) => handleEventToggle(event, nextValue)}
                                />
                            ))}
                        </SettingSection>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationSettingMain;