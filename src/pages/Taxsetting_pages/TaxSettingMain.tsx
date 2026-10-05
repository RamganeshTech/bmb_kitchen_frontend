import { useState, type ReactNode } from 'react';
import { Percent, Plus, RefreshCw, Save, ShieldAlert } from 'lucide-react';
import { useAuthData } from '../../hooks/useAuthData';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SideModal } from '../../components/ui/SideModal';
import { Toggle } from '../../components/ui/Toggle';
import { TableContainer, THead, Th, TBody, Tr, Td } from '../../components/ui/Table';
import {
    TAX_SETTINGS_WRITE_ROLES,
    useAddTaxRate,
    useCreateTaxSettings,
    useGetTaxSettings,
    useSetDefaultTaxRate,
    useUpdateTaxSettings,
    type TaxMode,
    type TaxRate,
} from '../../api_service/taxSetting_api/taxSettingApi';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_SERVICE_CHARGE_PERCENT = 20; // mirrors the backend max
const MAX_TAX_RATE_PERCENT = 100;
const PREVIEW_BILL_AMOUNT = 1000;

const TAX_MODE_OPTIONS: { value: TaxMode; title: string; description: string }[] = [
    {
        value: 'exclusive',
        title: 'Tax exclusive',
        description: 'Tax is added on top of the menu price at billing.',
    },
    {
        value: 'inclusive',
        title: 'Tax inclusive',
        description: 'Menu prices already include tax. It is shown as part of the bill.',
    },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface TaxSettingsDraft {
    mode: TaxMode;
    serviceChargeInput: string;
    applyServiceChargeOnDineIn: boolean;
}

interface TaxSettingsSubmitValues {
    mode: TaxMode;
    serviceCharge: number;
    scOnDinein: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const inrFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
});

const formatInr = (amount: number) => inrFormatter.format(amount);

// The hooks wrap the axios error as `new Error(message, { cause })`, so the HTTP status lives on cause.response.
const getHttpStatus = (error: unknown) =>
    (error as { cause?: { response?: { status?: number } } } | null)?.cause?.response?.status;

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

// ── Small presentational pieces ───────────────────────────────────────────────
// const DefaultRateBadge = () => (
//     <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
//         Default
//     </span>
// );

const DefaultRateBadge = () => (
    <span className="inline-flex items-center rounded-full bg-success px-2.5 py-1 text-xs font-medium text-white">
        Default
    </span>
);
const PreviewRow = ({ label, value, isEmphasised = false }: { label: string; value: string; isEmphasised?: boolean }) => (
    <div className={`flex items-center justify-between gap-3 ${isEmphasised ? 'border-t border-border pt-3' : ''}`}>
        <span className={isEmphasised ? 'font-semibold text-heading ' : 'text-body font-medium'}>{label}</span>
        <span className={isEmphasised ? 'text-lg font-semibold text-heading' : 'font-medium text-heading'}>{value}</span>
    </div>
);

const TaxModeSelector = ({
    selectedMode,
    isDisabled,
    onModeChange,
}: {
    selectedMode: TaxMode;
    isDisabled: boolean;
    onModeChange: (mode: TaxMode) => void;
}) => (
    <div role="radiogroup" aria-label="Tax calculation mode" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TAX_MODE_OPTIONS.map((option) => {
            const isSelected = option.value === selectedMode;
            return (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isDisabled}
                    onClick={() => onModeChange(option.value)}
                    className={`flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isSelected ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-hover'
                        }`}
                >
                    <span className="font-semibold text-heading">{option.title}</span>
                    <span className="text-sm font-medium text-muted">{option.description}</span>
                </button>
            );
        })}
    </div>
);

