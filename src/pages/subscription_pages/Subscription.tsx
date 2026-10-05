import { useState, type ReactNode } from 'react';
import {
  CalendarClock,
  Check,
  CreditCard,
  Plus,
  Receipt,
  RefreshCw,
  ShieldAlert,
  Store,
  Wallet,
} from 'lucide-react';
import { useAuthData } from '../../hooks/useAuthData';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { SideModal } from '../../components/ui/SideModal';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import {
  SUBSCRIPTION_MANAGEMENT_ROLES,
  useAddInvoice,
  useChangePlan,
  useCreateSubscription,
  useGetSubscription,
  useListInvoices,
} from '../../api_service/subscription_api/subscriptionApi';

// ── Plan catalog ──────────────────────────────────────────────────────────────
// Config, not per-organization data (the backend only stores the chosen plan).
// TODO: replace names/prices/features with the exact values from MD sir's HTML PLANS array.
type Cycle = 'monthly' | 'yearly';

interface PlanDefinition {
  name: 'Starter' | 'Growth' | 'Chain';
  tagline: string;
  outletsIncluded: number;
  price: Record<Cycle, number>;
  features: string[];
}

const PLAN_CATALOG: PlanDefinition[] = [
  {
    name: 'Starter',
    tagline: 'For a single restaurant getting started',
    outletsIncluded: 1,
    price: { monthly: 999, yearly: 9990 },
    features: ['POS billing & KOT', 'Menu and table management', 'Basic reports'],
  },
  {
    name: 'Growth',
    tagline: 'For growing restaurants with a few outlets',
    outletsIncluded: 3,
    price: { monthly: 2499, yearly: 24990 },
    features: ['Everything in Starter', 'Inventory & purchases', 'Loyalty and offers', 'Advanced reports'],
  },
  {
    name: 'Chain',
    tagline: 'For restaurant chains with a central kitchen',
    outletsIncluded: 10,
    price: { monthly: 5999, yearly: 59990 },
    features: ['Everything in Growth', 'Central kitchen transfers', 'Multi-outlet analytics', 'Priority support'],
  },
];

const INVOICE_STATUS_OPTIONS = [
  { label: 'Paid', value: 'Paid' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Failed', value: 'Failed' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
type Tone = 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  info: 'bg-info text-white',
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const addCycle = (cycle: Cycle) => {
  const date = new Date();
  if (cycle === 'yearly') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return date;
};

const getRenewalState = (renewsAt: string): { label: string; tone: Tone; days: number | null } => {
  const days = Math.ceil((new Date(renewsAt).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days)) return { label: 'Unknown', tone: 'info', days: null };
  if (days < 0) return { label: 'Expired', tone: 'danger', days };
  if (days <= 7) return { label: `Renews in ${days} day${days === 1 ? '' : 's'}`, tone: 'warning', days };
  return { label: 'Active', tone: 'success', days };
};

const invoiceTone = (status?: string): Tone => {
  if (status === 'Paid') return 'success';
  if (status === 'Failed') return 'danger';
  return 'warning';
};

const getStatusCode = (error: unknown) =>
  (error as { cause?: { response?: { status?: number } } } | null)?.cause?.response?.status;

// ── Small presentational pieces ───────────────────────────────────────────────
const Badge = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
  >
    {children}
  </span>
);

const StatCard = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) => (
  <Card className="flex items-start gap-3 p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-sm text-muted">{label}</p>
      <p className="truncate text-xl font-semibold text-heading">{value}</p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  </Card>
);

const PlanCard = ({
  plan,
  cycle,
  isCurrent,
  actionLabel,
  onSelect,
}: {
  plan: PlanDefinition;
  cycle: Cycle;
  isCurrent: boolean;
  actionLabel: string;
  onSelect: () => void;
}) => (
  <Card
    className={`flex flex-col gap-4 p-5 ${isCurrent ? 'border-2 border-primary' : ''}`}
  >
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="text-lg font-semibold text-heading">{plan.name}</h3>
        <p className="text-sm text-muted">{plan.tagline}</p>
      </div>
      {isCurrent && <Badge tone="success">Current plan</Badge>}
    </div>

    <p className="text-heading">
      <span className="text-3xl font-semibold">{formatCurrency(plan.price[cycle])}</span>
      <span className="text-sm text-muted"> / {cycle === 'monthly' ? 'month' : 'year'}</span>
    </p>

    <p className="text-sm font-medium text-body">
      {plan.outletsIncluded} outlet{plan.outletsIncluded > 1 ? 's' : ''} included
    </p>

    <ul className="flex flex-1 flex-col gap-2">
      {plan.features.map((feature) => (
        <li key={feature} className="flex items-start gap-2 text-sm text-body">
          <Check size={16} className="mt-0.5 shrink-0 text-success" />
          {feature}
        </li>
      ))}
    </ul>

    <Button
      fullWidth
      variant={isCurrent ? 'outline' : 'primary'}
      disabled={isCurrent}
      onClick={onSelect}
    >
      {isCurrent ? 'Your current plan' : actionLabel}
    </Button>
  </Card>
);

