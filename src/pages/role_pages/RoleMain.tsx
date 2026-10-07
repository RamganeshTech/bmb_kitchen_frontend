import { useState, type ComponentType, type FormEvent } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Pencil,
  Eye,
  Trash2,
  RotateCcw,
  Ban,
  MoreVertical,
  Lock,
  ShoppingCart,
  ChefHat,
  LayoutGrid,
  Smartphone,
  UtensilsCrossed,
  Percent,
  XCircle,
  BarChart3,
  Package,
  Users,
  Settings,
  Store,
  Check,
} from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SideModal } from '../../components/ui/SideModal';
import { Dropdown } from '../../components/ui/Dropdown';
import { useAuthData } from '../../hooks/useAuthData';
import {
  ROLE_READ_ROLES,
  ROLE_WRITE_ROLES,
  useGetActiveRoles,
  useGetInactiveRoles,
  useGetRoleById,
  useCreateRole,
  useUpdateRole,
  useDeactivateRole,
  useRestoreRole,
  useHardDeleteRole,
  type RoleItem,
} from '../../api_service/role_api/roleApi';

// ── Permission catalog (keys must match PERMISSION_KEYS on the backend) ─────
interface PermissionOption {
  key: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
}

const PERMISSION_OPTIONS: PermissionOption[] = [
  { key: 'pos', label: 'POS billing', description: 'Create orders and take payments', icon: ShoppingCart },
  { key: 'kot', label: 'Kitchen (KOT)', description: 'See tickets and update item status', icon: ChefHat },
  { key: 'tables', label: 'Tables', description: 'Manage table status and reservations', icon: LayoutGrid },
  { key: 'captain', label: 'Captain ordering', description: 'Take orders from the floor', icon: Smartphone },
  { key: 'menu', label: 'Menu', description: 'Edit categories, items and prices', icon: UtensilsCrossed },
  { key: 'discount', label: 'Discounts', description: 'Apply offers and manual discounts', icon: Percent },
  { key: 'cancel', label: 'Cancel orders', description: 'Cancel running or billed orders', icon: XCircle },
  { key: 'reports', label: 'Reports', description: 'View sales and finance reports', icon: BarChart3 },
  { key: 'closing', label: 'Day closing', description: 'Close and reopen the day', icon: Lock },
  { key: 'inventory', label: 'Inventory', description: 'Stock, purchases and wastage', icon: Package },
  { key: 'staff', label: 'Staff', description: 'Add staff and assign roles', icon: Users },
  { key: 'settings', label: 'Settings', description: 'Tax, printers and integrations', icon: Settings },
  { key: 'outlets', label: 'Outlets', description: 'Manage outlets and transfers', icon: Store },
];

const PERMISSION_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  PERMISSION_OPTIONS.map((option) => [option.key, option.label])
);

const CARD_PERMISSION_PREVIEW_COUNT = 5;

// ── Helpers ─────────────────────────────────────────────────────────────────
const getPermissionKeys = (role: RoleItem): string[] => {
  const raw = role.permissions;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return Object.keys(raw).filter((key) => Boolean(raw[key]));
};

const matchesSearch = (role: RoleItem, searchTerm: string) => {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  return (
    role.name.toLowerCase().includes(term) ||
    (role.description ?? '').toLowerCase().includes(term)
  );
};

const getErrorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

// ── Modal state ─────────────────────────────────────────────────────────────
type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'view'; roleId: string }
  | { mode: 'edit'; roleId: string };

// ============================================================================
// Role card
// ============================================================================
interface RoleCardProps {
  role: RoleItem;
  canWrite: boolean;
  onView: () => void;
  menuItems: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    isDanger?: boolean;
    disabled?: boolean;
  }[];
}

