import { useState, type ReactNode } from 'react';
import {
    Archive, ChefHat, Minus, Pencil, Plus, Printer, Receipt, RefreshCw,
    RotateCcw, ShieldAlert, Trash2,
} from 'lucide-react';
import { useAuthData } from '../../hooks/useAuthData';
import { toast } from '../../components/ui/toast/Toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { SearchSelect } from '../../components/ui/SearchSelect';
import { SideModal } from '../../components/ui/SideModal';
import {
    PRINTER_WRITE_ROLES, useCreatePrinter, useHardDeletePrinter,
    useListActivePrinters, useListInactivePrinters, useRestorePrinter, useSoftDeletePrinter,
    useUpdatePrinter, type CreatePrinterPayload, type PrinterItem,
    type PrinterPaperSize, type PrinterType,
} from '../../api_service/printer_api/printerApi';
import { useGetOutletList } from '../../api_service/outlet_api/outletApi';
import { useGetMenuCategoryDropdown } from '../../api_service/menuCategory_api/menuCategoryApi';

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_COPIES = 1;
const MAX_COPIES = 4;

const PRINTER_TYPE_OPTIONS: { value: PrinterType; title: string; description: string; icon: ReactNode }[] = [
    { value: 'KOT', title: 'Kitchen (KOT)', description: 'Prints order tickets for the kitchen.', icon: <ChefHat size={18} /> },
    { value: 'Bill', title: 'Bill', description: 'Prints customer bills at the counter.', icon: <Receipt size={18} /> },
];