const BillPreviewCard = ({
    mode,
    serviceChargePercent,
    applyServiceChargeOnDineIn,
    defaultTaxRate,
}: {
    mode: TaxMode;
    serviceChargePercent: number;
    applyServiceChargeOnDineIn: boolean;
    defaultTaxRate?: TaxRate;
}) => {
    const serviceChargeAmount = (PREVIEW_BILL_AMOUNT * serviceChargePercent) / 100;
    const taxPercent = defaultTaxRate?.percentage ?? 0;
    const taxAmount =
        mode === 'exclusive'
            ? (PREVIEW_BILL_AMOUNT * taxPercent) / 100
            : PREVIEW_BILL_AMOUNT - PREVIEW_BILL_AMOUNT / (1 + taxPercent / 100);
    const grandTotal =
        mode === 'exclusive' ? PREVIEW_BILL_AMOUNT + serviceChargeAmount + taxAmount : PREVIEW_BILL_AMOUNT + serviceChargeAmount;

    return (
        <Card className="flex flex-col gap-3 p-5">
            <div>
                <h2 className="text-lg font-semibold text-heading">Bill preview</h2>
                <p className="text-sm font-medium text-muted">How a {formatInr(PREVIEW_BILL_AMOUNT)} dine-in bill would look.</p>
            </div>

            <div className="flex flex-col gap-3 text-sm">
                <PreviewRow label="Item total" value={formatInr(PREVIEW_BILL_AMOUNT)} />
                <PreviewRow
                    label={`Service charge (${serviceChargePercent}%)`}
                    value={applyServiceChargeOnDineIn || serviceChargePercent === 0 ? formatInr(serviceChargeAmount) : formatInr(0)}
                />
                {defaultTaxRate ? (
                    <PreviewRow
                        label={`${defaultTaxRate.name}${mode === 'inclusive' ? ' (included)' : ''}`}
                        value={formatInr(taxAmount)}
                    />
                ) : (
                    <p className="text-muted">The tax line appears once a default rate exists.</p>
                )}
                <PreviewRow label="Total" value={formatInr(grandTotal)} isEmphasised />
            </div>
        </Card>
    );
};

// ── Settings form (create + update share it) ──────────────────────────────────
const TaxSettingsForm = ({
    savedDraft,
    defaultTaxRate,
    canEditTaxSettings,
    isSubmitting,
    submitLabel,
    submittingLabel,
    isChangeRequiredToSubmit,
    onSubmit,
}: {
    savedDraft: TaxSettingsDraft;
    defaultTaxRate?: TaxRate;
    canEditTaxSettings: boolean;
    isSubmitting: boolean;
    submitLabel: string;
    submittingLabel: string;
    isChangeRequiredToSubmit: boolean;
    onSubmit: (values: TaxSettingsSubmitValues) => Promise<void>;
}) => {
    const [draft, setDraft] = useState<TaxSettingsDraft>(savedDraft);

    const isDraftChanged =
        draft.mode !== savedDraft.mode ||
        draft.serviceChargeInput !== savedDraft.serviceChargeInput ||
        draft.applyServiceChargeOnDineIn !== savedDraft.applyServiceChargeOnDineIn;

    const serviceChargePercent = Number(draft.serviceChargeInput) || 0;

    const handleSubmit = async () => {
        const serviceCharge = Number(draft.serviceChargeInput);
        if (draft.serviceChargeInput === '' || Number.isNaN(serviceCharge)) {
            toast.error('Enter a service charge percentage (use 0 for none)');
            return;
        }
        if (serviceCharge < 0 || serviceCharge > MAX_SERVICE_CHARGE_PERCENT) {
            toast.error(`Service charge must be between 0 and ${MAX_SERVICE_CHARGE_PERCENT}%`);
            return;
        }
        await onSubmit({ mode: draft.mode, serviceCharge, scOnDinein: draft.applyServiceChargeOnDineIn });
    };

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="flex flex-col gap-6 p-5 lg:col-span-2">
                <div>
                    <h2 className="text-lg font-semibold text-heading">Billing rules</h2>
                    <p className="text-sm font-medium text-muted">These rules apply to every bill in your organization.</p>
                </div>

                <div className="flex flex-col gap-2">
                    <Label>How is tax calculated?</Label>
                    <TaxModeSelector
                        selectedMode={draft.mode}
                        isDisabled={!canEditTaxSettings}
                        onModeChange={(mode) => setDraft((current) => ({ ...current, mode }))}
                    />
                </div>

                <div className="flex flex-col gap-1.5 sm:max-w-xs">
                    <Label htmlFor="serviceChargePercent">Service charge (%)</Label>
                    <Input
                        id="serviceChargePercent"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={MAX_SERVICE_CHARGE_PERCENT}
                        step={0.5}
                        disabled={!canEditTaxSettings}
                        value={draft.serviceChargeInput}
                        onChange={(event) => setDraft((current) => ({ ...current, serviceChargeInput: event.target.value }))}
                    />
                    <p className="text-sm font-medium text-muted">Between 0 and {MAX_SERVICE_CHARGE_PERCENT}%. Use 0 to turn it off.</p>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-page p-4">
                    <div>
                        <p className="font-medium text-heading">Charge on dine-in orders</p>
                        <p className="text-sm font-medium text-muted">Apply the service charge to dine-in bills.</p>
                    </div>
                    <Toggle
                        checked={draft.applyServiceChargeOnDineIn}
                        disabled={!canEditTaxSettings}
                        onChange={(isChecked: boolean) =>
                            setDraft((current) => ({ ...current, applyServiceChargeOnDineIn: isChecked }))
                        }
                        aria-label="Apply service charge on dine-in orders"
                    />
                </div>

                {canEditTaxSettings && (
                    <div className="flex justify-end">
                        <Button
                            leftIcon={<Save size={16} />}
                            isLoading={isSubmitting}
                            loadingText={submittingLabel}
                            disabled={isChangeRequiredToSubmit && !isDraftChanged}
                            onClick={handleSubmit}
                        >
                            {submitLabel}
                        </Button>
                    </div>
                )}
            </Card>

            <BillPreviewCard
                mode={draft.mode}
                serviceChargePercent={serviceChargePercent}
                applyServiceChargeOnDineIn={draft.applyServiceChargeOnDineIn}
                defaultTaxRate={defaultTaxRate}
            />
        </div>
    );
};

