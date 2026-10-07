import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Camera,
  Check,
  Minus,
  Loader2,
  AlertCircle,
  ShieldCheck,
  UserRound,
  KeyRound,
} from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import InfoTooltip from '../../components/ui/InfoTooltip';
import { queryClient } from '../../lib/queryClient';
import { useAuthData } from '../../hooks/useAuthData';
import {
  useGetSingleUser,
  useUpdateUserData,
  useUpdateProfileImage,
  useUserIsAuthenticated,
  type ActionPermission,
  type UserPermissionMap,
} from '../../api_service/auth_api/authApi';
import {
  useUpdateUserPermissions,
  USER_PERMISSION_MANAGE_ROLES,
} from '../../api_service/auth_api/authApi';
import { ROLE_READ_ROLES, useGetRoleById } from '../../api_service/role_api/roleApi';
import {
  PERMISSION_OPTIONS,
  PERMISSION_HELP,
  PERMISSION_LABEL_BY_KEY,
} from './permissionCatalog';
import {
  UserAvatar,
  RoleBadge,
  StatusBadge,
  formatDate,
  getSpecificRoleId,
  type UserDetail,
  // type ActionPermission,
  // type UserPermissionMap,
} from './userShared';
import type { UserRole } from '../../features/slices/authSlice';

// ── Constants ───────────────────────────────────────────────────────────────
const ACTIONS: { key: keyof ActionPermission; label: string }[] = [
  { key: 'get', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

const AUTOSAVE_DELAY_MS = 600;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type TabKey = 'profile' | 'permissions' | 'role';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Helpers ─────────────────────────────────────────────────────────────────
const emptyActions = (): ActionPermission => ({ create: false, get: false, update: false, delete: false });

// Every catalog module always has all four actions; unknown modules already on the user are kept untouched
const buildPermissionMap = (saved?: UserPermissionMap): UserPermissionMap => {
  const map: UserPermissionMap = { ...(saved ?? {}) };
  PERMISSION_OPTIONS.forEach(({ key }) => {
    map[key] = { ...emptyActions(), ...(saved?.[key] ?? {}) };
  });
  return map;
};

const countEnabledActions = (map: UserPermissionMap) =>
  PERMISSION_OPTIONS.reduce(
    (total, { key }) => total + ACTIONS.filter(({ key: action }) => map[key]?.[action]).length,
    0
  );

const getErrorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

// ============================================================================
// Small pieces
// ============================================================================
const InfoRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
    <dt className="text-sm text-muted sm:w-48 sm:shrink-0">{label}</dt>
    <dd className="break-words text-base font-medium text-heading">{value || '—'}</dd>
  </div>
);

const Switch = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
      checked ? 'bg-primary' : 'bg-border'
    }`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
        checked ? 'left-[22px]' : 'left-0.5'
      }`}
    />
  </button>
);

// ============================================================================
// Profile tab — read-only text by default; fields only exist in the edit form
// ============================================================================
const ProfileEditForm = ({ user, onCancel }: { user: UserDetail; onCancel: () => void }) => {
  const { organizationId } = useAuthData();
  const { mutateAsync: updateUserAsync, isPending: isSaving } = useUpdateUserData();
  const { mutateAsync: updateImageAsync, isPending: isUploading } = useUpdateProfileImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userName, setUserName] = useState(user.userName ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [phoneNo, setPhoneNo] = useState(user.phoneNo ?? '');

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > MAX_IMAGE_SIZE_BYTES) return toast.error('Image must be 5 MB or smaller');
    if (!organizationId) return toast.error('Organization ID is missing');

    try {
      await updateImageAsync({ userId: user._id, file, organizationId });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(getErrorText(err, 'Could not upload the photo'));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!userName.trim()) return toast.error('Name is required');
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error('Enter a valid email address');
    if (phoneNo && phoneNo.length !== 10) return toast.error('Phone number must be 10 digits');

    try {
      await updateUserAsync({ userName: userName.trim(), email: email.trim(), phoneNo });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      toast.success('Profile updated');
      onCancel();
    } catch (err) {
      toast.error(getErrorText(err, 'Could not update the profile'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <UserAvatar user={user} size="xl" />
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Camera size={16} />}
            isLoading={isUploading}
            loadingText="Uploading..."
            onClick={() => fileInputRef.current?.click()}
          >
            Change photo
          </Button>
          <p className="mt-1.5 text-sm text-muted">JPG or PNG, up to 5 MB. The photo saves as soon as it uploads.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="user-name">Name</Label>
          <Input id="user-name" value={userName} onChange={(event) => setUserName(event.target.value)} autoFocus />
        </div>
        <div>
          <Label htmlFor="user-email">Email</Label>
          <Input id="user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="user-phone">Phone</Label>
          <Input
            id="user-phone"
            inputMode="numeric"
            value={phoneNo}
            onChange={(event) => setPhoneNo(event.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit number"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSaving} loadingText="Saving...">
          Save changes
        </Button>
      </div>
    </form>
  );
};

const ProfileTab = ({ user, canEdit }: { user: UserDetail; canEdit: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-heading">{isEditing ? 'Edit profile' : 'Profile details'}</h2>
        {canEdit && !isEditing && (
          <Button variant="outline" size="sm" leftIcon={<Pencil size={16} />} onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <ProfileEditForm user={user} onCancel={() => setIsEditing(false)} />
      ) : (
        <>
          <dl>
            <InfoRow label="Name" value={user.userName} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phoneNo} />
            <InfoRow label="Role" value={user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : undefined} />
            <InfoRow label="Status" value={user.isActive === false ? 'Inactive' : 'Active'} />
            <InfoRow label="Member since" value={formatDate(user.createdAt)} />
            <InfoRow label="Last updated" value={formatDate(user.updatedAt)} />
          </dl>
          {!canEdit && (
            <p className="mt-3 text-sm text-muted">Only {user.userName} can edit these details from their own account.</p>
          )}
        </>
      )}
    </section>
  );
};

// ============================================================================
// Permissions tab — one box per module, autosaved
// ============================================================================
const SaveIndicator = ({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) => {
  if (status === 'saving')
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-body" role="status">
        <Loader2 size={16} className="animate-spin text-primary" /> Saving changes...
      </span>
    );
  if (status === 'saved')
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success" role="status">
        <Check size={16} /> All changes saved
      </span>
    );
  if (status === 'error')
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-danger" role="alert">
        <AlertCircle size={16} /> Couldn't save
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </span>
    );
  return <span className="text-sm text-muted">Changes save automatically</span>;
};

interface PermissionBoxProps {
  option: (typeof PERMISSION_OPTIONS)[number];
  actions: ActionPermission;
  editable: boolean;
  onToggleAction: (action: keyof ActionPermission) => void;
  onToggleAll: () => void;
}