const PAPER_SIZE_OPTIONS: PrinterPaperSize[] = ['80mm', '58mm'];
const CONNECTION_QUICK_FILLS = [
    { label: 'USB', value: 'USB' },
    { label: 'LAN', value: 'LAN ' },
    { label: 'Bluetooth', value: 'Bluetooth' },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface PrinterFormValues {
    outletId: string;
    name: string;
    type: PrinterType;
    printerModel: string;
    connection: string;
    size: PrinterPaperSize;
    copies: number;
    categories: string[];
}

type PendingActionKind = 'deactivate' | 'restore' | 'hardDelete';
interface PendingAction {
    kind: PendingActionKind;
    printer: PrinterItem;
}

interface OutletListEntry {
    id?: string;
    _id?: string;
    name: string;
}

interface MenuCategoryDropdownEntry {
    id?: string;
    _id?: string;
    name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const getPrinterId = (printer: PrinterItem) => printer.id ?? printer._id;
const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const resolveOutletName = (printer: PrinterItem, outletNameById: Map<string, string>) =>
    typeof printer.outletId === 'string'
        ? (outletNameById.get(printer.outletId) ?? 'Unknown outlet')
        : (printer.outletId?.name ?? 'Unknown outlet');

const getOutletIdValue = (printer: PrinterItem) => (typeof printer.outletId === 'string' ? printer.outletId : printer.outletId?._id);

// ── Presentational pieces ─────────────────────────────────────────────────────
// const PrinterTypeBadge = ({ type }: { type: string }) => (
//     <span
//         className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${type === 'Bill' ? 'bg-primary text-primary-text' : 'bg-info-soft text-info'
//             }`}
//     >
//         {type === 'Bill' ? 'Bill' : 'Kitchen'}
//     </span>
// );

const PrinterTypeBadge = ({ type }: { type: string }) => (
    <span
        className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium text-white ${type === 'Bill' ? 'bg-primary' : 'bg-info'
            }`}
    >
        {type === 'Bill' ? 'Bill' : 'Kitchen'}
    </span>
);

const IconActionButton = ({
    label,
    icon,
    isDanger = false,
    onClick,
}: {
    label: string;
    icon: ReactNode;
    isDanger?: boolean;
    onClick: () => void;
}) => (
    <Button
        type="button"
        variant='ghost'
        aria-label={label}
        title={label}
        onClick={onClick}
        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover ${isDanger ? 'hover:text-danger' : 'hover:text-heading'
            }`}
    >
        {icon}
    </Button>
);

const PrinterSpec = ({ label, value }: { label: string; value: string }) => (
    <div className="min-w-0">
        <dt className="text-sm font-medium text-muted">{label}</dt>
        <dd className="truncate font-medium text-heading">{value}</dd>
    </div>
);

const PrinterCard = ({
    printer,
    outletName,
    isInactive,
    canManagePrinters,
    onEdit,
    onRequestAction,
}: {
    printer: PrinterItem;
    outletName: string;
    isInactive: boolean;
    canManagePrinters: boolean;
    onEdit: () => void;
    onRequestAction: (kind: PendingActionKind) => void;
}) => {
    const isKitchenPrinter = printer.type !== 'Bill';
    const assignedCategories = printer.categories ?? [];

    return (
        <Card className={`flex flex-col gap-4 p-5 ${isInactive ? 'opacity-80' : ''}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isKitchenPrinter ? 'bg-info-soft text-info' : 'bg-primary-soft text-primary'
                            }`}
                    >
                        <Printer size={20} />
                    </span>
                    <div className="min-w-0">
                        <h3 className="truncate font-semibold text-heading">{printer.name}</h3>
                        <p className="truncate text-sm font-medium text-muted">{outletName}</p>
                    </div>
                </div>
                <PrinterTypeBadge type={printer.type} />
            </div>

            <dl className="grid grid-cols-2 gap-3">
                <PrinterSpec label="Model" value={printer.printerModel || 'Not set'} />
                <PrinterSpec label="Connection" value={printer.conn || 'Not set'} />
                <PrinterSpec label="Paper" value={printer.size ?? '80mm'} />
                <PrinterSpec label="Copies" value={String(printer.copies ?? 1)} />
            </dl>

            <div className="flex min-h-9 flex-1 flex-col gap-2">
                {isKitchenPrinter ? (
                    assignedCategories.length > 0 ? (
                        <>
                            <p className="text-sm text-muted">Prints these categories</p>
                            <div className="flex flex-wrap gap-1.5">
                                {assignedCategories.map((categoryName) => (
                                    <span key={categoryName} className="rounded-full border border-border bg-page px-2.5 py-1 text-xs font-medium text-body">
                                        {categoryName}
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-muted">No categories assigned yet.</p>
                    )
                ) : (
                    <p className="text-sm font-medium text-muted">Used for customer bills.</p>
                )}
            </div>

            {canManagePrinters && (
                <div className="flex items-center justify-end gap-1 border-t border-border pt-3">
                    {isInactive ? (
                        <>
                            <IconActionButton label={`Restore ${printer.name}`} icon={<RotateCcw size={16} />} onClick={() => onRequestAction('restore')} />
                            <IconActionButton label={`Delete ${printer.name} permanently`} icon={<Trash2 size={16} />} isDanger onClick={() => onRequestAction('hardDelete')} />
                        </>
                    ) : (
                        <>
                            <IconActionButton label={`Edit ${printer.name}`} icon={<Pencil size={16} />} onClick={onEdit} />
                            <IconActionButton label={`Deactivate ${printer.name}`} icon={<Archive size={16} />} onClick={() => onRequestAction('deactivate')} />
                        </>
                    )}
                </div>
            )}
        </Card>
    );
};

const PrinterCardSkeletons = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading printers">
        {[0, 1, 2].map((index) => (
            <div key={index} className="h-60 animate-pulse rounded-xl bg-border" />
        ))}
    </div>
);

// ── Create / edit form panel ──────────────────────────────────────────────────
const PrinterFormPanel = ({
    isOpen,
    onClose,
    editingPrinter,
    defaultOutletId,
    outletOptions,
    menuCategoryNames,
    isSubmitting,
    onSubmit,
}: {
    isOpen: boolean;
    onClose: () => void;
    editingPrinter: PrinterItem | null;
    defaultOutletId: string;
    outletOptions: { label: string; value: string }[];
    menuCategoryNames: string[];
    isSubmitting: boolean;
    onSubmit: (values: PrinterFormValues) => Promise<boolean>;
}) => {
    const isEditing = !!editingPrinter;

    const [formValues, setFormValues] = useState<PrinterFormValues>({
        outletId: editingPrinter ? (getOutletIdValue(editingPrinter) ?? '') : defaultOutletId,
        name: editingPrinter?.name ?? '',
        type: (editingPrinter?.type as PrinterType) ?? 'KOT',
        printerModel: editingPrinter?.printerModel ?? '',
        connection: editingPrinter?.conn ?? '',
        size: (editingPrinter?.size as PrinterPaperSize) ?? '80mm',
        copies: editingPrinter?.copies ?? 1,
        categories: editingPrinter?.categories ?? [],
    });

    const updateFormValues = (changes: Partial<PrinterFormValues>) => setFormValues((current) => ({ ...current, ...changes }));

    // Keep categories that were saved earlier even if the menu category has since been renamed or removed.
    const selectableCategoryNames = [...new Set([...menuCategoryNames, ...formValues.categories])];

    const toggleCategory = (categoryName: string) =>
        updateFormValues({
            categories: formValues.categories.includes(categoryName)
                ? formValues.categories.filter((name) => name !== categoryName)
                : [...formValues.categories, categoryName],
        });

    const handleSubmit = async () => {
        // if (!isEditing && !formValues.outletId) return toast.error('Select the outlet this printer belongs to');
        if (!formValues.outletId) {
            return toast.error('Select the outlet this printer belongs to');
        }
        if (!formValues.name.trim()) return toast.error('Printer name is required');
        const wasSaved = await onSubmit({ ...formValues, name: formValues.name.trim() });
        if (wasSaved) onClose();
    };


    const handleFormSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        handleSubmit();
    };

    return (
        <SideModal
            isOpen={isOpen}
            onClose={() => !isSubmitting && onClose()}
            title={isEditing ? 'Edit printer' : 'Add printer'}
        >
            <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-5">

                <div className="flex flex-col gap-5">
                    {/* {isEditing ? (
          <div className="rounded-xl border border-border bg-page p-4">
            <p className="text-sm text-muted">Outlet</p>
            <p className="font-medium text-heading">{outletOptions.find((option) => option.value === formValues.outletId)?.label ?? 'Unknown outlet'}</p>
            <p className="text-sm text-muted">A printer can't be moved to another outlet. Add a new one instead.</p>
          </div>
        ) : ( */}
                    <SearchSelect
                        label="Outlet"
                        options={outletOptions}
                        value={formValues.outletId}
                        placeholder="Select outlet"
                        onChange={(option) => updateFormValues({ outletId: String(option.value) })}
                        onClear={() => updateFormValues({ outletId: '' })}
                    />
                    {/* )} */}

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="printerName">Printer name</Label>
                        <Input id="printerName" value={formValues.name} onChange={(event) => updateFormValues({ name: event.target.value })} />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label>Printer type</Label>
                        <div role="radiogroup" aria-label="Printer type" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {PRINTER_TYPE_OPTIONS.map((option) => {
                                const isSelected = formValues.type === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        onClick={() => updateFormValues({ type: option.value })}
                                        className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-colors ${isSelected ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-hover'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2 font-semibold text-heading">
                                            {option.icon}
                                            {option.title}
                                        </span>
                                        <span className="text-sm text-muted">{option.description}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="printerModel">Printer model (optional)</Label>
                        <Input id="printerModel" value={formValues.printerModel} onChange={(event) => updateFormValues({ printerModel: event.target.value })} />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="printerConnection">Connection</Label>
                        <Input
                            id="printerConnection"
                            placeholder="For example LAN 192.168.1.44"
                            value={formValues.connection}
                            onChange={(event) => updateFormValues({ connection: event.target.value })}
                        />
                        <div className="flex flex-wrap gap-2">
                            {CONNECTION_QUICK_FILLS.map((quickFill) => (
                                <button
                                    key={quickFill.label}
                                    type="button"
                                    onClick={() => updateFormValues({ connection: quickFill.value })}
                                    className="rounded-full border border-border px-3 py-1 text-sm text-body hover:bg-surface-hover"
                                >
                                    {quickFill.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label>Paper size</Label>
                            <div role="radiogroup" aria-label="Paper size" className="inline-flex w-fit rounded-lg border border-border bg-surface p-1">
                                {PAPER_SIZE_OPTIONS.map((paperSize) => (
                                    <button
                                        key={paperSize}
                                        type="button"
                                        role="radio"
                                        aria-checked={formValues.size === paperSize}
                                        onClick={() => updateFormValues({ size: paperSize })}
                                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${formValues.size === paperSize ? 'bg-primary text-white' : 'text-body hover:bg-surface-hover'
                                            }`}
                                    >
                                        {paperSize}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Copies per print</Label>
                            <div className="inline-flex w-fit items-center gap-3 rounded-lg border border-border bg-surface p-1">
                                <button
                                    type="button"
                                    aria-label="Decrease copies"
                                    disabled={formValues.copies <= MIN_COPIES}
                                    onClick={() => updateFormValues({ copies: formValues.copies - 1 })}
                                    className="flex h-8 w-8 items-center justify-center rounded-md text-body hover:bg-surface-hover disabled:opacity-40"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="w-6 text-center font-semibold text-heading" aria-live="polite">
                                    {formValues.copies}
                                </span>
                                <button
                                    type="button"
                                    aria-label="Increase copies"
                                    disabled={formValues.copies >= MAX_COPIES}
                                    onClick={() => updateFormValues({ copies: formValues.copies + 1 })}
                                    className="flex h-8 w-8 items-center justify-center rounded-md text-body hover:bg-surface-hover disabled:opacity-40"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {formValues.type === 'KOT' && (
                        <div className="flex flex-col gap-2">
                            <Label>Menu categories for this printer</Label>
                            {selectableCategoryNames.length === 0 ? (
                                <p className="text-sm text-muted">No menu categories yet. Add categories in Menu Management first.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {selectableCategoryNames.map((categoryName) => {
                                        const isSelected = formValues.categories.includes(categoryName);
                                        return (
                                            <button
                                                key={categoryName}
                                                type="button"
                                                aria-pressed={isSelected}
                                                onClick={() => toggleCategory(categoryName)}
                                                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${isSelected ? 'border-primary bg-primary-soft text-heading' : 'border-border bg-surface text-body hover:bg-surface-hover'
                                                    }`}
                                            >
                                                {categoryName}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-5">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting} loadingText="Saving...">
                        {isEditing ? 'Save changes' : 'Add printer'}
                    </Button>
                </div>
            </form>
        </SideModal>
    );
};

// ── Confirmation copy ─────────────────────────────────────────────────────────
const buildConfirmationCopy = ({ kind, printer }: PendingAction) => {
    switch (kind) {
        case 'deactivate':
            return { title: 'Deactivate printer', message: `${printer.name} will stop printing. You can restore it later.`, confirmLabel: 'Deactivate', loadingLabel: 'Deactivating', isDanger: false };
        case 'restore':
            return { title: 'Restore printer', message: `${printer.name} will be active again.`, confirmLabel: 'Restore', loadingLabel: 'Restoring', isDanger: false };
        case 'hardDelete':
            return { title: 'Delete permanently', message: `${printer.name} will be deleted for good. This cannot be undone.`, confirmLabel: 'Delete permanently', loadingLabel: 'Deleting', isDanger: true };
    }
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PrinterSettingsMain() {
    const { currentRole } = useAuthData();
    const canManagePrinters = !!currentRole && (PRINTER_WRITE_ROLES as string[]).includes(currentRole);

    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
    const [selectedOutletId, setSelectedOutletId] = useState('');
    const [printerTypeFilter, setPrinterTypeFilter] = useState<'all' | PrinterType>('all');
    const [isFormPanelOpen, setIsFormPanelOpen] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState<PrinterItem | null>(null);
    const [formSessionKey, setFormSessionKey] = useState(0);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const outletFilter = selectedOutletId || undefined;
    const { data: activePrinters = [], isLoading: isActiveLoading, error: activeError, refetch: refetchActive, isFetching: isActiveFetching } = useListActivePrinters(outletFilter);
    const { data: inactivePrinters = [], isLoading: isInactiveLoading } = useListInactivePrinters(outletFilter);
    const { data: outletList = [] } = useGetOutletList();
    const { data: menuCategoryDropdown = [] } = useGetMenuCategoryDropdown();

    const { mutateAsync: createPrinterAsync, isPending: isCreatingPrinter } = useCreatePrinter();
    const { mutateAsync: updatePrinterAsync, isPending: isUpdatingPrinter } = useUpdatePrinter();
    const { mutateAsync: softDeletePrinterAsync, isPending: isDeactivatingPrinter } = useSoftDeletePrinter();
    const { mutateAsync: restorePrinterAsync, isPending: isRestoringPrinter } = useRestorePrinter();
    const { mutateAsync: hardDeletePrinterAsync, isPending: isHardDeletingPrinter } = useHardDeletePrinter();
    const isActionInProgress = isDeactivatingPrinter || isRestoringPrinter || isHardDeletingPrinter;

    const outletEntries = outletList as OutletListEntry[];
    const outletOptions = outletEntries.map((outlet) => ({ label: outlet.name, value: outlet.id ?? outlet._id ?? '' }));
    const outletNameById = new Map(outletOptions.map((option) => [option.value, option.label]));
    const menuCategoryNames = (menuCategoryDropdown as MenuCategoryDropdownEntry[]).map((category) => category.name);

    const isActiveTab = activeTab === 'active';
    const printersForTab = isActiveTab ? activePrinters : inactivePrinters;
    const isListLoading = isActiveTab ? isActiveLoading : isInactiveLoading;
    const visiblePrinters = printersForTab.filter((printer) => printerTypeFilter === 'all' || printer.type === printerTypeFilter);

    const openCreatePanel = () => {
        setEditingPrinter(null);
        setFormSessionKey((current) => current + 1);
        setIsFormPanelOpen(true);
    };

    const openEditPanel = (printer: PrinterItem) => {
        setEditingPrinter(printer);
        setFormSessionKey((current) => current + 1);
        setIsFormPanelOpen(true);
    };

    const handleSubmitPrinterForm = async (values: PrinterFormValues) => {
        const sharedFields = {
            outletId: values.outletId,
            name: values.name,

            type: values.type,
            printerModel: values.printerModel.trim() || undefined,
            conn: values.connection.trim(),
            size: values.size,
            copies: values.copies,
            categories: values.type === 'KOT' ? values.categories : [],
        };

        try {
            if (editingPrinter) {
                await updatePrinterAsync({ id: getPrinterId(editingPrinter), payload: sharedFields });
                toast.success(`${values.name} updated`);
            } else {
                const createPayload: CreatePrinterPayload = { ...sharedFields };
                await createPrinterAsync(createPayload);
                toast.success(`${values.name} added`);
            }
            return true;
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not save the printer'));
            return false;
        }
    };

    const handleConfirmPendingAction = async () => {
        if (!pendingAction) return;
        const { kind, printer } = pendingAction;
        const printerId = getPrinterId(printer);

        try {
            if (kind === 'deactivate') {
                await softDeletePrinterAsync(printerId);
                toast.success(`${printer.name} deactivated`);
            } else if (kind === 'restore') {
                await restorePrinterAsync(printerId);
                toast.success(`${printer.name} restored`);
            } else {
                await hardDeletePrinterAsync(printerId);
                toast.success(`${printer.name} deleted permanently`);
            }
            setPendingAction(null);
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not complete this action'));
        }
    };

    const handleConfirmSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        handleConfirmPendingAction();
    };

    const confirmationCopy = pendingAction ? buildConfirmationCopy(pendingAction) : null;

    // ── List body ───────────────────────────────────────────────────────────────
    let listBody: ReactNode;
    if (isListLoading) {
        listBody = <PrinterCardSkeletons />;
    } else if (visiblePrinters.length === 0) {
        listBody = (
            <Card className="flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Printer size={20} />
                </span>
                <h2 className="text-lg font-semibold text-heading">
                    {printersForTab.length === 0 ? (isActiveTab ? 'No printers added yet' : 'No inactive printers') : 'No printers match this filter'}
                </h2>
                <p className="text-sm text-muted">
                    {printersForTab.length === 0 && isActiveTab
                        ? canManagePrinters
                            ? 'Add a bill printer for the counter and kitchen printers for each station.'
                            : 'Ask the owner, admin or CTO to add printers.'
                        : 'Try a different outlet or printer type.'}
                </p>
                {printersForTab.length === 0 && isActiveTab && canManagePrinters && (
                    <Button leftIcon={<Plus size={16} />} onClick={openCreatePanel}>
                        Add printer
                    </Button>
                )}
            </Card>
        );
    } else {
        listBody = (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visiblePrinters.map((printer) => (
                    <PrinterCard
                        key={getPrinterId(printer)}
                        printer={printer}
                        outletName={resolveOutletName(printer, outletNameById)}
                        isInactive={!isActiveTab}
                        canManagePrinters={canManagePrinters}
                        onEdit={() => openEditPanel(printer)}
                        onRequestAction={(kind) => setPendingAction({ kind, printer })}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="flex w-full flex-col gap-5 p-2">
            {/* Header */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Printer size={20} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold text-heading">Printer Settings</h1>
                        <p className="text-sm text-muted">Set up bill and kitchen printers for each outlet</p>
                    </div>
                </div>
                {canManagePrinters && (
                    <Button leftIcon={<Plus size={16} />} onClick={openCreatePanel}>
                        Add printer
                    </Button>
                )}
            </header>

            {activeError ? (
                <Card className="flex flex-col items-center gap-3 p-10 text-center">
                    <ShieldAlert size={32} className="text-danger" />
                    <h2 className="text-lg font-semibold text-heading">Couldn't load printers</h2>
                    <p className="text-sm text-muted">{activeError.message}</p>
                    <Button variant="outline" leftIcon={<RefreshCw size={16} />} isLoading={isActiveFetching} loadingText="Retrying" onClick={() => refetchActive()}>
                        Try again
                    </Button>
                </Card>
            ) : (
                <>
                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div role="tablist" aria-label="Printer list" className="flex gap-1 border-b border-border">
                            {(['active', ...(canManagePrinters ? (['inactive'] as const) : [])] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'border-primary text-heading' : 'border-transparent text-muted hover:text-heading'
                                        }`}
                                >
                                    {tab} ({tab === 'active' ? activePrinters.length : inactivePrinters.length})
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div role="group" aria-label="Printer type filter" className="inline-flex w-fit gap-2 items-center rounded-lg border border-border bg-surface p-1">
                                {(['all', 'Bill', 'KOT'] as const).map((typeOption) => (
                                    <button
                                        key={typeOption}
                                        type="button"
                                        aria-pressed={printerTypeFilter === typeOption}
                                        onClick={() => setPrinterTypeFilter(typeOption)}
                                        className={`rounded-md cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors ${printerTypeFilter === typeOption ? 'bg-primary text-white' : 'text-body hover:bg-surface-hover'
                                            }`}
                                    >
                                        {typeOption === 'all' ? 'All' : typeOption === 'KOT' ? 'Kitchen' : 'Bill'}
                                    </button>
                                ))}
                            </div>
                            <div className="sm:w-56">
                                <SearchSelect
                                    label=""
                                    options={outletOptions}
                                    value={selectedOutletId}
                                    placeholder="All outlets"
                                    onChange={(option) => setSelectedOutletId(String(option.value))}
                                    onClear={() => setSelectedOutletId('')}
                                />
                            </div>
                        </div>
                    </div>

                    {listBody}
                </>
            )}

            <PrinterFormPanel
                key={formSessionKey}
                isOpen={isFormPanelOpen}
                onClose={() => setIsFormPanelOpen(false)}
                editingPrinter={editingPrinter}
                defaultOutletId={selectedOutletId}
                outletOptions={outletOptions}
                menuCategoryNames={menuCategoryNames}
                isSubmitting={isCreatingPrinter || isUpdatingPrinter}
                onSubmit={handleSubmitPrinterForm}
            />

            <SideModal
                isOpen={!!pendingAction}
                onClose={() => !isActionInProgress && setPendingAction(null)}
                title={confirmationCopy?.title ?? ''}
            >
                {/* {confirmationCopy && <p className="text-body">{confirmationCopy.message}</p>} */}

                {confirmationCopy && (
                    <form onSubmit={handleConfirmSubmit} className="flex flex-col gap-5">
                        <p className="text-body">{confirmationCopy.message}</p>
                        <div className="flex justify-end gap-2 border-t border-border pt-5">
                            <Button type="button" variant="outline" onClick={() => setPendingAction(null)} disabled={isActionInProgress}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                autoFocus={pendingAction?.kind !== 'hardDelete'}
                                variant={confirmationCopy.isDanger ? 'danger' : 'primary'}
                                isLoading={isActionInProgress}
                                loadingText={confirmationCopy.loadingLabel}
                            >
                                {confirmationCopy.confirmLabel}
                            </Button>
                        </div>
                    </form>
                )}
            </SideModal>
        </div>
    );
}