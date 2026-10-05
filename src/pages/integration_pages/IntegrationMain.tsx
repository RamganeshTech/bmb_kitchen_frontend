import { useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertCircle, Calculator, CheckCircle2, CreditCard, Eye, Link2,
  MessageSquare, Plug, RefreshCw, Star, Truck,
  Unplug, type LucideIcon,
} from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { SideModal } from '../../components/ui/SideModal';
import { toast } from '../../components/ui/toast/Toast'; // TODO: confirm named vs default export
// TODO: confirm this path
import {
  useConnectIntegration, useDisconnectIntegration, useGetIntegrationById,
  useListIntegrations, useSeedDefaultIntegrations, type IntegrationCategory,
  type IntegrationItem, type IntegrationStatus,
} from '../../api_service/integration_api/integrationApi';
import { SearchSelect } from '../../components/ui/SearchSelect';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const SKELETON_CARD_COUNT = 6;

type CategoryFilter = IntegrationCategory | 'all';
type StatusFilter = IntegrationStatus | 'all';

interface CategoryPresentation {
  label: string;
  icon: LucideIcon;
}

const CATEGORY_PRESENTATION: Record<IntegrationCategory, CategoryPresentation> = {
  Aggregator: { label: 'Aggregator', icon: Truck },
  Payments: { label: 'Payments', icon: CreditCard },
  Messaging: { label: 'Messaging', icon: MessageSquare },
  Accounting: { label: 'Accounting', icon: Calculator },
  Reputation: { label: 'Reputation', icon: Star },
};

const CATEGORY_FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All categories' },
  ...(Object.keys(CATEGORY_PRESENTATION) as IntegrationCategory[]).map((category) => ({
    value: category,
    label: CATEGORY_PRESENTATION[category].label,
  })),
];

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'connected', label: 'Connected' },
  { value: 'not_connected', label: 'Not connected' },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const connectedSinceFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatConnectedSince = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : connectedSinceFormatter.format(date);
};

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const getCategoryIcon = (category: IntegrationCategory): LucideIcon => CATEGORY_PRESENTATION[category]?.icon ?? Plug;

/* -------------------------------------------------------------------------- */
/*  Small presentational pieces                                               */
/* -------------------------------------------------------------------------- */

const IntegrationStatusBadge = ({ status }: { status: IntegrationStatus }) => {
  const isConnected = status === 'connected';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white ${isConnected ? 'bg-success' : 'bg-muted'
        }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
      {isConnected ? 'Connected' : 'Not connected'}
    </span>
  );
};

// const SummaryCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: number }) => (
//   <Card className="flex items-center gap-3 p-4">
//     <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</span>
//     <div className="min-w-0">
//       <p className="text-sm text-muted">{label}</p>
//       <p className="text-xl font-semibold text-heading">{value}</p>
//     </div>
//   </Card>
// );

const FilterChipGroup = <TValue extends string>({
  ariaLabel,
  options,
  selectedValue,
  onSelect,
}: {
  ariaLabel: string;
  options: { value: TValue; label: string }[];
  selectedValue: TValue;
  onSelect: (value: TValue) => void;
}) => (
  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={ariaLabel}>
    {options.map((option) => (
      <Button
        key={option.value}
        size="sm"
        className="shrink-0"
        variant={selectedValue === option.value ? 'primary' : 'outline'}
        aria-pressed={selectedValue === option.value}
        onClick={() => onSelect(option.value)}
      >
        {option.label}
      </Button>
    ))}
  </div>
);

const DetailField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-sm text-muted">{label}</dt>
    <dd className="break-words font-medium text-heading">{children}</dd>
  </div>
);

const EmptyState = ({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children?: ReactNode }) => (
  <Card className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-6 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">{icon}</span>
    <div className="flex max-w-md flex-col gap-1">
      <p className="text-lg font-semibold text-heading">{title}</p>
      <p className="text-sm text-muted">{description}</p>
    </div>
    {children}
  </Card>
);

const IntegrationCardSkeleton = () => (
  <Card className="flex flex-col gap-4 p-5" aria-hidden="true">
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 animate-pulse rounded-xl bg-surface-hover" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-hover" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-surface-hover" />
      </div>
    </div>
    <div className="h-10 animate-pulse rounded bg-surface-hover" />
    <div className="h-9 animate-pulse rounded bg-surface-hover" />
  </Card>
);

/* -------------------------------------------------------------------------- */
/*  Integration card                                                          */
/* -------------------------------------------------------------------------- */

interface IntegrationCardProps {
  integration: IntegrationItem;
  isBusy: boolean;
  onView: (integration: IntegrationItem) => void;
  onConnect: (integration: IntegrationItem) => void;
  onRequestDisconnect: (integration: IntegrationItem) => void;
}

