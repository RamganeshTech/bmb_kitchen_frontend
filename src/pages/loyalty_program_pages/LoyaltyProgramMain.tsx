import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Star, Plus, Pencil, Trash2, AlertTriangle, Info } from 'lucide-react';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SideModal } from '../../components/ui/SideModal';
import { useAuthData } from '../../hooks/useAuthData';
import {
  LOYALTY_PROGRAM_WRITE_ROLES,
  useGetLoyaltyProgram,
  useCreateLoyaltyProgram,
  useUpdateLoyaltyProgram,
} from '../../api_service/loyaltyProgram_api/loyaltyProgramApi';
import type { LoyaltyProgramItem, LoyaltyProgramPayload, LoyaltyTier } from '../../api_service/loyaltyProgram_api/loyaltyProgramApi';

// ── Helpers ──────────────────────────────────────────────────────────────────
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const num = (n: number | undefined) => (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const numStr = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const isWhole = (v: string) => Number.isInteger(Number(v));

const textareaClass =
  'w-full min-h-[96px] rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

const sortTiers = (tiers: LoyaltyTier[]) => [...tiers].sort((a, b) => a.minPoints - b.minPoints);


  const sameTier = (a: LoyaltyTier, b: LoyaltyTier) =>
    a._id && b._id ? a._id === b._id : a.name === b.name && a.minPoints === b.minPoints;


// ── Small building blocks ────────────────────────────────────────────────────
const Field = ({ label, hint, error, children }: { label?: string; hint?: string; error?: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    {label && <Label>{label}</Label>}
    {children}
    {hint && !error && <p className="text-sm text-muted">{hint}</p>}
    {error && <p className="text-sm text-danger">{error}</p>}
  </div>
);

const Switch = ({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'bg-success' : 'bg-border'
      }`}
  >
    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const SectionCard = ({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) => (
  <section className="flex flex-col rounded-xl border border-border bg-surface shadow-sm">
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <h2 className="text-lg font-semibold text-heading">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className="flex-1 p-5">{children}</div>
  </section>
);

const IconAction = ({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface transition-colors ${danger ? 'text-danger hover:bg-danger-soft' : 'text-body hover:bg-surface-hover hover:text-heading'
      }`}
  >
    {children}
  </button>
);

const ConfirmDialog = ({ tier, isPending, onCancel, onConfirm }: { tier: LoyaltyTier; isPending: boolean; onCancel: () => void; onConfirm: () => void }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
    <div className="w-full rounded-xl border border-border bg-surface p-6 shadow-xl sm:w-[440px]">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-danger-soft p-2 text-danger">
          <AlertTriangle size={20} />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-heading">Remove tier?</h3>
          <p className="mt-1 text-base text-body">&quot;{tier.name}&quot; will be removed from the programme. You can add it back later.</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isPending} loadingText="Removing...">
          Remove tier
        </Button>
      </div>
    </div>
  </div>
);

// ── Programme rules form (create on first setup, update afterwards) ──────────
interface RulesState {
  isEnabled: boolean;
  spendPerBlock: string;
  pointsPerBlock: string;
  pointValue: string;
  minPointsToRedeem: string;
  pointsExpireAfterDays: string;
}

const toRulesState = (p?: LoyaltyProgramItem): RulesState => ({
  isEnabled: p?.isEnabled ?? true,
  spendPerBlock: numStr(p?.spendPerBlock),
  pointsPerBlock: numStr(p?.pointsPerBlock),
  pointValue: numStr(p?.pointValue),
  minPointsToRedeem: numStr(p?.minPointsToRedeem),
  pointsExpireAfterDays: numStr(p?.pointsExpireAfterDays),
});

