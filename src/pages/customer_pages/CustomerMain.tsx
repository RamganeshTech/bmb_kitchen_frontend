import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Users, Plus, Search, SlidersHorizontal, X,
  Pencil, Eye, Power, RotateCcw, Trash2, MoreVertical, AlertTriangle,
} from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { Dropdown } from '../../components/ui/Dropdown';
import {SideModal} from '../../components/ui/SideModal';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import { useAuthData } from '../../hooks/useAuthData';
import {
  CUSTOMER_CREATE_ROLES, CUSTOMER_UPDATE_ROLES, CUSTOMER_INACTIVE_READ_ROLES, CUSTOMER_ADMIN_WRITE_ROLES,
  useGetActiveCustomers, useGetInactiveCustomers, useGetCustomerById, useCreateCustomer, useUpdateCustomer,
  useSoftDeleteCustomer, useRecoverCustomer, useHardDeleteCustomer,
} from '../../api_service/customer_api/customerApi';
import type { CustomerItem, CustomerPayload } from '../../api_service/customer_api/customerApi';

// ── Types & helpers ──────────────────────────────────────────────────────────
type Tab = 'active' | 'inactive';
type Panel = { type: 'create' } | { type: 'view'; id: string } | { type: 'edit'; id: string } | null;
type Confirm = { kind: 'deactivate' | 'hard'; item: CustomerItem } | null;