const IntegrationCard = ({ integration, isBusy, onView, onConnect, onRequestDisconnect }: IntegrationCardProps) => {
  const CategoryIcon = getCategoryIcon(integration.category);
  const isConnected = integration.status === 'connected';

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <CategoryIcon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-heading">{integration.name}</h3>
          <p className="text-sm text-muted">{integration.category}</p>
        </div>
        <IntegrationStatusBadge status={integration.status} />
      </div>

      <p className="line-clamp-2 min-h-10 text-sm text-body">{integration.note || 'No description added.'}</p>

      <p className="text-sm text-muted">{isConnected ? `Connected since ${formatConnectedSince(integration.connectedSince)}` : 'Not connected yet'}</p>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button size="sm" variant="ghost" leftIcon={<Eye size={14} />} onClick={() => onView(integration)}>
          View
        </Button>
        {isConnected ? (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            leftIcon={<Unplug size={14} />}
            isLoading={isBusy}
            loadingText="Disconnecting..."
            onClick={() => onRequestDisconnect(integration)}
          >
            Disconnect
          </Button>
        ) : (
          <Button size="sm" className="ml-auto" leftIcon={<Link2 size={14} />} isLoading={isBusy} loadingText="Connecting..." onClick={() => onConnect(integration)}>
            Connect
          </Button>
        )}
      </div>
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/*  Detail modal                                                              */
/* -------------------------------------------------------------------------- */

interface IntegrationDetailModalProps {
  integrationId: string;
  isBusy: boolean;
  onClose: () => void;
  onConnect: (integration: IntegrationItem) => void;
  onRequestDisconnect: (integration: IntegrationItem) => void;
}

const IntegrationDetailModal = ({ integrationId, isBusy, onClose, onConnect, onRequestDisconnect }: IntegrationDetailModalProps) => {
  const { data: integration, isLoading, error, refetch, isFetching } = useGetIntegrationById(integrationId);

  let modalBody: ReactNode;
  if (isLoading) {
    modalBody = (
      <div className="space-y-4" aria-busy="true">
        <div className="h-24 animate-pulse rounded-xl bg-surface-hover" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-hover" />
      </div>
    );
  } else if (error || !integration) {
    modalBody = (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle size={28} className="text-danger" />
        <p className="text-muted">{error?.message ?? 'Could not load this integration'}</p>
        <Button variant="outline" leftIcon={<RefreshCw size={16} />} isLoading={isFetching} onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    const CategoryIcon = getCategoryIcon(integration.category);
    modalBody = (
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3 rounded-xl bg-primary-soft p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
            <CategoryIcon size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-xl font-semibold text-heading">{integration.name}</p>
            <p className="text-sm text-muted">{integration.category}</p>
          </div>
          <IntegrationStatusBadge status={integration.status} />
        </div>

        <dl className="grid grid-cols-1 gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
          <DetailField label="Category">{integration.category}</DetailField>
          <DetailField label="Status">{integration.status === 'connected' ? 'Connected' : 'Not connected'}</DetailField>
          <DetailField label="Connected since">{formatConnectedSince(integration.connectedSince)}</DetailField>
          <DetailField label="Last updated">{formatConnectedSince(integration.updatedAt)}</DetailField>
        </dl>

        <div className="flex flex-col gap-1.5">
          <h3 className="font-semibold text-heading">About</h3>
          <p className="text-body">{integration.note || 'No description added.'}</p>
        </div>
      </div>
    );
  }

  return (
    <SideModal isOpen onClose={onClose} title="Integration details">
      <div className="flex flex-col gap-6">
        {modalBody}
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {integration &&
            (integration.status === 'connected' ? (
              <Button type="button" variant="outline" leftIcon={<Unplug size={16} />} onClick={() => onRequestDisconnect(integration)}>
                Disconnect
              </Button>
            ) : (
              <Button type="button" leftIcon={<Link2 size={16} />} isLoading={isBusy} loadingText="Connecting..." onClick={() => onConnect(integration)}>
                Connect
              </Button>
            ))}
        </div>
      </div>
    </SideModal>
  );
};

/* -------------------------------------------------------------------------- */
/*  Disconnect confirmation                                                   */
/* -------------------------------------------------------------------------- */

interface DisconnectConfirmModalProps {
  integration: IntegrationItem;
  isDisconnecting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DisconnectConfirmModal = ({ integration, isDisconnecting, onCancel, onConfirm }: DisconnectConfirmModalProps) => (
  <SideModal isOpen onClose={onCancel} title="Disconnect integration">
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm();
      }}
    >
      <div className="flex items-start gap-3 rounded-xl border border-border p-4">
        <AlertCircle size={22} className="mt-0.5 shrink-0 text-danger" />
        <div className="min-w-0">
          <p className="font-semibold text-heading">Disconnect {integration.name}?</p>
          <p className="text-sm text-muted">{integration.name} will be marked as not connected. You can connect it again at any time.</p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" leftIcon={<Unplug size={16} />} isLoading={isDisconnecting} loadingText="Disconnecting...">
          Disconnect
        </Button>
      </div>
    </form>
  </SideModal>
);

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const IntegrationMain = () => {
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [integrationPendingDisconnect, setIntegrationPendingDisconnect] = useState<IntegrationItem | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useListIntegrations();
  const { mutateAsync: seedDefaultIntegrationsAsync, isPending: isSeeding } = useSeedDefaultIntegrations();
  const { mutateAsync: connectIntegrationAsync, isPending: isConnecting, variables: connectingIntegrationId } = useConnectIntegration();
  const { mutateAsync: disconnectIntegrationAsync, isPending: isDisconnecting, variables: disconnectingIntegrationId } = useDisconnectIntegration();

  const integrations: IntegrationItem[] = data ?? [];
  // const connectedCount = integrations.filter((integration) => integration.status === 'connected').length;
  // const notConnectedCount = integrations.length - connectedCount;

  const normalizedSearchText = searchText.trim().toLowerCase();
  const visibleIntegrations = integrations.filter((integration) => {
    if (categoryFilter !== 'all' && integration.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && integration.status !== statusFilter) return false;
    if (!normalizedSearchText) return true;
    return (
      integration.name.toLowerCase().includes(normalizedSearchText) ||
      integration.category.toLowerCase().includes(normalizedSearchText) ||
      (integration.note ?? '').toLowerCase().includes(normalizedSearchText)
    );
  });

  const hasActiveFilters = categoryFilter !== 'all' || statusFilter !== 'all' || normalizedSearchText !== '';
  const clearFilters = () => {
    setSearchText('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  // The integration whose connect/disconnect request is currently in flight
  const busyIntegrationId = (isConnecting ? connectingIntegrationId : null) ?? (isDisconnecting ? disconnectingIntegrationId : null) ?? null;

  const handleSeedDefaults = async () => {
    try {
      await seedDefaultIntegrationsAsync();
      toast.success('Default integrations are ready');
    } catch (seedError) {
      toast.error(getErrorMessage(seedError, 'Failed to set up integrations'));
    }
  };

  const handleConnect = async (integration: IntegrationItem) => {
    try {
      await connectIntegrationAsync(integration._id);
      toast.success(`${integration.name} connected`);
    } catch (connectError) {
      toast.error(getErrorMessage(connectError, 'Failed to connect integration'));
    }
  };

  const handleRequestDisconnect = (integration: IntegrationItem) => {
    setSelectedIntegrationId(null);
    setIntegrationPendingDisconnect(integration);
  };

  const handleConfirmDisconnect = async () => {
    if (!integrationPendingDisconnect) return;
    try {
      await disconnectIntegrationAsync(integrationPendingDisconnect._id);
      toast.success(`${integrationPendingDisconnect.name} disconnected`);
      setIntegrationPendingDisconnect(null);
    } catch (disconnectError) {
      toast.error(getErrorMessage(disconnectError, 'Failed to disconnect integration'));
    }
  };

  // ── Content area ────────────────────────────────────────────────────────────
  let content: ReactNode;
  if (isLoading) {
    content = (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-busy="true">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, skeletonIndex) => (
          <IntegrationCardSkeleton key={skeletonIndex} />
        ))}
      </div>
    );
  } else if (error) {
    content = (
      <EmptyState icon={<AlertCircle size={22} />} title="Could not load integrations" description={error.message}>
        <Button variant="outline" leftIcon={<RefreshCw size={16} />} isLoading={isFetching} onClick={() => refetch()}>
          Try again
        </Button>
      </EmptyState>
    );
  } else if (integrations.length === 0) {
    content = (
      <EmptyState
        icon={<Plug size={22} />}
        title="No integrations yet"
        description="Set up the default catalogue to connect delivery platforms, payments, messaging, accounting and reviews."
      >
        <Button leftIcon={<CheckCircle2 size={16} />} isLoading={isSeeding} loadingText="Setting up..." onClick={handleSeedDefaults}>
          Set up default integrations
        </Button>
      </EmptyState>
    );
  } else if (visibleIntegrations.length === 0) {
    content = (
      <EmptyState icon={<Plug size={22} />} title="No integrations match" description="Try a different search or clear the filters.">
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </EmptyState>
    );
  } else {
    content = (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleIntegrations.map((integration) => (
          <IntegrationCard
            key={integration._id}
            integration={integration}
            isBusy={busyIntegrationId === integration._id}
            onView={(selectedIntegration) => setSelectedIntegrationId(selectedIntegration._id)}
            onConnect={handleConnect}
            onRequestDisconnect={handleRequestDisconnect}
          />
        ))}
      </div>
    );
  }

  return (
    // <div className="flex w-full flex-col gap-5 p-2">
    //   {/* Header */}
    //   <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    //     <div className="flex min-w-0 items-center gap-3">
    //       <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
    //         <Plug size={20} />
    //       </span>
    //       <div className="min-w-0">
    //         <h1 className="text-2xl font-semibold text-heading">Integrations</h1>
    //         <p className="text-sm text-muted">Connect the platforms your restaurant works with</p>
    //       </div>
    //     </div>
    //     <Button variant="outline" leftIcon={<RefreshCw size={16} />} isLoading={isFetching && !isLoading} loadingText="Refreshing..." onClick={() => refetch()}>
    //       Refresh
    //     </Button>
    //   </header>

    //   {/* Summary */}
    //   <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    //     <SummaryCard icon={<Plug size={20} />} label="Total integrations" value={integrations.length} />
    //     <SummaryCard icon={<CheckCircle2 size={20} />} label="Connected" value={connectedCount} />
    //     <SummaryCard icon={<Unplug size={20} />} label="Not connected" value={notConnectedCount} />
    //   </div>

    //   {/* Filters */}
    //   {integrations.length > 0 && (
    //     <Card className="flex flex-col gap-4 p-4">
    //       <div className="flex flex-col gap-1.5 sm:max-w-md">
    //         <Label htmlFor="integrationSearch">Search</Label>
    //         <Input
    //           id="integrationSearch"
    //           type="search"
    //           placeholder="Search by name, category or description"
    //           value={searchText}
    //           onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value)}
    //         />
    //       </div>
    //       <FilterChipGroup ariaLabel="Category" options={CATEGORY_FILTER_OPTIONS} selectedValue={categoryFilter} onSelect={setCategoryFilter} />
    //       <FilterChipGroup ariaLabel="Status" options={STATUS_FILTER_OPTIONS} selectedValue={statusFilter} onSelect={setStatusFilter} />
    //     </Card>
    //   )}


    <div className="flex w-full flex-col gap-5 p-2">
      {/* Header + filters in one row */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Plug size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-heading">Integrations</h1>
            <p className="text-sm text-muted">Connect the platforms your restaurant works with</p>
          </div>
        </div>

        {integrations.length > 0 && (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <div className="w-full sm:w-64">
              <Input
                id="integrationSearch"
                type="search"
                aria-label="Search integrations"
                placeholder="Search integrations"
                value={searchText}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value)}
              />
            </div>

            <div className="w-full sm:w-52">
              <SearchSelect
                options={CATEGORY_FILTER_OPTIONS}
                value={categoryFilter}
                placeholder="All categories"
                onChange={(option) => setCategoryFilter(String(option.value) as typeof categoryFilter)}
                onClear={() => setCategoryFilter('all' as typeof categoryFilter)}
              />
            </div>

            <FilterChipGroup
              ariaLabel="Status"
              options={STATUS_FILTER_OPTIONS}
              selectedValue={statusFilter}
              onSelect={setStatusFilter}
            />
          </div>
        )}
      </header>

      {/* ...integration cards below stay as they are */}

      {/* Integrations */}
      {content}

      {integrations.length > 0 && visibleIntegrations.length > 0 && (
        <p className="text-center text-sm text-muted">
          Showing {visibleIntegrations.length} of {integrations.length} {integrations.length === 1 ? 'integration' : 'integrations'}
        </p>
      )}

      {selectedIntegrationId && (
        <IntegrationDetailModal
          key={selectedIntegrationId}
          integrationId={selectedIntegrationId}
          isBusy={busyIntegrationId === selectedIntegrationId}
          onClose={() => setSelectedIntegrationId(null)}
          onConnect={handleConnect}
          onRequestDisconnect={handleRequestDisconnect}
        />
      )}

      {integrationPendingDisconnect && (
        <DisconnectConfirmModal
          integration={integrationPendingDisconnect}
          isDisconnecting={isDisconnecting}
          onCancel={() => setIntegrationPendingDisconnect(null)}
          onConfirm={handleConfirmDisconnect}
        />
      )}
    </div>
  );
};

export default IntegrationMain;