const RulesForm = ({
  program,
  canWrite,
  isPending,
  onSubmit,
}: {
  program?: LoyaltyProgramItem;
  canWrite: boolean;
  isPending: boolean;
  onSubmit: (payload: LoyaltyProgramPayload) => Promise<void>;
}) => {
  const isSetup = !program;
  const [initialForm] = useState(() => toRulesState(program));
  const [form, setForm] = useState<RulesState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof RulesState, string>>>({});

  const set = <K extends keyof RulesState>(key: K) => (value: RulesState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const validate = () => {
    const e: Partial<Record<keyof RulesState, string>> = {};
    if (!form.spendPerBlock || Number(form.spendPerBlock) <= 0) e.spendPerBlock = 'Enter an amount greater than 0';
    if (!form.pointsPerBlock || Number(form.pointsPerBlock) <= 0) e.pointsPerBlock = 'Enter points greater than 0';
    if (!form.pointValue || Number(form.pointValue) <= 0) e.pointValue = 'Enter a value greater than 0';
    if (form.minPointsToRedeem === '' || Number(form.minPointsToRedeem) < 0 || !isWhole(form.minPointsToRedeem))
      e.minPointsToRedeem = 'Enter a whole number, 0 or more';
    if (form.pointsExpireAfterDays && (Number(form.pointsExpireAfterDays) < 1 || !isWhole(form.pointsExpireAfterDays)))
      e.pointsExpireAfterDays = 'Enter a whole number of days, 1 or more';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const payload: Record<string, unknown> = {
      isEnabled: form.isEnabled,
      spendPerBlock: Number(form.spendPerBlock),
      pointsPerBlock: Number(form.pointsPerBlock),
      pointValue: Number(form.pointValue),
      minPointsToRedeem: Number(form.minPointsToRedeem),
    };
    // Expiry is optional: skip it on setup, send null on update so it can be cleared
    if (form.pointsExpireAfterDays) payload.pointsExpireAfterDays = Number(form.pointsExpireAfterDays);
    else if (!isSetup) payload.pointsExpireAfterDays = null;
    await onSubmit(payload as LoyaltyProgramPayload);
  };

  // Live example so the rules are easy to understand
  const spend = Number(form.spendPerBlock);
  const pts = Number(form.pointsPerBlock);
  const value = Number(form.pointValue);
  const canExplain = spend > 0 && pts > 0 && value > 0;
  const earned = canExplain ? Math.floor(1000 / spend) * pts : 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-page px-4 py-3">
        <div>
          <p className="text-base font-semibold text-heading">Loyalty enabled</p>
          <p className="text-sm text-muted">Points are earned on every settled bill</p>
        </div>
        <Switch label="Loyalty enabled" checked={form.isEnabled} disabled={!canWrite} onChange={set('isEnabled')} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Spend per earn block (₹) *" error={errors.spendPerBlock}>
          <Input type="number" min={0} step="any" disabled={!canWrite} value={form.spendPerBlock} onChange={(e) => set('spendPerBlock')(e.target.value)} placeholder="e.g. 100" />
        </Field>
        <Field label="Points per block *" error={errors.pointsPerBlock}>
          <Input type="number" min={0} step="any" disabled={!canWrite} value={form.pointsPerBlock} onChange={(e) => set('pointsPerBlock')(e.target.value)} placeholder="e.g. 5" />
        </Field>
        <Field label="1 point = ₹ *" error={errors.pointValue}>
          <Input type="number" min={0} step="any" disabled={!canWrite} value={form.pointValue} onChange={(e) => set('pointValue')(e.target.value)} placeholder="e.g. 1" />
        </Field>
        <Field label="Minimum points to redeem *" error={errors.minPointsToRedeem}>
          <Input type="number" min={0} step={1} disabled={!canWrite} value={form.minPointsToRedeem} onChange={(e) => set('minPointsToRedeem')(e.target.value)} placeholder="e.g. 100" />
        </Field>
      </div>

      <Field label="Points expire after (days)" error={errors.pointsExpireAfterDays} hint="Leave empty if points never expire.">
        <Input type="number" min={1} step={1} disabled={!canWrite} value={form.pointsExpireAfterDays} onChange={(e) => set('pointsExpireAfterDays')(e.target.value)} placeholder="e.g. 365" />
      </Field>

      {canExplain && (
        <p className="flex items-start gap-2 rounded-lg bg-primary-soft px-3 py-2.5 text-base text-heading">
          <Info size={18} className="mt-0.5 shrink-0 text-primary" />
          <span>
            With these rules, a {inr(1000)} bill earns <strong>{num(earned)} points</strong>, worth <strong>{inr(earned * value)}</strong> on the next visit.
          </span>
        </p>
      )}

      {canWrite ? (
        <Button type="submit" fullWidth isLoading={isPending} loadingText={isSetup ? 'Setting up...' : 'Saving...'} disabled={!isSetup && !dirty}>
          {isSetup ? 'Set up loyalty programme' : 'Save rules'}
        </Button>
      ) : (
        <p className="text-sm text-muted">You have view-only access to the loyalty programme.</p>
      )}
    </form>
  );
};