const CycleToggle = ({ value, onChange }: { value: Cycle; onChange: (c: Cycle) => void }) => (
  <div className="inline-flex rounded-lg border border-border bg-surface p-1" role="group" aria-label="Billing cycle">
    {(['monthly', 'yearly'] as const).map((option) => (
      <button
        key={option}
        type="button"
        aria-pressed={value === option}
        onClick={() => onChange(option)}
        className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${value === option ? 'bg-primary text-white' : 'text-body hover:bg-surface-hover'
          }`}
      >
        {option}
      </button>
    ))}
  </div>
);

const LoadingState = () => (
  <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading subscription">
    <div className="h-40 animate-pulse rounded-xl bg-border" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-border" />
      ))}
    </div>
    <div className="h-64 animate-pulse rounded-xl bg-border" />
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SubscriptionMain() {
  const { currentRole } = useAuthData();
  const canManage = !!currentRole && (SUBSCRIPTION_MANAGEMENT_ROLES as string[]).includes(currentRole);

  const { data: subscription, isLoading, error, refetch, isFetching } = useGetSubscription();
  const { data: invoices = [], isLoading: invoicesLoading } = useListInvoices();

  const { mutateAsync: createSubscriptionAsync, isPending: isCreating } = useCreateSubscription();
  const { mutateAsync: changePlanAsync, isPending: isChangingPlan } = useChangePlan();
  const { mutateAsync: addInvoiceAsync, isPending: isAddingInvoice } = useAddInvoice();

  const [setupCycle, setSetupCycle] = useState<Cycle>('monthly');
  const [pendingPlan, setPendingPlan] = useState<PlanDefinition | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNo: '', date: '', amount: '', status: 'Paid' });

  // Singleton per org: a 404 simply means the subscription hasn't been set up yet.
  const notSetUp = !subscription && getStatusCode(error?.cause) === 404;
  const hasFailed = !!error && !notSetUp;
  const activeCycle: Cycle = subscription?.cycle === 'yearly' ? 'yearly' : subscription ? 'monthly' : setupCycle;

  const totalPaid = invoices
    .filter((invoice) => invoice.status === 'Paid')
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const renewal = subscription ? getRenewalState(subscription.renewsAt) : null;

  const handleConfirmPlan = async () => {
    if (!pendingPlan) return;
    const price = pendingPlan.price[activeCycle];

    try {
      if (subscription) {
        await changePlanAsync({ plan: pendingPlan.name, price, outletsIncluded: pendingPlan.outletsIncluded });
        toast.success(`Plan changed to ${pendingPlan.name}`);
      } else {
        await createSubscriptionAsync({
          plan: pendingPlan.name,
          price,
          cycle: activeCycle,
          outletsIncluded: pendingPlan.outletsIncluded,
          renewsAt: addCycle(activeCycle).toISOString(),
        });
        toast.success(`${pendingPlan.name} plan activated`);
      }
      setPendingPlan(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the plan');
    }
  };

  const handlePlanSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleConfirmPlan();
  };

  const closeInvoicePanel = () => {
    setIsInvoiceOpen(false);
    setInvoiceForm({ invoiceNo: '', date: '', amount: '', status: 'Paid' });
  };

  const handleAddInvoice = async () => {
    const invoiceNo = invoiceForm.invoiceNo.trim();
    const amount = Number(invoiceForm.amount);

    if (!invoiceNo) return toast.error('Invoice number is required');
    if (!invoiceForm.amount || Number.isNaN(amount) || amount <= 0) {
      return toast.error('Enter an amount greater than 0');
    }

    try {
      await addInvoiceAsync({
        invoiceNo,
        amount,
        status: invoiceForm.status,
        ...(invoiceForm.date && { date: new Date(invoiceForm.date).toISOString() }),
      });
      toast.success('Invoice recorded');
      closeInvoicePanel();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record the invoice');
    }
  };

  const handleInvoiceSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleAddInvoice();
  };

  const planActionLabel = (plan: PlanDefinition) => {
    if (!subscription) return 'Choose plan';
    const current = PLAN_CATALOG.find((p) => p.name.toLowerCase() === subscription.plan.toLowerCase());
    if (!current) return 'Switch to this plan';
    return plan.outletsIncluded > current.outletsIncluded ? 'Upgrade' : 'Downgrade';
  };

  const renderPlans = () => (
    <section className="flex flex-col gap-4" aria-labelledby="plans-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="plans-heading" className="text-lg font-semibold text-heading">
            {subscription ? 'Available plans' : 'Choose a plan'}
          </h2>
          <p className="text-sm text-muted">
            {subscription
              ? `Prices shown for your ${activeCycle} billing cycle.`
              : 'Pick the plan that fits your outlets. You can change it later.'}
          </p>
        </div>
        {!subscription && <CycleToggle value={setupCycle} onChange={setSetupCycle} />}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLAN_CATALOG.map((plan) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            cycle={activeCycle}
            isCurrent={subscription?.plan.toLowerCase() === plan.name.toLowerCase()}
            actionLabel={planActionLabel(plan)}
            onSelect={() => setPendingPlan(plan)}
          />
        ))}
      </div>
    </section>
  );

  const INVOICE_TABLE_COLUMN_COUNT = 5; // S.No, Invoice no, Date, Amount, Status

  const InvoiceMessageRow = ({ message }: { message: string }) => (
    <Tr>
      <Td colSpan={INVOICE_TABLE_COLUMN_COUNT}>
        <div className="flex min-h-[180px] items-center justify-center px-4 text-center text-muted">{message}</div>
      </Td>
    </Tr>
  );

  // ── Body ────────────────────────────────────────────────────────────────────
  let body: ReactNode;

  if (!canManage) {
    body = (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <ShieldAlert size={32} className="text-warning" />
        <h2 className="text-lg font-semibold text-heading">You don't have access to billing</h2>
        <p className="text-sm text-muted">
          Only the owner, admin or CTO can view and manage the subscription. Please contact one of them.
        </p>
      </Card>
    );
  } else if (isLoading) {
    body = <LoadingState />;
  } else if (hasFailed) {
    body = (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <ShieldAlert size={32} className="text-danger" />
        <h2 className="text-lg font-semibold text-heading">Couldn't load your subscription</h2>
        <p className="text-sm text-muted">{error?.message}</p>
        <Button
          variant="outline"
          leftIcon={<RefreshCw size={16} />}
          isLoading={isFetching}
          loadingText="Retrying"
          onClick={() => refetch()}
        >
          Try again
        </Button>
      </Card>
    );
  } else if (!subscription || notSetUp) {
    body = (
      <>
        <Card className="flex flex-col gap-1 p-5">
          <h2 className="text-lg font-semibold text-heading">No active subscription</h2>
          <p className="text-sm text-muted">
            Set up a plan to start billing for this organization.
          </p>
        </Card>
        {renderPlans()}
      </>
    );
  } else {
    body = (
      <>
        {/* Current plan */}
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-heading">{subscription.plan} plan</h2>
              {renewal && <Badge tone={renewal.tone}>{renewal.label}</Badge>}
            </div>
            <p className="text-heading">
              <span className="text-3xl font-semibold">{formatCurrency(subscription.price)}</span>
              <span className="text-sm text-muted"> / {activeCycle === 'monthly' ? 'month' : 'year'}</span>
            </p>
            <p className="text-sm text-muted">Renews on {formatDate(subscription.renewsAt)}</p>
          </div>
          <a
            href="#plans-heading"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-heading hover:bg-surface-hover"
          >
            Compare plans
          </a>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={<Store size={20} />}
            label="Outlets included"
            value={String(subscription.outletsIncluded)}
          />
          <StatCard
            icon={<CalendarClock size={20} />}
            label="Next renewal"
            value={formatDate(subscription.renewsAt)}
            hint={
              renewal?.days != null
                ? renewal.days < 0
                  ? `${Math.abs(renewal.days)} days overdue`
                  : `in ${renewal.days} day${renewal.days === 1 ? '' : 's'}`
                : undefined
            }
          />
          <StatCard
            icon={<Wallet size={20} />}
            label="Total paid"
            value={formatCurrency(totalPaid)}
            hint={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'} recorded`}
          />
        </div>

        {renderPlans()}

        {/* Invoices */}
        <section className="flex flex-col gap-3" aria-labelledby="invoices-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="invoices-heading" className="text-lg font-semibold text-heading">
                Invoices
              </h2>
              <p className="text-sm text-muted">Billing history for this organization.</p>
            </div>
            <Button leftIcon={<Plus size={16} />} onClick={() => setIsInvoiceOpen(true)}>
              Add invoice
            </Button>
          </div>

          <TableContainer className="min-h-[300px]" ariaLabel="Invoices" caption="Subscription invoices">
            <THead>
              <Tr>
                <Th className="w-16">S.No</Th>
                <Th>Invoice no</Th>
                <Th>Date</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
              </Tr>
            </THead>
            <TBody>
              {invoicesLoading ? (
                // <Tr>
                //   <Td colSpan={4}>
                //     <span className="text-muted">Loading invoices…</span>
                //   </Td>
                // </Tr>

                <InvoiceMessageRow message="Loading invoices…" />

              ) : invoices.length === 0 ? (
                // <Tr>
                //   <Td colSpan={4}>
                //     <span className="text-muted">No invoices yet. Add the first one to start the history.</span>
                //   </Td>
                // </Tr>

                <InvoiceMessageRow message="No invoices yet. Add the first one to start the history." />

              ) : (
                invoices.map((invoice, rowIndex) => (
                  <Tr key={invoice.id ?? invoice.invoiceNo} ariaLabel={`Invoice ${invoice.invoiceNo}`}>
                    <Td>
                      <span className="text-muted">{rowIndex + 1}</span>
                    </Td>
                    <Td>
                      <span className="font-medium text-heading">{invoice.invoiceNo}</span>
                    </Td>
                    <Td>{formatDate(invoice.date ?? invoice.createdAt)}</Td>
                    <Td>{formatCurrency(invoice.amount)}</Td>
                    <Td>
                      <Badge tone={invoiceTone(invoice.status)}>{invoice.status ?? 'Pending'}</Badge>
                    </Td>
                  </Tr>
                ))
              )}
            </TBody>
          </TableContainer>
        </section>
      </>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5 p-2">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <CreditCard size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-heading">Subscription &amp; Billing</h1>
          <p className="text-sm text-muted">Manage your plan, outlets and invoices</p>
        </div>
      </header>

      {body}

      {/* Confirm plan */}
      <SideModal
        isOpen={!!pendingPlan}
        onClose={() => !isChangingPlan && !isCreating && setPendingPlan(null)}
        title={subscription ? 'Change plan' : 'Activate plan'}
      >
        {pendingPlan && (
          // <div className="flex flex-col gap-4">
          <form onSubmit={handlePlanSubmit} className="flex flex-col gap-4">

            {subscription && (
              <div className="rounded-lg border border-border bg-page p-4">
                <p className="text-sm text-muted">Current plan</p>
                <p className="font-semibold text-heading">
                  {subscription.plan} · {formatCurrency(subscription.price)} / {activeCycle === 'monthly' ? 'month' : 'year'}
                </p>
              </div>
            )}
            <div className="rounded-lg border-2 border-primary bg-primary-soft p-4">
              <p className="text-sm text-muted">{subscription ? 'New plan' : 'Selected plan'}</p>
              <p className="font-semibold text-heading">
                {pendingPlan.name} · {formatCurrency(pendingPlan.price[activeCycle])} / {activeCycle === 'monthly' ? 'month' : 'year'}
              </p>
              <p className="text-sm text-body">
                {pendingPlan.outletsIncluded} outlet{pendingPlan.outletsIncluded > 1 ? 's' : ''} included
              </p>
            </div>
            {!subscription && (
              <p className="text-sm text-muted">
                Your first renewal will be on {formatDate(addCycle(activeCycle).toISOString())}.
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-border pt-5">
              <Button type="button" variant="outline" onClick={() => setPendingPlan(null)} disabled={isChangingPlan || isCreating}>
                Cancel
              </Button>
              <Button
                type="submit"
                autoFocus
                isLoading={isChangingPlan || isCreating}
                loadingText={subscription ? 'Changing plan...' : 'Activating...'}
              >
                {subscription ? 'Confirm change' : 'Activate plan'}
              </Button>
            </div>
          </form>
        )}
      </SideModal>

      {/* Add invoice */}
      <SideModal
        isOpen={isInvoiceOpen}
        onClose={() => !isAddingInvoice && closeInvoicePanel()}
        title="Add invoice"

      >
        <form onSubmit={handleInvoiceSubmit} noValidate className="flex flex-col gap-4">

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoiceNo">Invoice number</Label>
              <Input
                id="invoiceNo"
                value={invoiceForm.invoiceNo}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, invoiceNo: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoiceDate">Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceForm.date}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoiceAmount">Amount (₹)</Label>
              <Input
                id="invoiceAmount"
                type="number"
                min={0}
                inputMode="decimal"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <SearchSelect
              label="Status"
              options={INVOICE_STATUS_OPTIONS}
              value={invoiceForm.status}
              placeholder="Select status"
              onChange={(o) => setInvoiceForm((f) => ({ ...f, status: String(o.value) }))}
              onClear={() => setInvoiceForm((f) => ({ ...f, status: 'Paid' }))}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={closeInvoicePanel} disabled={isAddingInvoice}>
              Cancel
            </Button>
            <Button type="submit" leftIcon={<Receipt size={16} />} isLoading={isAddingInvoice} loadingText="Saving...">
              Save invoice
            </Button>
          </div>
        </form>
      </SideModal>
    </div>
  );
}