const EMAIL_OPTIONS = [
  { label: 'With email', value: 'with' },
  { label: 'Without email', value: 'without' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fmtDate = (d: string) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

// Lists are fetched without query params, so search and filters run on the client
const filterCustomers = (list: CustomerItem[], search: string, emailFilter: string) => {
  const q = search.trim().toLowerCase();
  return list.filter((c) => {
    if (emailFilter === 'with' && !c.email) return false;
    if (emailFilter === 'without' && c.email) return false;
    if (!q) return true;
    return [c.name, c.phone, c.email, c.customerNo].some((f) => String(f ?? '').toLowerCase().includes(q));
  });
};

// ── Small building blocks ────────────────────────────────────────────────────
const Field = ({ label, error, children }: { label?: string; error?: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    {label && <Label>{label}</Label>}
    {children}
    {error && <p className="text-sm text-danger">{error}</p>}
  </div>
);

const Detail = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
    <span className="text-base text-muted">{label}</span>
    <span className="text-right text-base font-medium text-heading">{value || '—'}</span>
  </div>
);

const IconAction = ({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface transition-colors ${
      danger ? 'text-danger hover:bg-danger-soft' : 'text-body hover:bg-surface-hover hover:text-heading'
    }`}
  >
    {children}
  </button>
);

const ConfirmDialog = ({
  confirm,
  isPending,
  onCancel,
  onConfirm,
}: {
  confirm: NonNullable<Confirm>;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const hard = confirm.kind === 'hard';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full rounded-xl border border-border bg-surface p-6 shadow-xl sm:w-[440px]">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-danger-soft p-2 text-danger">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-heading">{hard ? 'Delete permanently?' : 'Deactivate customer?'}</h3>
            <p className="mt-1 text-base text-body">
              {hard
                ? `"${confirm.item.name}" will be removed for good. This cannot be undone.`
                : `"${confirm.item.name}" will move to the Inactive tab. You can restore them any time.`}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isPending} loadingText="Working...">
            {hard ? 'Delete permanently' : 'Deactivate'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Create / Edit form ───────────────────────────────────────────────────────
interface FormState {
  name: string;
  phone: string;
  email: string;
}

const CustomerForm = ({
  initial,
  isEdit,
  isPending,
  onSubmit,
  onCancel,
}: {
  initial?: CustomerItem;
  isEdit: boolean;
  isPending: boolean;
  onSubmit: (payload: CustomerPayload) => Promise<void>;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = (key: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = 'Customer name is required';
    if (!form.phone) e.phone = 'Phone number is required';
    else if (form.phone.length !== 10) e.phone = 'Phone number must be 10 digits';
    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) e.email = 'Enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const payload: CustomerPayload = { name: form.name.trim(), phone: form.phone };
    // On create, skip an empty email; on edit, send it so it can be cleared
    const email = form.email.trim();
    if (email || isEdit) payload.email = email;
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Customer name *" error={errors.name}>
        <Input value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Full name" />
      </Field>

      <Field label="Phone *" error={errors.phone}>
        <Input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={form.phone}
          onChange={(e) => set('phone')(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit mobile number"
        />
      </Field>

      <Field label="Email" error={errors.email}>
        <Input type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} placeholder="name@example.com" />
      </Field>

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText={isEdit ? 'Saving...' : 'Creating...'}>
          {isEdit ? 'Save changes' : 'Create customer'}
        </Button>
      </div>
    </form>
  );
};

// ── Panels that load a single customer ───────────────────────────────────────
const PanelMessage = ({ text, error }: { text: string; error?: boolean }) => (
  <p className={`py-10 text-center text-base ${error ? 'text-danger' : 'text-muted'}`}>{text}</p>
);

const ViewPanel = ({ id }: { id: string }) => {
  const { data: customer, isLoading, error } = useGetCustomerById(id);
  if (isLoading) return <PanelMessage text="Loading customer..." />;
  if (error || !customer) return <PanelMessage error text={(error as Error)?.message || 'Customer not found'} />;
  return (
    <div className="flex flex-col gap-4">
      <div>
        {customer.customerNo && <p className="text-sm text-muted">{customer.customerNo}</p>}
        <h3 className="text-xl font-semibold text-heading">{customer.name}</h3>
      </div>
      <div>
        <Detail label="Phone" value={customer.phone} />
        <Detail label="Email" value={customer.email} />
        <Detail label="Status" value={customer.isActive === false || customer.isDeleted ? 'Inactive' : 'Active'} />
        <Detail label="Created" value={fmtDate(customer.createdAt)} />
        <Detail label="Last updated" value={fmtDate(customer.updatedAt)} />
      </div>
    </div>
  );
};

const EditPanel = ({
  id,
  isPending,
  onSubmit,
  onCancel,
}: {
  id: string;
  isPending: boolean;
  onSubmit: (payload: CustomerPayload) => Promise<void>;
  onCancel: () => void;
}) => {
  const { data: customer, isLoading, error } = useGetCustomerById(id);
  if (isLoading) return <PanelMessage text="Loading customer..." />;
  if (error || !customer) return <PanelMessage error text={(error as Error)?.message || 'Customer not found'} />;
  return <CustomerForm key={customer._id} initial={customer} isEdit isPending={isPending} onSubmit={onSubmit} onCancel={onCancel} />;
};

// ── List rendering (shared by both tabs) ─────────────────────────────────────
interface RowActions {
  canUpdate: boolean;
  canAdminWrite: boolean;
  onView: (item: CustomerItem) => void;
  onEdit: (item: CustomerItem) => void;
  onDeactivate: (item: CustomerItem) => void;
  onRestore: (item: CustomerItem) => void;
  onHardDelete: (item: CustomerItem) => void;
}

type ActionDef = { label: string; icon: LucideIcon; onClick: () => void; isDanger?: boolean };

const ActionButtons = ({ item, inactive, a }: { item: CustomerItem; inactive: boolean; a: RowActions }) => {
  const view: ActionDef = { label: 'View details', icon: Eye, onClick: () => a.onView(item) };

  const rest: ActionDef[] = [];
  if (!inactive && a.canUpdate) rest.push({ label: 'Edit customer', icon: Pencil, onClick: () => a.onEdit(item) });
  if (!inactive && a.canAdminWrite) rest.push({ label: 'Deactivate customer', icon: Power, onClick: () => a.onDeactivate(item), isDanger: true });
  if (inactive && a.canAdminWrite) rest.push({ label: 'Restore customer', icon: RotateCcw, onClick: () => a.onRestore(item) });
  if (inactive && a.canAdminWrite) rest.push({ label: 'Delete permanently', icon: Trash2, onClick: () => a.onHardDelete(item), isDanger: true });

  // More than two actions: only View stays inline, everything else goes in the dropdown
  const collapse = rest.length + 1 > 2;
  const inline = collapse ? [view] : [view, ...rest];

  return (
    <div className="flex items-center gap-1.5">
      {inline.map(({ label, icon: Icon, onClick, isDanger }) => (
        <IconAction key={label} label={label} danger={isDanger} onClick={onClick}>
          <Icon size={18} />
        </IconAction>
      ))}
      {collapse && (
        <Dropdown
          align="right"
          triggerLabel="More actions"
          trigger={
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-body transition-colors hover:bg-surface-hover hover:text-heading">
              <MoreVertical size={18} />
            </span>
          }
          items={rest.map(({ label, icon: Icon, onClick, isDanger }) => ({
            label,
            icon: <Icon size={16} />,
            onClick,
            isDanger,
          }))}
        />
      )}
    </div>
  );
};

const ListContent = ({
  items,
  isLoading,
  error,
  inactive,
  actions,
}: {
  items: CustomerItem[];
  isLoading: boolean;
  error: Error | null;
  inactive: boolean;
  actions: RowActions;
}) => {
  const fallback = isLoading
    ? { text: 'Loading customers...', sub: '', danger: false }
    : error
      ? { text: error.message, sub: '', danger: true }
      : items.length === 0
        ? {
            text: inactive ? 'No inactive customers' : 'No customers found',
            sub: inactive ? 'Deactivated customers will show up here.' : 'Add a customer or adjust your filters.',
            danger: false,
          }
        : null;

  return (
    <TableContainer
      className="rounded-none border-0 shadow-none !min-h-[300px]"
      ariaLabel={inactive ? 'Inactive customers' : 'Active customers'}
      caption={inactive ? 'List of inactive customers' : 'List of active customers'}
    >
      <THead className="text-sm">
        <tr>
          <Th>S.No</Th>
          <Th>Customer</Th>
          <Th>Phone</Th>
          <Th>Email</Th>
          <Th>Created</Th>
          <Th>Actions</Th>
        </tr>
      </THead>
      <TBody>
        {fallback ? (
          <Tr>
            <Td colSpan={6} className="py-16 text-center">
              {!fallback.danger && !isLoading && <Users size={32} className="mx-auto mb-2 text-muted" />}
              <p className={`text-base font-medium ${fallback.danger ? 'text-danger' : 'text-heading'}`}>{fallback.text}</p>
              {fallback.sub && <p className="mt-1 text-base text-muted">{fallback.sub}</p>}
            </Td>
          </Tr>
        ) : (
          items.map((item, idx) => (
            <Tr key={item._id} onClick={() => actions.onView(item)} ariaLabel={`View customer: ${item.name}`}>
              <Td className="text-base text-heading">{idx + 1}</Td>
              <Td className="text-base">
                <p className="font-medium text-heading">{item.name}</p>
                {item.customerNo && <p className="text-sm text-muted">{item.customerNo}</p>}
              </Td>
              <Td className="text-base">{item.phone || '—'}</Td>
              <Td className="text-base">{item.email || '—'}</Td>
              <Td className="text-base text-muted">{fmtDate(item.createdAt)}</Td>
              <Td>
                {/* Keep clicks and keys on action buttons from also opening the row */}
                <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <ActionButtons item={item} inactive={inactive} a={actions} />
                </div>
              </Td>
            </Tr>
          ))
        )}
      </TBody>
    </TableContainer>
  );
};

// Each tab owns its hook so the inactive endpoint is never called for roles that can't read it
type TabProps = { search: string; emailFilter: string; actions: RowActions };

const ActiveTab = ({ search, emailFilter, actions }: TabProps) => {
  const { data = [], isLoading, error } = useGetActiveCustomers();
  return <ListContent items={filterCustomers(data, search, emailFilter)} isLoading={isLoading} error={error as Error | null} inactive={false} actions={actions} />;
};

const InactiveTab = ({ search, emailFilter, actions }: TabProps) => {
  const { data = [], isLoading, error } = useGetInactiveCustomers();
  return <ListContent items={filterCustomers(data, search, emailFilter)} isLoading={isLoading} error={error as Error | null} inactive actions={actions} />;
};

// ── Main page ────────────────────────────────────────────────────────────────
const CustomerMain = () => {
  const { currentRole } = useAuthData();
  const role = currentRole as never;
  const canCreate = CUSTOMER_CREATE_ROLES.includes(role);
  const canUpdate = CUSTOMER_UPDATE_ROLES.includes(role);
  const canAdminWrite = CUSTOMER_ADMIN_WRITE_ROLES.includes(role);
  const canSeeInactive = CUSTOMER_INACTIVE_READ_ROLES.includes(role);

  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const { mutateAsync: createAsync, isPending: creating } = useCreateCustomer();
  const { mutateAsync: updateAsync, isPending: updating } = useUpdateCustomer();
  const { mutateAsync: softDeleteAsync, isPending: deactivating } = useSoftDeleteCustomer();
  const { mutateAsync: recoverAsync } = useRecoverCustomer();
  const { mutateAsync: hardDeleteAsync, isPending: hardDeleting } = useHardDeleteCustomer();

  const closePanel = () => setPanel(null);
  const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

  const handleCreate = async (payload: CustomerPayload) => {
    try {
      await createAsync(payload);
      toast.success('Customer created');
      closePanel();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to create customer'));
    }
  };

  const handleUpdate = async (id: string, payload: CustomerPayload) => {
    try {
      await updateAsync({ id, data: payload });
      toast.success('Customer updated');
      closePanel();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to update customer'));
    }
  };

  const handleRestore = async (item: CustomerItem) => {
    try {
      await recoverAsync(item._id);
      toast.success(`${item.name} restored`);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to restore customer'));
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const { kind, item } = confirm;
    try {
      if (kind === 'deactivate') {
        await softDeleteAsync(item._id);
        toast.success(`${item.name} deactivated`);
      } else {
        await hardDeleteAsync(item._id);
        toast.success(`${item.name} deleted permanently`);
      }
      setConfirm(null);
    } catch (e) {
      toast.error(errMsg(e, kind === 'deactivate' ? 'Failed to deactivate customer' : 'Failed to delete customer'));
    }
  };

  const actions: RowActions = {
    canUpdate,
    canAdminWrite,
    onView: (item) => setPanel({ type: 'view', id: item._id }),
    onEdit: (item) => setPanel({ type: 'edit', id: item._id }),
    onDeactivate: (item) => setConfirm({ kind: 'deactivate', item }),
    onRestore: handleRestore,
    onHardDelete: (item) => setConfirm({ kind: 'hard', item }),
  };

  const activeFilters = emailFilter ? 1 : 0;
  const clearFilters = () => {
    setSearch('');
    setEmailFilter('');
  };

  const panelTitle = panel?.type === 'create' ? 'Add customer' : panel?.type === 'edit' ? 'Edit customer' : 'Customer details';
  const tabProps: TabProps = { search, emailFilter, actions };

  return (
    <div className="flex w-full flex-col gap-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Users size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-heading">Customers</h1>
            <p className="text-sm text-muted">Manage your customers and their contact details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="lg:hidden" leftIcon={<SlidersHorizontal size={16} />} onClick={() => setShowFilters(true)}>
            Filters{activeFilters ? ` (${activeFilters})` : ''}
          </Button>
          {canCreate && (
            <Button leftIcon={<Plus size={16} />} onClick={() => setPanel({ type: 'create' })}>
              Add customer
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Filters: narrow fixed width on desktop, slide-in drawer on mobile */}
        {showFilters && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setShowFilters(false)} />}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[85%] overflow-y-auto bg-page p-4 shadow-xl transition-transform duration-200 sm:w-80 lg:static lg:z-auto lg:w-64 lg:shrink-0 lg:translate-x-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
            showFilters ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col gap-5 rounded-xl border border-border bg-page p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-heading">Filters</h2>
              <div className="flex items-center gap-3">
                {(activeFilters > 0 || search) && (
                  <button type="button" onClick={clearFilters} className="text-sm font-medium text-primary hover:text-primary-hover">
                    Clear all
                  </button>
                )}
                <button type="button" aria-label="Close filters" className="text-muted lg:hidden" onClick={() => setShowFilters(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <Field label="Search">
              <div className="relative">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone or email" />
              </div>
            </Field>
            <SearchSelect
              label="Email"
              options={EMAIL_OPTIONS}
              value={emailFilter}
              placeholder="All customers"
              onChange={(o) => setEmailFilter(String(o.value))}
              onClear={() => setEmailFilter('')}
            />
            <div className="lg:hidden">
              <Button fullWidth onClick={() => setShowFilters(false)}>
                Show results
              </Button>
            </div>
          </div>
        </aside>

        {/* Table area takes the remaining width */}
        <section className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {canSeeInactive && (
              <div className="flex gap-1 border-b border-border px-3 pt-2">
                {(['active', 'inactive'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`-mb-px border-b-2 px-5 py-2.5 text-base font-medium transition-colors ${
                      tab === t ? 'border-primary font-semibold text-heading' : 'border-transparent text-muted hover:text-heading'
                    }`}
                  >
                    {t === 'active' ? 'Active' : 'Inactive'}
                  </button>
                ))}
              </div>
            )}
            {tab === 'active' || !canSeeInactive ? <ActiveTab {...tabProps} /> : <InactiveTab {...tabProps} />}
          </div>
        </section>
      </div>

      {/* Side panel */}
      <SideModal isOpen={!!panel} onClose={closePanel} title={panelTitle}>
        {panel?.type === 'create' && <CustomerForm isEdit={false} isPending={creating} onSubmit={handleCreate} onCancel={closePanel} />}
        {panel?.type === 'edit' && (
          <EditPanel id={panel.id} isPending={updating} onSubmit={(payload) => handleUpdate(panel.id, payload)} onCancel={closePanel} />
        )}
        {panel?.type === 'view' && <ViewPanel id={panel.id} />}
      </SideModal>

      {confirm && (
        <ConfirmDialog
          confirm={confirm}
          isPending={deactivating || hardDeleting}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};

export default CustomerMain;






// 

