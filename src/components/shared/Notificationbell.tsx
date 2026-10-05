import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useGetUnreadNotificationCount } from '../../api_service/notification_api/notificationApi';

const MAX_VISIBLE_UNREAD_COUNT = 99;

interface NotificationBellProps {
    outletId?: string;
}

const NotificationBell = ({ outletId }: NotificationBellProps) => {
    const navigate = useNavigate();
    const { data: unreadCountData } = useGetUnreadNotificationCount(outletId);

    const unreadCount = unreadCountData?.unreadCount ?? 0;
    const unreadLabel = unreadCount > MAX_VISIBLE_UNREAD_COUNT ? `${MAX_VISIBLE_UNREAD_COUNT}+` : String(unreadCount);

    return (
        <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadLabel} unread` : 'Notifications'}
            onClick={() => navigate('/layout/notification')}
        >
            <Bell size={20} />
            {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold leading-none text-white">
                    {unreadLabel}
                </span>
            )}
        </Button>
    );
};

export default NotificationBell;