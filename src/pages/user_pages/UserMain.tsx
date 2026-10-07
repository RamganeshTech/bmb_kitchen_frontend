import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users, Search, Eye, Plus, UserX, UserCheck, Trash2, AlertTriangle, UserCog, MoreVertical } from 'lucide-react';
import type { UserRole } from '../../features/slices/authSlice';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { SideModal } from '../../components/ui/SideModal';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import { useAuthData } from '../../hooks/useAuthData';
import {
  useGetAllUsers,
  useRegisterUser,
  useSoftDeleteUser,
  useRecoverUser,
  useUserIsAuthenticated,
  type UserFilters,
  useDeleteUser,
  useUpdateUserRole,
} from '../../api_service/auth_api/authApi';
import { UserAvatar, RoleBadge, StatusBadge, type UserDetail } from './userShared';
import Modal from '../../components/ui/Modal';
import { Dropdown } from '../../components/ui/Dropdown';

type FilterOption = { label: string; value: string };

type RoleOptions = {
  label: string;
  value: Exclude<UserRole, null>;
};

type UserTab = 'active' | 'inactive';

const ROLE_FILTER_OPTIONS: RoleOptions[] = [
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'CTO', value: 'cto' },
  { label: 'Staff', value: 'staff' },
];

const TAB_CONFIG: Record<UserTab, { label: string; hint: string; emptyTitle: string; emptyHint: string }> = {
  active: {
    label: 'Active',
    hint: 'People who can sign in and use the system.',
    emptyTitle: 'No active users',
    emptyHint: 'Add a user to get your team started.',
  },
  inactive: {
    label: 'Inactive',
    hint: 'Deactivated accounts cannot sign in. Recover an account to give access back.',
    emptyTitle: 'No inactive users',
    emptyHint: 'Deactivated accounts will show up here.',
  },
};

const CREATE_ROLES = ['owner', 'admin', 'cto'];
const MANAGE_ROLES = ['owner', 'admin'];
const COLUMN_COUNT = 7;
const SEARCH_DEBOUNCE_MS = 400;
const MIN_PASSWORD_LENGTH = 6;

// One search box, three backend filters: "@" -> email, digits -> phone, anything else -> name
const buildSearchFilters = (term: string): UserFilters => {
  if (!term) return {};
  if (term.includes('@')) return { email: term };
  if (/^\d+$/.test(term)) return { phoneNo: term };
  return { userName: term };
};

const getErrorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