const PermissionBox = ({ option, actions, editable, onToggleAction, onToggleAll }: PermissionBoxProps) => {
  const Icon = option.icon;
  const enabledCount = ACTIONS.filter(({ key }) => actions[key]).length;
  const isAll = enabledCount === ACTIONS.length;
  const isSome = enabledCount > 0 && !isAll;

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface">
      <header className="flex items-center gap-3 border-b border-border p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-heading">{option.label}</h3>
          <p className="text-xs text-muted">{enabledCount} of {ACTIONS.length} allowed</p>
        </div>
        {editable && (
          <button
            type="button"
            role="checkbox"
            aria-checked={isSome ? 'mixed' : isAll}
            aria-label={`Select all ${option.label} permissions`}
            onClick={onToggleAll}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
              isAll || isSome ? 'border-primary bg-primary text-white' : 'border-border bg-surface hover:border-primary'
            }`}
          >
            {isAll ? <Check size={14} /> : isSome ? <Minus size={14} /> : null}
          </button>
        )}
      </header>

      <ul className="flex flex-col px-4 py-1">
        {ACTIONS.map(({ key, label }) => (
          <li key={key} className="flex items-center justify-between py-2.5">
            <span className={`text-base ${actions[key] ? 'text-heading' : 'text-body'}`}>{label}</span>
            {editable ? (
              <Switch checked={actions[key]} onChange={() => onToggleAction(key)} label={`${label} ${option.label}`} />
            ) : actions[key] ? (
              <Check size={18} className="text-success" aria-label="Allowed" />
            ) : (
              <Minus size={18} className="text-muted" aria-label="Not allowed" />
            )}
          </li>
        ))}
      </ul>

      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <span className="text-sm text-muted">What does this control?</span>
        <InfoTooltip title={option.label} description={PERMISSION_HELP[option.key] ?? option.description} />
      </footer>
    </article>
  );
};

const PermissionsTab = ({ user, canManage }: { user: UserDetail; canManage: boolean }) => {
  const { mutateAsync: savePermissionsAsync } = useUpdateUserPermissions();

  const [permissions, setPermissions] = useState<UserPermissionMap>(() => buildPermissionMap(user.permissions));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Refs keep autosave race-free: always send the latest state, never two requests at once
  const latestPermissionsRef = useRef(permissions);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isSavingRef = useRef(false);
  const isDirtyRef = useRef(false);

  const flushSave = async () => {
    if (isSavingRef.current || !isDirtyRef.current) return;

    isSavingRef.current = true;
    isDirtyRef.current = false;
    setSaveStatus('saving');

    try {
      await savePermissionsAsync({ userId: user._id, permissions: latestPermissionsRef.current });
      isSavingRef.current = false;
      if (isDirtyRef.current) await flushSave(); // more clicks arrived while saving
      else setSaveStatus('saved');
    } catch (err) {
      isSavingRef.current = false;
      isDirtyRef.current = true;
      setSaveStatus('error');
      toast.error(getErrorText(err, 'Could not save permissions'));
    }
  };

  const applyChange = (next: UserPermissionMap) => {
    setPermissions(next);
    latestPermissionsRef.current = next;
    isDirtyRef.current = true;
    setSaveStatus('saving');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
  };

  // Leaving the page with an unsaved change sends it immediately
  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      if (isDirtyRef.current) void flushSave();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const toggleAction = (moduleKey: string, action: keyof ActionPermission) =>
    applyChange({
      ...permissions,
      [moduleKey]: { ...permissions[moduleKey], [action]: !permissions[moduleKey][action] },
    });

  const toggleModule = (moduleKey: string) => {
    const shouldEnable = !ACTIONS.every(({ key }) => permissions[moduleKey][key]);
    applyChange({
      ...permissions,
      [moduleKey]: { create: shouldEnable, get: shouldEnable, update: shouldEnable, delete: shouldEnable },
    });
  };

  const setAllModules = (shouldEnable: boolean) => {
    const next = { ...permissions };
    PERMISSION_OPTIONS.forEach(({ key }) => {
      next[key] = { create: shouldEnable, get: shouldEnable, update: shouldEnable, delete: shouldEnable };
    });
    applyChange(next);
  };

  const totalActions = PERMISSION_OPTIONS.length * ACTIONS.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-heading">Module access</h2>
          <p className="text-sm text-muted">
            {countEnabledActions(permissions)} of {totalActions} actions allowed for {user.userName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canManage ? (
            <>
              <SaveIndicator status={saveStatus} onRetry={flushSave} />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setAllModules(true)}>
                  Select all
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAllModules(false)}>
                  Clear all
                </Button>
              </div>
            </>
          ) : (
            <span className="text-sm text-muted">View only. Owners, admins and CTOs can change permissions.</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {PERMISSION_OPTIONS.map((option) => (
          <PermissionBox
            key={option.key}
            option={option}
            actions={permissions[option.key]}
            editable={canManage}
            onToggleAction={(action) => toggleAction(option.key, action)}
            onToggleAll={() => toggleModule(option.key)}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Assigned role tab
// ============================================================================
const RoleTab = ({ user }: { user: UserDetail }) => {
  const { currentRole } = useAuthData();
  const roleId = getSpecificRoleId(user);
  const canReadRoles = !!currentRole && (ROLE_READ_ROLES as string[]).includes(currentRole);
  const { data: role, isLoading, isError } = useGetRoleById(canReadRoles ? roleId : undefined);

  const body = !roleId ? (
    <p className="py-10 text-center text-sm text-muted">No custom role is assigned to this user.</p>
  ) : !canReadRoles ? (
    <p className="py-10 text-center text-sm text-muted">Only owners, admins and CTOs can see role details.</p>
  ) : isLoading ? (
    <p className="py-10 text-center text-sm text-muted">Loading role...</p>
  ) : isError || !role ? (
    <p className="py-10 text-center text-sm text-danger">Could not load the assigned role.</p>
  ) : (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold text-heading">{role.name}</h3>
        <p className="text-sm text-muted">{role.description || 'No description added'}</p>
      </div>

      {role.isFullAccess ? (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success px-3 py-1 text-sm font-medium text-white">
          <Check size={14} /> Full access to every module
        </span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {(Array.isArray(role.permissions) ? role.permissions : Object.keys(role.permissions ?? {})).map((key) => (
            <span key={key} className="rounded-full bg-page px-3 py-1 text-sm font-medium text-body">
              {PERMISSION_LABEL_BY_KEY[key] ?? key}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 text-lg font-semibold text-heading">Assigned role</h2>
      {body}
    </section>
  );
};

// ============================================================================
// Page
// ============================================================================
const TABS: { key: TabKey; label: string; icon: typeof UserRound }[] = [
  { key: 'profile', label: 'Profile', icon: UserRound },
  { key: 'permissions', label: 'Permissions', icon: KeyRound },
  { key: 'role', label: 'Assigned role', icon: ShieldCheck },
];

const UserSingle = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentRole } = useAuthData();
  const { data: currentUser } = useUserIsAuthenticated();
  const { data, isLoading, isError, error } = useGetSingleUser(userId);

  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  const user = data as UserDetail | undefined;
  // The update-profile endpoint only edits the signed-in user's own record
  const canEditProfile = !!user && currentUser?._id === user._id;
  const canManagePermissions = !!currentRole && (USER_PERMISSION_MANAGE_ROLES as string[]).includes(currentRole);

  return (
    <div className="flex w-full flex-col gap-5 p-2">
      <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('..')} className="self-start">
        Back to users
      </Button>

      {isLoading ? (
        <p className="py-20 text-center text-sm text-muted">Loading user...</p>
      ) : isError || !user ? (
        <p className="py-20 text-center text-sm text-danger">{getErrorText(error, 'Could not load this user')}</p>
      ) : (
        <>
          <header className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
            <UserAvatar user={user} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-heading">{user.userName}</h1>
              <p className="truncate text-sm text-muted">{user.email || 'No email added'}</p>
              <div className="mt-2 flex items-center gap-2">
                <RoleBadge role={user.role as Exclude<UserRole, null>} />
                <StatusBadge isActive={user.isActive} />
              </div>
            </div>
          </header>

          <div className="flex gap-1 self-start overflow-x-auto rounded-xl border border-border bg-surface p-1" role="tablist">
            {TABS.map(({ key, label, icon: TabIcon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === key ? 'bg-page text-heading' : 'text-muted hover:text-heading'
                }`}
              >
                <TabIcon size={16} />
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'profile' && <ProfileTab user={user} canEdit={canEditProfile} />}
          {activeTab === 'permissions' && (
            <PermissionsTab key={user._id} user={user} canManage={canManagePermissions} />
          )}
          {activeTab === 'role' && <RoleTab user={user} />}
        </>
      )}
    </div>
  );
};

export default UserSingle;
