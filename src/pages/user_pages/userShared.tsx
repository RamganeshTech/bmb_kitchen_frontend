import type { UserData, UserPermissionMap } from '../../api_service/auth_api/authApi';


// authApi's UserData doesn't include every field on the backend UserModel
export interface UserDetail extends UserData {
  phoneNo?: string;
  specificRole?: string | { _id: string; name?: string } | null;
  permissions?: UserPermissionMap;
  profileImage?: { url?: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export const getProfileImageUrl = (user: UserDetail) =>
  user.profileImageUrl || user.profileImage?.url || undefined;

export const getSpecificRoleId = (user: UserDetail) =>
  !user.specificRole
    ? undefined
    : typeof user.specificRole === 'string'
      ? user.specificRole
      : user.specificRole._id;

export const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export const capitalize = (value: string) => value?.charAt(0)?.toUpperCase() + value?.slice(1) || "N/A";

const AVATAR_SIZE_CLASS = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
} as const;

export const UserAvatar = ({ user, size = 'sm' }: { user: UserDetail; size?: keyof typeof AVATAR_SIZE_CLASS }) => {
  const imageUrl = getProfileImageUrl(user);
  const sizeClass = AVATAR_SIZE_CLASS[size];

  return imageUrl ? (
    <img src={imageUrl} alt={user.userName} className={`${sizeClass} shrink-0 rounded-full border border-border object-cover`} />
  ) : (
    <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-text`}>
      {user.userName?.charAt(0).toUpperCase() || '?'}
    </span>
  );
};

export const RoleBadge = ({ role }: { role: string }) => (
  <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-white">
    {capitalize(role)}
  </span>
);

export const StatusBadge = ({ isActive }: { isActive?: boolean }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
      isActive === false ? 'bg-danger' : 'bg-success'
    }`}
  >
    {isActive === false ? 'Inactive' : 'Active'}
  </span>
);