// ── Tier form (add / edit in a side panel) ───────────────────────────────────
const TierForm = ({
  initial,
  existing,
  isPending,
  onSubmit,
  onCancel,
}: {
  initial?: LoyaltyTier;
  existing: LoyaltyTier[];
  isPending: boolean;
  onSubmit: (tier: LoyaltyTier) => Promise<void>;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [minPoints, setMinPoints] = useState(numStr(initial?.minPoints));
  const [multiplier, setMultiplier] = useState(numStr(initial?.multiplier));
  const [benefits, setBenefits] = useState((initial?.benefits ?? []).join('\n'));
  const [errors, setErrors] = useState<{ name?: string; minPoints?: string; multiplier?: string }>({});

  // Other tiers, so we can catch duplicate names or thresholds
  // const others = existing.filter((t) => t !== initial);

  const others = initial ? existing.filter((t) => !sameTier(t, initial)) : existing;

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Tier name is required';
    else if (others.some((t) => t.name.trim().toLowerCase() === name.trim().toLowerCase())) e.name = 'A tier with this name already exists';
    if (minPoints === '' || Number(minPoints) < 0 || !isWhole(minPoints)) e.minPoints = 'Enter a whole number, 0 or more';
    else if (others.some((t) => t.minPoints === Number(minPoints))) e.minPoints = 'Another tier already starts at this point level';
    if (multiplier && Number(multiplier) <= 0) e.multiplier = 'Enter a value greater than 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const list = benefits
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);
    const tier: LoyaltyTier = { ...(initial ?? {}), name: name.trim(), minPoints: Number(minPoints), benefits: list };
    if (multiplier) tier.multiplier = Number(multiplier);
    else delete tier.multiplier;
    await onSubmit(tier);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Tier name *" error={errors.name}>
        <Input value={name} onChange={(e) => { setName(e.target.value); setErrors((er) => ({ ...er, name: undefined })); }} placeholder="e.g. Silver, Gold, Platinum" />
      </Field>

      <Field label="Minimum points *" error={errors.minPoints} hint="Points a customer needs to reach this tier. Use 0 for the starting tier.">
        <Input type="number" min={0} step={1} value={minPoints} onChange={(e) => { setMinPoints(e.target.value); setErrors((er) => ({ ...er, minPoints: undefined })); }} />
      </Field>

      <Field label="Points multiplier" error={errors.multiplier} hint="Optional. For example 1.5 earns 50% more points at this tier.">
        <Input type="number" min={0} step="any" value={multiplier} onChange={(e) => { setMultiplier(e.target.value); setErrors((er) => ({ ...er, multiplier: undefined })); }} placeholder="e.g. 1.5" />
      </Field>

      <Field label="Benefits" hint="One benefit per line.">
        <textarea className={textareaClass} value={benefits} onChange={(e) => setBenefits(e.target.value)} placeholder={'Free dessert on birthdays\nPriority seating'} />
      </Field>

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} loadingText="Saving...">
          {initial ? 'Save tier' : 'Add tier'}
        </Button>
      </div>
    </form>
  );
};

// ── Tiers card ───────────────────────────────────────────────────────────────
const TierList = ({
  tiers,
  canWrite,
  onEdit,
  onRemove,
}: {
  tiers: LoyaltyTier[];
  canWrite: boolean;
  onEdit: (tier: LoyaltyTier) => void;
  onRemove: (tier: LoyaltyTier) => void;
}) => (
  <ul className="flex flex-col divide-y divide-border">
    {sortTiers(tiers).map((tier) => {
      const benefits = tier.benefits ?? [];
      return (
        <li key={`${tier.name}-${tier.minPoints}`} className="flex items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-heading">{tier.name}</p>
              {tier.multiplier ? (
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-medium text-primary">{tier.multiplier}x points</span>
              ) : null}
            </div>
            <p className="text-base text-muted">From {num(tier.minPoints)} points</p>
            {benefits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {benefits.slice(0, 3).map((b) => (
                  <span key={b} className="rounded-full bg-page px-2.5 py-1 text-sm text-body">
                    {b}
                  </span>
                ))}
                {benefits.length > 3 && <span className="rounded-full bg-page px-2.5 py-1 text-sm text-muted">+{benefits.length - 3} more</span>}
              </div>
            )}
          </div>
          {canWrite && (
            <div className="flex shrink-0 items-center gap-1.5">
              <IconAction label="Edit tier" onClick={() => onEdit(tier)}>
                <Pencil size={18} />
              </IconAction>
              <IconAction danger label="Remove tier" onClick={() => onRemove(tier)}>
                <Trash2 size={18} />
              </IconAction>
            </div>
          )}
        </li>
      );
    })}
  </ul>
);

// Reserved for programme stats (members, points outstanding, redemption value...) that will be built later
const StatsSlot = () => null;

// ── Main page ────────────────────────────────────────────────────────────────
type TierPanel = { mode: 'add' } | { mode: 'edit'; tier: LoyaltyTier } | null;