const RoleCard = ({ role, canWrite, onView, menuItems }: RoleCardProps) => {
  const permissionKeys = getPermissionKeys(role);
  const previewKeys = permissionKeys.slice(0, CARD_PERMISSION_PREVIEW_COUNT);
  const hiddenCount = permissionKeys.length - previewKeys.length;

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <ShieldCheck size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-heading">{role.name}</h3>
          <p className="mt-0.5 line-clamp-2 min-h-10 text-sm text-muted">
            {role.description || 'No description added'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex-1">
        {role.isFullAccess ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-sm font-medium text-white">
            <Check size={14} />
            Full access to every module
          </span>
        ) : permissionKeys.length === 0 ? (
          <span className="text-sm text-muted">No permissions assigned</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {previewKeys.map((key) => (
              <span
                key={key}
                className="rounded-full bg-page px-2.5 py-1 text-xs font-medium text-body"
              >
                {PERMISSION_LABEL_BY_KEY[key] ?? key}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-text">
                +{hiddenCount} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-4">
        <span className="text-sm text-muted">
          {role.isFullAccess
            ? 'All permissions'
            : `${permissionKeys.length} of ${PERMISSION_OPTIONS.length} permissions`}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" leftIcon={<Eye size={16} />} onClick={onView}>
            View
          </Button>
          {canWrite && (
            <Dropdown
              align="right"
              triggerLabel={`More actions for ${role.name}`}
              trigger={
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-heading">
                  <MoreVertical size={18} />
                </span>
              }
              items={menuItems}
            />
          )}
        </div>
      </div>
    </article>
  );
};

// ============================================================================
// Shared grid pieces
// ============================================================================
const RoleCardSkeletons = () => (
  <>
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="h-52 animate-pulse rounded-2xl border border-border bg-surface"
        aria-hidden="true"
      />
    ))}
  </>
);

const GridMessage = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 text-center">
    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
      <ShieldCheck size={22} />
    </span>
    <p className="text-lg font-semibold text-heading">{title}</p>
    {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
  </div>
);

// ============================================================================
// Active tab (uses only the active list + deactivate hooks)
// ============================================================================
interface TabProps {
  searchTerm: string;
  canWrite: boolean;
  onView: (roleId: string) => void;
  onEdit: (roleId: string) => void;
}

const ActiveRolesTab = ({ searchTerm, canWrite, onView, onEdit }: TabProps) => {
  const { data: roles = [], isLoading, isError, error } = useGetActiveRoles();
  const { mutateAsync: deactivateRoleAsync, isPending: isDeactivating } = useDeactivateRole();

  const visibleRoles = roles.filter((role) => matchesSearch(role, searchTerm));

  const handleDeactivate = async (role: RoleItem) => {
    try {
      await deactivateRoleAsync(role._id);
      toast.success(`${role.name} was deactivated`);
    } catch (err) {
      toast.error(getErrorText(err, 'Could not deactivate the role'));
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {isLoading ? (
        <RoleCardSkeletons />
      ) : isError ? (
        <GridMessage title="Could not load roles" hint={getErrorText(error, 'Please try again')} />
      ) : visibleRoles.length === 0 ? (
        <GridMessage
          title={searchTerm ? 'No roles match your search' : 'No roles yet'}
          hint={searchTerm ? 'Try a different name' : 'Create a role to control what each staff member can do'}
        />
      ) : (
        visibleRoles.map((role) => (
          <RoleCard
            key={role._id}
            role={role}
            canWrite={canWrite}
            onView={() => onView(role._id)}
            menuItems={[
              { label: 'Edit role', icon: <Pencil size={16} />, onClick: () => onEdit(role._id) },
              {
                label: 'Deactivate',
                icon: <Ban size={16} />,
                onClick: () => handleDeactivate(role),
                isDanger: true,
                disabled: isDeactivating,
              },
            ]}
          />
        ))
      )}
    </div>
  );
};

// ============================================================================
// Inactive tab (uses only the inactive list + restore + hard delete hooks)
// ============================================================================
const InactiveRolesTab = ({ searchTerm, canWrite, onView }: Omit<TabProps, 'onEdit'>) => {
  const { data: roles = [], isLoading, isError, error } = useGetInactiveRoles();
  const { mutateAsync: restoreRoleAsync, isPending: isRestoring } = useRestoreRole();
  const { mutateAsync: hardDeleteRoleAsync, isPending: isDeleting } = useHardDeleteRole();
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);

  const visibleRoles = roles.filter((role) => matchesSearch(role, searchTerm));

  const handleRestore = async (role: RoleItem) => {
    try {
      await restoreRoleAsync(role._id);
      toast.success(`${role.name} was restored`);
    } catch (err) {
      toast.error(getErrorText(err, 'Could not restore the role'));
    }
  };

  const handleConfirmDelete = async (event: FormEvent) => {
    event.preventDefault();
    if (!roleToDelete) return;
    try {
      await hardDeleteRoleAsync(roleToDelete._id);
      toast.success(`${roleToDelete.name} was deleted permanently`);
      setRoleToDelete(null);
    } catch (err) {
      // Backend blocks deletion while staff are still assigned to this role
      toast.error(getErrorText(err, 'Could not delete the role'));
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {isLoading ? (
          <RoleCardSkeletons />
        ) : isError ? (
          <GridMessage title="Could not load roles" hint={getErrorText(error, 'Please try again')} />
        ) : visibleRoles.length === 0 ? (
          <GridMessage
            title={searchTerm ? 'No roles match your search' : 'No inactive roles'}
            hint={searchTerm ? 'Try a different name' : 'Deactivated roles show up here'}
          />
        ) : (
          visibleRoles.map((role) => (
            <RoleCard
              key={role._id}
              role={role}
              canWrite={canWrite}
              onView={() => onView(role._id)}
              menuItems={[
                {
                  label: 'Restore',
                  icon: <RotateCcw size={16} />,
                  onClick: () => handleRestore(role),
                  disabled: isRestoring,
                },
                {
                  label: 'Delete permanently',
                  icon: <Trash2 size={16} />,
                  onClick: () => setRoleToDelete(role),
                  isDanger: true,
                },
              ]}
            />
          ))
        )}
      </div>

      <SideModal
        isOpen={!!roleToDelete}
        onClose={() => setRoleToDelete(null)}
        title="Delete role permanently"
      >
        <form onSubmit={handleConfirmDelete} className="flex flex-col gap-5">
          <p className="text-base text-body">
            <span className="font-semibold text-heading">{roleToDelete?.name}</span> will be
            removed for good and cannot be restored. If any staff member still has this role, the
            delete will be blocked until you reassign them.
          </p>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => setRoleToDelete(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isDeleting} loadingText="Deleting...">
              Delete role
            </Button>
          </div>
        </form>
      </SideModal>
    </>
  );
};

// ============================================================================
// View panel
// ============================================================================
const RoleViewPanel = ({ roleId, onClose }: { roleId: string; onClose: () => void }) => {
  const { data: role, isLoading, isError } = useGetRoleById(roleId);

  if (isLoading) return <p className="py-10 text-center text-sm text-muted">Loading role...</p>;
  if (isError || !role) return <p className="py-10 text-center text-sm text-danger">Could not load this role.</p>;

  const grantedKeys = new Set(getPermissionKeys(role));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-xl font-semibold text-heading">{role.name}</h3>
        <p className="mt-1 text-sm text-muted">{role.description || 'No description added'}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PERMISSION_OPTIONS.map((option) => {
          const isGranted = role.isFullAccess || grantedKeys.has(option.key);
          const Icon = option.icon;
          return (
            <div
              key={option.key}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                isGranted ? 'border-primary bg-primary-soft' : 'border-border bg-surface opacity-60'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isGranted ? 'bg-primary text-white' : 'bg-page text-muted'
                }`}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-heading">{option.label}</p>
                <p className="text-xs text-muted">{option.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Create / edit form
// ============================================================================
interface RoleFormProps {
  initialRole?: RoleItem;
  onClose: () => void;
}

const RoleForm = ({ initialRole, onClose }: RoleFormProps) => {
  const isEditMode = !!initialRole;
  const { mutateAsync: createRoleAsync, isPending: isCreating } = useCreateRole();
  const { mutateAsync: updateRoleAsync, isPending: isUpdating } = useUpdateRole();

  const [name, setName] = useState(initialRole?.name ?? '');
  const [description, setDescription] = useState(initialRole?.description ?? '');
  const [isFullAccess, setIsFullAccess] = useState(initialRole?.isFullAccess ?? false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    initialRole ? getPermissionKeys(initialRole) : []
  );

  const togglePermission = (key: string) =>
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error('Role name is required');
      return;
    }
    if (!isFullAccess && selectedKeys.length === 0) {
      toast.error('Pick at least one permission or turn on full access');
      return;
    }

    const payload = {
      name: trimmedName,
      description: description.trim(),
      isFullAccess,
      permissions: isFullAccess ? [] : selectedKeys,
    };

    try {
      if (initialRole) {
        await updateRoleAsync({ id: initialRole._id, payload });
        toast.success('Role updated');
      } else {
        await createRoleAsync(payload);
        toast.success('Role created');
      }
      onClose();
    } catch (err) {
      toast.error(getErrorText(err, 'Could not save the role'));
    }
  };

  const allSelected = selectedKeys.length === PERMISSION_OPTIONS.length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <Label htmlFor="role-name">Role name</Label>
        <Input
          id="role-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Cashier, Captain, Store manager"
          autoFocus
        />
      </div>

      <div>
        <Label htmlFor="role-description">Description</Label>
        <textarea
          id="role-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          placeholder="What is this role for?"
          className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-base text-heading placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isFullAccess}
        onClick={() => setIsFullAccess((current) => !current)}
        className={`flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors ${
          isFullAccess ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-hover'
        }`}
      >
        <span>
          <span className="block text-base font-semibold text-heading">Full access</span>
          <span className="block text-sm text-muted">
            Can use every module, including ones added later. Individual permissions are ignored.
          </span>
        </span>
        <span
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            isFullAccess ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              isFullAccess ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>

      <div className={isFullAccess ? 'pointer-events-none opacity-50' : ''}>
        <div className="mb-2 flex items-center justify-between">
          <Label>Permissions ({isFullAccess ? PERMISSION_OPTIONS.length : selectedKeys.length} selected)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedKeys(allSelected ? [] : PERMISSION_OPTIONS.map((option) => option.key))}
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PERMISSION_OPTIONS.map((option) => {
            const isSelected = isFullAccess || selectedKeys.includes(option.key);
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => togglePermission(option.key)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  isSelected ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isSelected ? 'bg-primary text-white' : 'bg-page text-muted'
                  }`}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-heading">{option.label}</span>
                  <span className="block text-xs text-muted">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isCreating || isUpdating} loadingText="Saving...">
          {isEditMode ? 'Save changes' : 'Create role'}
        </Button>
      </div>
    </form>
  );
};

// Loads the role first so the form always starts from fresh server data
const RoleEditLoader = ({ roleId, onClose }: { roleId: string; onClose: () => void }) => {
  const { data: role, isLoading, isError } = useGetRoleById(roleId);

  if (isLoading) return <p className="py-10 text-center text-sm text-muted">Loading role...</p>;
  if (isError || !role) return <p className="py-10 text-center text-sm text-danger">Could not load this role.</p>;

  return <RoleForm key={role._id} initialRole={role} onClose={onClose} />;
};

// ============================================================================
// Page
// ============================================================================
const RoleMain = () => {
  const { currentRole } = useAuthData();
  const canRead = !!currentRole && (ROLE_READ_ROLES as string[]).includes(currentRole);
  const canWrite = !!currentRole && (ROLE_WRITE_ROLES as string[]).includes(currentRole);

  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' });

  const closeModal = () => setModal({ mode: 'closed' });

  const modalTitle =
    modal.mode === 'create' ? 'Create role' : modal.mode === 'edit' ? 'Edit role' : 'Role details';

  if (!canRead) {
    return (
      <div className="w-full p-2">
        <GridMessage
          title="You don't have access to roles"
          hint="Ask an owner or admin to manage roles and permissions."
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5 p-2">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-heading">Roles & permissions</h1>
            <p className="text-sm text-muted">Decide what each member of your team can see and do</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search roles"
              className="pl-9"
              aria-label="Search roles"
            />
          </div>
          {canWrite && (
            <Button leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })}>
              New role
            </Button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 self-start rounded-xl border border-border bg-surface p-1" role="tablist">
        {(['active', 'inactive'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-page text-heading' : 'text-muted hover:text-heading'
            }`}
          >
            {tab === 'active' ? 'Active' : 'Inactive'}
          </button>
        ))}
      </div>

      {/* Cards */}
      {activeTab === 'active' ? (
        <ActiveRolesTab
          searchTerm={searchTerm}
          canWrite={canWrite}
          onView={(roleId) => setModal({ mode: 'view', roleId })}
          onEdit={(roleId) => setModal({ mode: 'edit', roleId })}
        />
      ) : (
        <InactiveRolesTab
          searchTerm={searchTerm}
          canWrite={canWrite}
          onView={(roleId) => setModal({ mode: 'view', roleId })}
        />
      )}

      {/* Create / edit / view */}
      <SideModal isOpen={modal.mode !== 'closed'} onClose={closeModal} title={modalTitle}>
        {modal.mode === 'create' && <RoleForm onClose={closeModal} />}
        {modal.mode === 'edit' && <RoleEditLoader roleId={modal.roleId} onClose={closeModal} />}
        {modal.mode === 'view' && <RoleViewPanel roleId={modal.roleId} onClose={closeModal} />}
      </SideModal>
    </div>
  );
};

export default RoleMain;