const LoadingState = () => (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading tax settings">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="h-80 animate-pulse rounded-xl bg-border lg:col-span-2" />
            <div className="h-80 animate-pulse rounded-xl bg-border" />
        </div>
        <div className="h-56 animate-pulse rounded-xl bg-border" />
    </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TaxSettingsMain() {
    const { currentRole } = useAuthData();
    const canEditTaxSettings =
        !!currentRole && (TAX_SETTINGS_WRITE_ROLES as string[]).includes(currentRole);

    const { data: taxSettings, isLoading, error, refetch, isFetching } = useGetTaxSettings();
    const { mutateAsync: createTaxSettingsAsync, isPending: isCreatingTaxSettings } = useCreateTaxSettings();
    const { mutateAsync: updateTaxSettingsAsync, isPending: isUpdatingTaxSettings } = useUpdateTaxSettings();
    const { mutateAsync: addTaxRateAsync, isPending: isAddingTaxRate } = useAddTaxRate();
    const { mutateAsync: setDefaultTaxRateAsync } = useSetDefaultTaxRate();

    const [isAddRatePanelOpen, setIsAddRatePanelOpen] = useState(false);
    const [newRateName, setNewRateName] = useState('');
    const [newRatePercentageInput, setNewRatePercentageInput] = useState('');
    const [rateBeingMadeDefaultId, setRateBeingMadeDefaultId] = useState<string | null>(null);

    // Singleton per organization: a 404 means tax settings have not been created yet.
    const isTaxSettingsMissing = !taxSettings && getHttpStatus(error) === 404;
    const hasLoadFailed = !!error && !isTaxSettingsMissing;

    const taxRates = taxSettings?.rates ?? [];
    // On the backend the default slab is the rate flagged isActive.
    const defaultTaxRate = taxRates.find((rate) => rate.isActive);

    const handleCreateTaxSettings = async (values: TaxSettingsSubmitValues) => {
        try {
            await createTaxSettingsAsync(values);
            toast.success('Tax settings created');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not create tax settings'));
        }
    };

    const handleUpdateTaxSettings = async (values: TaxSettingsSubmitValues) => {
        try {
            await updateTaxSettingsAsync(values);
            toast.success('Tax settings saved');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not save tax settings'));
        }
    };

    const handleSetDefaultTaxRate = async (taxRate: TaxRate) => {
        setRateBeingMadeDefaultId(taxRate._id);
        try {
            await setDefaultTaxRateAsync(taxRate._id);
            toast.success(`${taxRate.name} is now the default rate`);
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not change the default rate'));
        } finally {
            setRateBeingMadeDefaultId(null);
        }
    };

    const closeAddRatePanel = () => {
        setIsAddRatePanelOpen(false);
        setNewRateName('');
        setNewRatePercentageInput('');
    };

    const handleAddTaxRate = async () => {
        const trimmedRateName = newRateName.trim();
        const ratePercentage = Number(newRatePercentageInput);

        if (!trimmedRateName) {
            toast.error('Rate name is required');
            return;
        }
        if (taxRates.some((rate) => rate.name.trim().toLowerCase() === trimmedRateName.toLowerCase())) {
            toast.error('A rate with this name already exists');
            return;
        }
        if (newRatePercentageInput === '' || Number.isNaN(ratePercentage) || ratePercentage < 0 || ratePercentage > MAX_TAX_RATE_PERCENT) {
            toast.error(`Enter a percentage between 0 and ${MAX_TAX_RATE_PERCENT}`);
            return;
        }

        try {
            await addTaxRateAsync({ name: trimmedRateName, percentage: ratePercentage });
            toast.success(`${trimmedRateName} added`);
            closeAddRatePanel();
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not add the tax rate'));
        }
    };

    const handleAddRateSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        handleAddTaxRate();
    };

    // ── Body ────────────────────────────────────────────────────────────────────
    let pageBody: ReactNode;

    if (isLoading) {
        pageBody = <LoadingState />;
    } else if (hasLoadFailed) {
        pageBody = (
            <Card className="flex flex-col items-center gap-3 p-10 text-center">
                <ShieldAlert size={32} className="text-danger" />
                <h2 className="text-lg font-semibold text-heading">Couldn't load tax settings</h2>
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
    } else if (!taxSettings) {
        pageBody = canEditTaxSettings ? (
            <>
                <Card className="flex flex-col gap-1 p-5">
                    <h2 className="text-lg font-semibold text-heading">Set up tax settings</h2>
                    <p className="text-sm text-muted">
                        Choose how tax and service charge work. The standard GST rates (5%, 12% and 18%) are added for you, and you can
                        add more afterwards.
                    </p>
                </Card>
                <TaxSettingsForm
                    savedDraft={{ mode: 'exclusive', serviceChargeInput: '0', applyServiceChargeOnDineIn: true }}
                    canEditTaxSettings
                    isSubmitting={isCreatingTaxSettings}
                    submitLabel="Create tax settings"
                    submittingLabel="Creating"
                    isChangeRequiredToSubmit={false}
                    onSubmit={handleCreateTaxSettings}
                />
            </>
        ) : (
            <Card className="flex flex-col items-center gap-3 p-10 text-center">
                <ShieldAlert size={32} className="text-warning" />
                <h2 className="text-lg font-semibold text-heading">Tax settings aren't set up yet</h2>
                <p className="text-sm text-muted">Ask the owner, admin or CTO to set them up.</p>
            </Card>
        );
    } else {
        const savedMode: TaxMode = taxSettings.mode ?? 'exclusive';
        const savedServiceCharge = taxSettings.serviceCharge ?? 0;
        const savedApplyOnDineIn = taxSettings.scOnDinein ?? true;

        pageBody = (
            <>
                {!canEditTaxSettings && (
                    <div className="rounded-xl border border-border bg-info-soft px-4 py-3 text-sm font-medium text-info">
                        You have view-only access. Only the owner, admin or CTO can change tax settings.
                    </div>
                )}

                {/* Keyed by the saved values so the draft resets after a save, but not when only a rate changes. */}
                <TaxSettingsForm
                    key={`${savedMode}-${savedServiceCharge}-${savedApplyOnDineIn}`}
                    savedDraft={{
                        mode: savedMode,
                        serviceChargeInput: String(savedServiceCharge),
                        applyServiceChargeOnDineIn: savedApplyOnDineIn,
                    }}
                    defaultTaxRate={defaultTaxRate}
                    canEditTaxSettings={canEditTaxSettings}
                    isSubmitting={isUpdatingTaxSettings}
                    submitLabel="Save changes"
                    submittingLabel="Saving"
                    isChangeRequiredToSubmit
                    onSubmit={handleUpdateTaxSettings}
                />

                <section className="flex flex-col gap-3" aria-labelledby="tax-rates-heading">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 id="tax-rates-heading" className="text-lg font-semibold text-heading">
                                Tax rates
                            </h2>
                            <p className="text-sm font-medium text-muted">The default rate is applied to every bill.</p>
                        </div>
                        {canEditTaxSettings && (
                            <Button leftIcon={<Plus size={16} />} onClick={() => setIsAddRatePanelOpen(true)}>
                                Add rate
                            </Button>
                        )}
                    </div>

                    <TableContainer className="min-h-[300px]" ariaLabel="Tax rates" caption="Tax rates for this organization">
                        <THead>
                            <Tr>
                                <Th>S.No</Th>
                                <Th>Rate name</Th>
                                <Th>Percentage</Th>
                                <Th>Status</Th>
                                {canEditTaxSettings && <Th className='w-16 text-center'>Action</Th>}
                            </Tr>
                        </THead>
                        <TBody>
                            {taxRates.length === 0 ? (
                                <Tr>
                                    <Td colSpan={canEditTaxSettings ? 4 : 3}>
                                        <span className="text-muted">No tax rates yet. Add one to start charging tax.</span>
                                    </Td>
                                </Tr>
                            ) : (
                                taxRates.map((taxRate, idx) => (
                                    <Tr key={taxRate._id} ariaLabel={taxRate.name}>
                                        <Td className='font-medium'>
                                            <span className=" text-heading">{idx + 1}</span>
                                        </Td>
                                        <Td>
                                            <span className="font-medium text-heading">{taxRate.name}</span>
                                        </Td>
                                        <Td className='font-medium'>{taxRate.percentage}%</Td>
                                        <Td >{taxRate.isActive ? <DefaultRateBadge /> : <span className="text-muted">—</span>}</Td>
                                        {canEditTaxSettings && (
                                            <Td className='w-16 text-center'>
                                                {!taxRate.isActive && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        isLoading={rateBeingMadeDefaultId === taxRate._id}
                                                        loadingText="Updating"
                                                        disabled={rateBeingMadeDefaultId !== null}
                                                        onClick={() => handleSetDefaultTaxRate(taxRate)}
                                                    >
                                                        Make default
                                                    </Button>
                                                )}
                                            </Td>
                                        )}
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
            <header className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Percent size={20} />
                </span>
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-heading">Tax Settings</h1>
                    <p className="text-sm font-medium text-muted">Control GST, tax mode and service charge on bills</p>
                </div>
            </header>

            {pageBody}

            <SideModal
                isOpen={isAddRatePanelOpen}
                onClose={() => !isAddingTaxRate && closeAddRatePanel()}
                title="Add tax rate"
            >
                <form onSubmit={handleAddRateSubmit} noValidate className="flex flex-col gap-4">

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="newTaxRateName">Rate name</Label>
                        <Input
                            id="newTaxRateName"
                            value={newRateName}
                            onChange={(event) => setNewRateName(event.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="newTaxRatePercentage">Percentage (%)</Label>
                        <Input
                            id="newTaxRatePercentage"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={MAX_TAX_RATE_PERCENT}
                            step={0.5}
                            value={newRatePercentageInput}
                            onChange={(event) => setNewRatePercentageInput(event.target.value)}
                        />
                        <p className="text-sm text-muted">New rates start as non-default. Use "Make default" to apply one to bills.</p>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-border pt-5">
                        <Button type="button" variant="outline" onClick={closeAddRatePanel} disabled={isAddingTaxRate}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isAddingTaxRate} loadingText="Adding...">
                            Add rate
                        </Button>
                    </div>
                </form>
            </SideModal>
        </div>
    );
}