const LoyaltyProgramMain = () => {
  const { currentRole } = useAuthData();
  const canWrite = LOYALTY_PROGRAM_WRITE_ROLES.includes(currentRole as never);

  const { data: program, isLoading, error } = useGetLoyaltyProgram();
  const { mutateAsync: createAsync, isPending: creating } = useCreateLoyaltyProgram();
  const { mutateAsync: updateAsync, isPending: updating } = useUpdateLoyaltyProgram();

  const [tierPanel, setTierPanel] = useState<TierPanel>(null);
  const [removing, setRemoving] = useState<LoyaltyTier | null>(null);


  const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

  // The programme is one record per organisation: a missing record means it hasn't been set up yet
  const notSetUp = !isLoading && (!program || (!!error && /not found/i.test((error as Error).message)));
  const realError = !!error && !notSetUp;
  const tiers = program?.tiers ?? [];

  const handleSaveRules = async (payload: LoyaltyProgramPayload) => {
    try {
      if (notSetUp) {
        await createAsync(payload);
        toast.success('Loyalty programme created');
      } else {
        await updateAsync(payload);
        toast.success('Loyalty rules saved');
      }
    } catch (e) {
      toast.error(errMsg(e, 'Failed to save loyalty rules'));
    }
  };

  const saveTiers = async (next: LoyaltyTier[], successMessage: string, failMessage: string) => {
    try {
      await updateAsync({ tiers: sortTiers(next) });
      toast.success(successMessage);
      return true;
    } catch (e) {
      toast.error(errMsg(e, failMessage));
      return false;
    }
  };

  const handleSaveTier = async (tier: LoyaltyTier) => {
    if (!tierPanel) return;
    // const next = tierPanel.mode === 'add' ? [...tiers, tier] : tiers.map((t) => (t === tierPanel.tier ? tier : t));

    const next = tierPanel.mode === 'add'
      ? [...tiers, tier]
      : tiers.map((t) => (sameTier(t, tierPanel.tier) ? tier : t));

    const ok = await saveTiers(next, tierPanel.mode === 'add' ? 'Tier added' : 'Tier updated', 'Failed to save tier');
    if (ok) setTierPanel(null);
  };

  const handleRemoveTier = async () => {
    if (!removing) return;
    const ok = await saveTiers(
      // tiers.filter((t) => t !== removing),
      tiers.filter((t) => !sameTier(t, removing)),
      `${removing.name} removed`,
      'Failed to remove tier'
    );
    if (ok) setRemoving(null);
  };

  const status = notSetUp ? { label: 'Not set up', style: 'bg-page text-muted' } : program?.isEnabled ? { label: 'Active', style: 'bg-success-soft text-success' } : { label: 'Disabled', style: 'bg-page text-muted' };

  return (
    <div className="flex w-full flex-col gap-5 p-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Star size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-heading">Loyalty</h1>
            <p className="text-sm text-muted">Points are earned at billing and redeemed against the bill total</p>
          </div>
        </div>
        {!isLoading && !realError && (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${status.style}`}>{status.label}</span>
        )}
      </div>

      {/* Space for programme stats, to be built later */}
      <StatsSlot />

      {isLoading ? (
        <div className='flex justify-center items-center h-80'>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>

        </div>
      ) : realError ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-16 text-center">
          <p className="text-base font-medium text-danger">{(error as Error).message}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <SectionCard
            title={notSetUp ? 'Set up your loyalty programme' : 'Programme rules'}
            subtitle={notSetUp ? 'Choose how customers earn and redeem points' : 'How customers earn and redeem points'}
          >
            {notSetUp && !canWrite ? (
              <p className="text-base text-muted">The loyalty programme hasn&apos;t been set up yet. Ask an owner or admin to set it up.</p>
            ) : (
              <RulesForm key={program?.updatedAt ?? 'new'} program={program} canWrite={canWrite} isPending={creating || updating} onSubmit={handleSaveRules} />
            )}
          </SectionCard>

          <SectionCard
            title="Tiers"
            subtitle="Reward customers as they earn more points"
            action={
              canWrite && !notSetUp ? (
                <Button variant="outline" leftIcon={<Plus size={16} />} onClick={() => setTierPanel({ mode: 'add' })}>
                  Add tier
                </Button>
              ) : undefined
            }
          >
            {notSetUp ? (
              <p className="text-base text-muted">Set up the programme first, then add tiers like Silver, Gold or Platinum.</p>
            ) : tiers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-10 text-center">
                <Star size={32} className="text-muted" />
                <p className="text-lg font-semibold text-heading">No tiers yet</p>
                <p className="text-base text-muted">Add tiers like Silver, Gold or Platinum to reward your regulars.</p>
                {canWrite && (
                  <div className="mt-2">
                    <Button leftIcon={<Plus size={16} />} onClick={() => setTierPanel({ mode: 'add' })}>
                      Add tier
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <TierList tiers={tiers} canWrite={canWrite} onEdit={(tier) => setTierPanel({ mode: 'edit', tier })} onRemove={setRemoving} />
            )}
          </SectionCard>
        </div>
      )}

      <SideModal isOpen={!!tierPanel} onClose={() => setTierPanel(null)} title={tierPanel?.mode === 'edit' ? 'Edit tier' : 'Add tier'}>
        {tierPanel && (
          <TierForm
            key={tierPanel.mode === 'edit' ? tierPanel.tier.name : 'new'}
            initial={tierPanel.mode === 'edit' ? tierPanel.tier : undefined}
            existing={tiers}
            isPending={updating}
            onSubmit={handleSaveTier}
            onCancel={() => setTierPanel(null)}
          />
        )}
      </SideModal>

      {removing && <ConfirmDialog tier={removing} isPending={updating} onCancel={() => setRemoving(null)} onConfirm={handleRemoveTier} />}
    </div>
  );
};

export default LoyaltyProgramMain;