// ============================================================================
// Create user form (rendered inside the SideModal)
// ============================================================================
const CreateUserForm = ({ organizationId, onClose }: { organizationId: string; onClose: () => void }) => {
  const { mutateAsync: registerUserAsync, isPending } = useRegisterUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleOptions | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) return toast.error('Name is required');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error('Enter a valid email address');
    if (password.length < MIN_PASSWORD_LENGTH) {
      return toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (!role) return toast.error('Choose a role');

    try {
      await registerUserAsync({
        name: name.trim(),
        email: email.trim(),
        password,
        role: role.value,
        organizationId,
      });
      toast.success(`${name.trim()} was added`);
      onClose();
    } catch (err) {
      toast.error(getErrorText(err, 'Could not create the user'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <Label htmlFor="new-user-name">Name</Label>
        <Input
          id="new-user-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Full name"
          autoComplete="off"
          autoFocus
        />
      </div>

      <div>
        <Label htmlFor="new-user-email">Email</Label>
        <Input
          id="new-user-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          autoComplete="off"
        />
      </div>

      <div>
        <Label htmlFor="new-user-password">Password</Label>
        <Input
          id="new-user-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoComplete="new-password"
        />
      </div>

      <SearchSelect
        label="Role"
        options={ROLE_FILTER_OPTIONS}
        value={role?.value ?? ''}
        placeholder="Select a role"
        onChange={(option) => setRole(ROLE_FILTER_OPTIONS.find((item) => item.value === option.value) ?? null)}
        onClear={() => setRole(null)}
      />

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText="Creating...">
          Create user
        </Button>
      </div>
    </form>
  );
};


const EditRoleForm = ({ user, onClose }: { user: UserDetail; onClose: () => void }) => {
  const { mutateAsync: updateRoleAsync, isPending } = useUpdateUserRole();
  const [role, setRole] = useState<RoleOptions | null>(
    ROLE_FILTER_OPTIONS.find((item) => item.value === user.role) ?? null
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!role) return toast.error('Choose a role');
    if (role.value === user.role) return onClose(); // nothing changed

    try {
      await updateRoleAsync({ userId: user._id, role: role.value });
      toast.success(`${user.userName} is now ${role.label}`);
      onClose();
    } catch (err) {
      toast.error(getErrorText(err, 'Could not update the role'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="text-base text-body">
        Change the role for <span className="font-semibold text-heading">{user.userName}</span>. Their other
        details stay as they are.
      </p>

      <SearchSelect
        label="Role"
        options={ROLE_FILTER_OPTIONS}
        value={role?.value ?? ''}
        placeholder="Select a role"
        onChange={(option) => setRole(ROLE_FILTER_OPTIONS.find((item) => item.value === option.value) ?? null)}
        onClear={() => setRole(null)}
      />

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText="Saving...">
          Save role
        </Button>
      </div>
    </form>
  );
};

// ============================================================================
// Page
// ============================================================================
const UserMain = () => {
  const { organizationId, currentRole } = useAuthData();
  const { data: currentUser } = useUserIsAuthenticated();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<UserTab>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<FilterOption | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<UserDetail | null>(null);
  const [recoveringUserId, setRecoveringUserId] = useState<string | null>(null);
  const [userToEditRole, setUserToEditRole] = useState<UserDetail | null>(null);

  const { mutateAsync: deactivateUserAsync, isPending: isDeactivating } = useSoftDeleteUser();
  const { mutateAsync: deleteUserAsync, isPending: isDeleting } = useDeleteUser();
  const [userToDelete, setUserToDelete] = useState<UserDetail | null>(null);

  const { mutateAsync: recoverUserAsync } = useRecoverUser();

  const canCreate = !!currentRole && CREATE_ROLES.includes(currentRole);
  const canManage = !!currentRole && MANAGE_ROLES.includes(currentRole);
  const isActiveTab = activeTab === 'active';
  const tabConfig = TAB_CONFIG[activeTab];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filters: UserFilters = {
    ...buildSearchFilters(debouncedTerm),
    role: roleFilter?.value,
    isActive: isActiveTab,
  };

  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useGetAllUsers({ organizationId: organizationId ?? '', filters });

  // Load the next page when the sentinel below the table scrolls into view
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // The single-user page renders as the child route, in place of the list
  if (location.pathname.includes('/single')) return <Outlet />;

  const users = (data?.pages.flatMap((page) => page.users) ?? []) as UserDetail[];
  const total = data?.pages[0]?.total ?? 0;
  const hasSearchFilters = !!debouncedTerm || !!roleFilter;

  const openUser = (userId: string) => navigate(`single/${userId}`);

  const handleConfirmDeactivate = async (event: FormEvent) => {
    event.preventDefault();
    if (!userToDeactivate) return;
    try {
      await deactivateUserAsync(userToDeactivate._id);
      toast.success(`${userToDeactivate.userName} was deactivated`);
      setUserToDeactivate(null);
    } catch (err) {
      toast.error(getErrorText(err, 'Could not deactivate the user'));
    }
  };

  const handleRecover = async (user: UserDetail) => {
    setRecoveringUserId(user._id);
    try {
      await recoverUserAsync(user._id);
      toast.success(`${user.userName} was recovered`);
    } catch (err) {
      toast.error(getErrorText(err, 'Could not recover the user'));
    } finally {
      setRecoveringUserId(null);
    }
  };


  const handleConfirmDelete = async (event: FormEvent) => {
    event.preventDefault();
    if (!userToDelete) return;
    try {
      await deleteUserAsync(userToDelete._id);
      toast.success(`${userToDelete.userName} was deleted permanently`);
      setUserToDelete(null);
    } catch (err) {
      toast.error(getErrorText(err, 'Could not delete the user'));
    }
  };

  return (
    <div className="flex w-full flex-col gap-5 p-2">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Users size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-heading">Users</h1>
            <p className="text-sm text-muted">
              {isLoading ? 'Loading your team...' : `Showing ${users.length} of ${total} ${tabConfig.label.toLowerCase()} people`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:w-72">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email or phone"
              leftIcon={<Search size={16} />}
              aria-label="Search users"
              autoComplete="off"
            />
          </div>
          <div className="sm:w-44">
            <SearchSelect
              label=""
              options={ROLE_FILTER_OPTIONS}
              value={roleFilter?.value ?? ''}
              placeholder="All roles"
              onChange={(option) => setRoleFilter({ label: option.label, value: String(option.value) })}
              onClear={() => setRoleFilter(null)}
            />
          </div>
          {canCreate && (
            <Button leftIcon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
              New user
            </Button>
          )}
        </div>
      </header>

      {/* Active / Inactive tabs */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 self-start rounded-xl border border-border bg-surface p-1" role="tablist">
          {(Object.keys(TAB_CONFIG) as UserTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`cursor-pointer rounded-lg px-5 py-1.5 text-sm font-medium transition-colors ${activeTab === tab ? 'bg-page text-heading' : 'text-muted hover:text-heading'
                }`}
            >
              {TAB_CONFIG[tab].label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{tabConfig.hint}</p>
      </div>

      <TableContainer ariaLabel={`${tabConfig.label} users`} 
      caption={`${tabConfig.label} users in your organization`}
      className='min-h-[300px] sm:min-h-[500px]'
      >
        <THead>
          <Tr>
            <Th>S.No</Th>
            <Th>User</Th>
            <Th>Email</Th>
            <Th>Phone</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th className='text-center w-20'>Actions</Th>
          </Tr>
        </THead>
        <TBody>
          {isLoading ? (
            <Tr>
              <Td colSpan={COLUMN_COUNT}>
                <p className="py-16 text-center text-sm text-muted">Loading users...</p>
              </Td>
            </Tr>
          ) : isError ? (
            <Tr>
              <Td colSpan={COLUMN_COUNT}>
                <p className="py-16 text-center text-sm text-danger">{getErrorText(error, 'Could not load users')}</p>
              </Td>
            </Tr>
          ) : users.length === 0 ? (
            <Tr>
              <Td colSpan={COLUMN_COUNT}>
                <div className="py-16 text-center">
                  <p className="text-base font-semibold text-heading">
                    {hasSearchFilters ? 'No users match these filters' : tabConfig.emptyTitle}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {hasSearchFilters ? 'Try a different name, email or role.' : tabConfig.emptyHint}
                  </p>
                </div>
              </Td>
            </Tr>
          ) : (
            <>
              {users.map((user, index) => {
                const isSelf = user._id === currentUser?._id;


                const menuItems = [
                  ...(isActiveTab
                    ? [{ label: 'Edit role', icon: <UserCog size={16} />, onClick: () => setUserToEditRole(user) }]
                    : []),
                  ...(canManage && !isActiveTab
                    ? [{
                      label: recoveringUserId === user._id ? 'Recovering...' : 'Recover',
                      icon: <UserCheck size={16} />,
                      onClick: () => handleRecover(user),
                      disabled: recoveringUserId === user._id,
                    }]
                    : []),
                  ...(canManage && isActiveTab && !isSelf
                    ? [{ label: 'Deactivate', icon: <UserX size={16} />, onClick: () => setUserToDeactivate(user), isDanger: true }]
                    : []),
                  ...(canManage && !isSelf
                    ? [{ label: 'Delete', icon: <Trash2 size={16} />, onClick: () => setUserToDelete(user), isDanger: true }]
                    : []),
                ];

                return (
                  <Tr key={user._id} onClick={() => openUser(user._id)} ariaLabel={`Open ${user.userName}`}>
                    <Td>{index + 1}</Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <span className="font-medium text-heading">{user.userName}</span>
                      </div>
                    </Td>
                    <Td>{user.email || '—'}</Td>
                    <Td>{user.phoneNo || '—'}</Td>
                    <Td>
                      <RoleBadge role={user.role as Exclude<UserRole, null>} />
                    </Td>
                    <Td>
                      <StatusBadge isActive={user.isActive} />
                    </Td>
                    <Td>
                      {/* stops dropdown clicks from also opening the row */}
                      <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                        <Button variant="ghost" size="sm" leftIcon={<Eye size={16} />} onClick={() => openUser(user._id)}>
                          View
                        </Button>
                        {menuItems.length > 0 && (
                          <Dropdown
                        align="right"
                        triggerLabel={`More actions for ${user.userName}`}
                        trigger={
                          <span className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-heading">
                            <MoreVertical size={18} />
                          </span>
                        }
                        items={menuItems}
                          />
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
              {isFetchingNextPage && (
                <Tr>
                  <Td colSpan={COLUMN_COUNT}>
                    <p className="py-4 text-center text-sm text-muted">Loading more users...</p>
                  </Td>
                </Tr>
              )}
            </>
          )}
        </TBody>
      </TableContainer>

      {/* Infinite scroll trigger, with a button fallback */}
      {hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center pb-4">
          <Button
            variant="outline"
            size="sm"
            isLoading={isFetchingNextPage}
            loadingText="Loading..."
            onClick={() => fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      )}

      {/* Create user */}
      <SideModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add user">
        <CreateUserForm organizationId={organizationId ?? ''} onClose={() => setIsCreateOpen(false)} />
      </SideModal>

      <SideModal isOpen={!!userToEditRole} onClose={() => setUserToEditRole(null)} title="Edit role">
        {userToEditRole && <EditRoleForm key={userToEditRole._id} user={userToEditRole} onClose={() => setUserToEditRole(null)} />}
      </SideModal>

      {/* Deactivate user */}
      {/* <SideModal isOpen={!!userToDeactivate} onClose={() => setUserToDeactivate(null)} title="Deactivate user">
        <form onSubmit={handleConfirmDeactivate} className="flex flex-col gap-5">
          <p className="text-base text-body">
            <span className="font-semibold text-heading">{userToDeactivate?.userName}</span> will no longer be able to
            sign in. Their data is kept, and you can recover the account any time from the Inactive tab.
          </p>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => setUserToDeactivate(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isDeactivating} loadingText="Deactivating...">
              Deactivate user
            </Button>
          </div>
        </form>
      </SideModal>


      <SideModal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Delete user permanently">
        <form onSubmit={handleConfirmDelete} className="flex flex-col gap-5">
          <p className="text-base text-body">
            <span className="font-semibold text-heading">{userToDelete?.userName}</span> will be removed for good
            and cannot be recovered. If you only want to stop them signing in, use Deactivate instead.
          </p>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => setUserToDelete(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isDeleting} loadingText="Deleting...">
              Delete user
            </Button>
          </div>
        </form>
      </SideModal>
       */}


      <Modal isOpen={!!userToDeactivate} onClose={() => setUserToDeactivate(null)} title="Deactivate user">
        <form onSubmit={handleConfirmDeactivate} className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-page text-danger">
              <AlertTriangle size={20} />
            </span>
            <p className="text-base text-body">
              <span className="font-semibold text-heading">{userToDeactivate?.userName}</span> will no longer be able
              to sign in. Their data is kept, and you can recover the account any time from the Inactive tab.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => setUserToDeactivate(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isDeactivating} loadingText="Deactivating...">
              Deactivate user
            </Button>
          </div>
        </form>
      </Modal>


      <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Delete user permanently">
        <form onSubmit={handleConfirmDelete} className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-page text-danger">
              <AlertTriangle size={20} />
            </span>
            <p className="text-base text-body">
              <span className="font-semibold text-heading">{userToDelete?.userName}</span> will be removed for good
              and cannot be recovered. If you only want to stop them signing in, use Deactivate instead.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => setUserToDelete(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isDeleting} loadingText="Deleting...">
              Delete user
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserMain;