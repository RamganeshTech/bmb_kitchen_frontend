import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  Archive,
  CalendarDays,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Tags,
  Trash2,
  Wallet,
  X,
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
// TODO: confirm these three paths (not in the list you sent)
import { Dropdown } from '../../components/ui/Dropdown';
import { useGetOutletList } from '../../api_service/outlet_api/outletApi';
import {
  EXPENSE_HARD_DELETE_ROLES,
  EXPENSE_MANAGE_ROLES,
  useCreateExpense,
  useGetExpenseById,
  useHardDeleteExpense,
  useListActiveExpenses,
  useListInactiveExpenses,
  useRestoreExpense,
  useSoftDeleteExpense,
  useUpdateExpense,
  type CreateExpensePayload,
  type Expense,
} from '../../api_service/expense_api/expenseApi';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

// TODO: align these two lists with the expense model enums / the reference HTML
const EXPENSE_CATEGORIES = ['Raw materials', 'Rent', 'Utilities', 'Salaries', 'Maintenance', 'Marketing', 'Transport', 'Other'];
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer'];

const EXPENSE_CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((category) => ({ label: category, value: category }));
const PAYMENT_MODE_OPTIONS = PAYMENT_MODES.map((paymentMode) => ({ label: paymentMode, value: paymentMode }));

const TABLE_COLUMN_COUNT = 9; // S.No, Expense, Category, Date, Payee, Payment, Outlet, Amount, Actions

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type ExpenseListTab = 'active' | 'inactive';

type ExpenseModalState =
  | { mode: 'create' }
  | { mode: 'edit'; expense: Expense }
  | { mode: 'view'; expenseId: string }
  | null;

interface ExpenseFormValues {
  outletId: string;
  date: string;
  category: string;
  paymentMode: string;
  description: string;
  payee: string;
  amountInput: string;
}

type ExpenseFormErrors = Partial<Record<'outletId' | 'date' | 'category' | 'paymentMode' | 'description' | 'amountInput', string>>;

interface OutletListEntry {
  id?: string;
  _id?: string;
  name: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const formatInr = (amount: number) => inrFormatter.format(amount);

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date);
};

// Today's date as yyyy-mm-dd in the user's own timezone, for <input type="date">
const getTodayInputValue = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

// Outlet list shape is not guaranteed, so accept a bare array or a wrapped one
const toOutletEntries = (data: unknown): OutletListEntry[] => {
  if (Array.isArray(data)) return data as OutletListEntry[];
  const wrapped = data as { outlets?: OutletListEntry[]; items?: OutletListEntry[]; data?: OutletListEntry[] } | null;
  return wrapped?.outlets ?? wrapped?.items ?? wrapped?.data ?? [];
};

// outletId is a string in the hook types, but tolerate a populated outlet object too
const resolveOutletName = (outletReference: unknown, outletNameById: Map<string, string>) =>
  typeof outletReference === 'string'
    ? (outletNameById.get(outletReference) ?? 'Unknown outlet')
    : ((outletReference as { name?: string } | null)?.name ?? 'Unknown outlet');

const filterExpenses = (expenses: Expense[], searchText: string, categoryFilter: string) => {
  const normalisedSearch = searchText.trim().toLowerCase();
  return [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .filter((expense) => {
      if (categoryFilter && expense.category !== categoryFilter) return false;
      if (!normalisedSearch) return true;
      return `${expense.expenseNo} ${expense.description} ${expense.payee ?? ''} ${expense.category}`.toLowerCase().includes(normalisedSearch);
    });
};

const sumAmounts = (expenses: Expense[]) => expenses.reduce((total, expense) => total + expense.amount, 0);

/* -------------------------------------------------------------------------- */
/*  Small presentational pieces                                               */
/* -------------------------------------------------------------------------- */

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white ${
      isActive ? 'bg-success' : 'bg-muted'
    }`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-white" />
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

const SummaryCard = ({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) => (
  <Card className="flex items-start gap-3 p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</span>
    <div className="min-w-0">
      <p className="text-sm text-muted">{label}</p>
      <p className="truncate text-xl font-semibold text-heading">{value}</p>
      {hint && <p className="truncate text-sm text-muted">{hint}</p>}
    </div>
  </Card>
);

const TableMessageRow = ({ children }: { children: ReactNode }) => (
  <Tr>
    <Td colSpan={TABLE_COLUMN_COUNT}>
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 text-center text-muted">{children}</div>
    </Td>
  </Tr>
);

const FieldError = ({ message }: { message?: string }) => (message ? <p className="text-sm text-danger">{message}</p> : null);

const DetailField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-sm text-muted">{label}</dt>
    <dd className="break-words font-medium text-heading">{children}</dd>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Shared table (presentational only, no data hooks)                         */
/* -------------------------------------------------------------------------- */

interface ExpenseTableProps {
  expenses: Expense[];
  totalCount: number;
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  isInactiveList: boolean;
  emptyMessage: string;
  emptyAction?: ReactNode;
  outletNameById: Map<string, string>;
  onOpenDetails: (expenseId: string) => void;
  renderRowActions: (expense: Expense) => ReactNode;
}

const ExpenseTable = ({
  expenses,
  totalCount,
  isLoading,
  errorMessage,
  onRetry,
  isInactiveList,
  emptyMessage,
  emptyAction,
  outletNameById,
  onOpenDetails,
  renderRowActions,
}: ExpenseTableProps) => {
  let tableRows: ReactNode;

  if (isLoading) {
    tableRows = <TableMessageRow>Loading expenses…</TableMessageRow>;
  } else if (errorMessage) {
    tableRows = (
      <TableMessageRow>
        <AlertCircle size={24} className="text-danger" />
        <p>{errorMessage}</p>
        <Button variant="outline" leftIcon={<RefreshCw size={16} />} onClick={onRetry}>
          Try again
        </Button>
      </TableMessageRow>
    );
  } else if (expenses.length === 0) {
    tableRows = (
      <TableMessageRow>
        <p>{emptyMessage}</p>
        {emptyAction}
      </TableMessageRow>
    );
  } else {
    tableRows = expenses.map((expense, rowIndex) => (
      <Tr key={expense._id} ariaLabel={`Expense ${expense.expenseNo}`} onClick={() => onOpenDetails(expense._id)}>
        <Td>
          <span className="text-muted">{rowIndex + 1}</span>
        </Td>
        <Td>
          <div className="min-w-48">
            <p className="max-w-xs truncate font-medium text-heading" title={expense.description}>
              {expense.description}
            </p>
            <p className="text-sm text-muted">{expense.expenseNo}</p>
          </div>
        </Td>
        <Td>{expense.category}</Td>
        <Td>{formatDate(expense.date)}</Td>
        <Td>{expense.payee || <span className="text-muted">—</span>}</Td>
        <Td>{expense.paymentMode}</Td>
        <Td>{resolveOutletName(expense.outletId, outletNameById)}</Td>
        <Td>
          <div className="text-right font-semibold text-heading">{formatInr(expense.amount)}</div>
        </Td>
        <Td>
          <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            {renderRowActions(expense)}
          </div>
        </Td>
      </Tr>
    ));
  }

  return (
    <div className="flex flex-col gap-3">
      <TableContainer
        className="min-h-[300px]"
        ariaLabel={isInactiveList ? 'Inactive expenses' : 'Active expenses'}
        caption={isInactiveList ? 'List of inactive expenses' : 'List of active expenses'}
      >
        <THead>
          <Tr>
            <Th className="w-16">S.No</Th>
            <Th>Expense</Th>
            <Th>Category</Th>
            <Th>Date</Th>
            <Th>Payee</Th>
            <Th>Payment</Th>
            <Th>Outlet</Th>
            <Th className="text-right">Amount</Th>
            <Th className="text-right">Actions</Th>
          </Tr>
        </THead>
        <TBody>{tableRows}</TBody>
      </TableContainer>

      {!isLoading && !errorMessage && expenses.length > 0 && (
        <p className="text-sm text-muted">
          Showing {expenses.length} of {totalCount} {totalCount === 1 ? 'expense' : 'expenses'} · Total shown{' '}
          <span className="font-semibold text-heading">{formatInr(sumAmounts(expenses))}</span>
        </p>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Active tab: active list + soft delete only                                */
/* -------------------------------------------------------------------------- */

interface TabTableProps {
  searchText: string;
  categoryFilter: string;
  selectedOutletId: string;
  outletNameById: Map<string, string>;
  onOpenDetails: (expenseId: string) => void;
}

const ActiveExpensesTable = ({
  searchText,
  categoryFilter,
  selectedOutletId,
  outletNameById,
  onOpenDetails,
  canManageExpenses,
  onEdit,
  onCreate,
}: TabTableProps & {
  canManageExpenses: boolean;
  onEdit: (expense: Expense) => void;
  onCreate: () => void;
}) => {
  const { data, isLoading, error, refetch } = useListActiveExpenses(selectedOutletId || undefined);
  const { mutateAsync: deactivateExpenseAsync, isPending: isDeactivating } = useSoftDeleteExpense();
  const [expensePendingDeactivation, setExpensePendingDeactivation] = useState<Expense | null>(null);

  const activeExpenses = data ?? [];
  const visibleExpenses = filterExpenses(activeExpenses, searchText, categoryFilter);
  const hasFilters = searchText.trim().length > 0 || !!categoryFilter;

  // Summary figures for the cards
  const now = new Date();
  const thisMonthExpenses = activeExpenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  });
  const amountByCategory = new Map<string, number>();
  for (const expense of activeExpenses) {
    amountByCategory.set(expense.category, (amountByCategory.get(expense.category) ?? 0) + expense.amount);
  }
  let topCategoryName = '—';
  let topCategoryAmount = 0;
  for (const [categoryName, categoryAmount] of amountByCategory) {
    if (categoryAmount > topCategoryAmount) {
      topCategoryName = categoryName;
      topCategoryAmount = categoryAmount;
    }
  }

  const handleConfirmDeactivation = async () => {
    if (!expensePendingDeactivation) return;
    try {
      await deactivateExpenseAsync(expensePendingDeactivation._id);
      toast.success(`${expensePendingDeactivation.expenseNo} deactivated`);
      setExpensePendingDeactivation(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to deactivate expense'));
    }
  };

  const handleDeactivationSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleConfirmDeactivation();
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Wallet size={20} />} label="Total expenses" value={formatInr(sumAmounts(activeExpenses))} hint="All active entries" />
        <SummaryCard icon={<CalendarDays size={20} />} label="This month" value={formatInr(sumAmounts(thisMonthExpenses))} hint={`${thisMonthExpenses.length} entries`} />
        <SummaryCard icon={<FileText size={20} />} label="Entries" value={String(activeExpenses.length)} hint="Active expenses" />
        <SummaryCard icon={<Tags size={20} />} label="Top category" value={topCategoryName} hint={topCategoryAmount > 0 ? formatInr(topCategoryAmount) : undefined} />
      </div>

      <ExpenseTable
        expenses={visibleExpenses}
        totalCount={activeExpenses.length}
        isLoading={isLoading}
        errorMessage={error?.message}
        onRetry={() => refetch()}
        isInactiveList={false}
        emptyMessage={
          activeExpenses.length === 0 ? 'No expenses yet. Add the first one to start tracking spend.' : hasFilters ? 'No expenses match your filters.' : 'No expenses to show.'
        }
        emptyAction={
          activeExpenses.length === 0 ? (
            <Button leftIcon={<Plus size={16} />} onClick={onCreate}>
              Add expense
            </Button>
          ) : undefined
        }
        outletNameById={outletNameById}
        onOpenDetails={onOpenDetails}
        renderRowActions={(expense) => (
          <>
            <Button size="sm" variant="outline" leftIcon={<Eye size={14} />} onClick={() => onOpenDetails(expense._id)}>
              View
            </Button>
            {canManageExpenses && (
              <Dropdown
                align="right"
                triggerLabel={`More actions for ${expense.expenseNo}`}
                trigger={
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-heading transition-colors hover:bg-surface-hover">
                    <MoreVertical size={16} />
                  </span>
                }
                items={[
                  { label: 'Edit', icon: <Pencil size={16} />, onClick: () => onEdit(expense) },
                  { label: 'Deactivate', icon: <Archive size={16} />, onClick: () => setExpensePendingDeactivation(expense) },
                ]}
              />
            )}
          </>
        )}
      />

      <SideModal
        isOpen={!!expensePendingDeactivation}
        onClose={() => !isDeactivating && setExpensePendingDeactivation(null)}
        title="Deactivate expense"
      >
        <form onSubmit={handleDeactivationSubmit} className="flex flex-col gap-5">
          <p className="text-base text-body">
            {expensePendingDeactivation?.expenseNo} ({expensePendingDeactivation ? formatInr(expensePendingDeactivation.amount) : ''}) will be moved to the Inactive tab and left out of your totals. You can restore it any time.
          </p>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => setExpensePendingDeactivation(null)} disabled={isDeactivating}>
              Cancel
            </Button>
            <Button type="submit" autoFocus leftIcon={<Archive size={16} />} isLoading={isDeactivating} loadingText="Deactivating...">
              Deactivate
            </Button>
          </div>
        </form>
      </SideModal>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*  Inactive tab: inactive list + restore + hard delete only                  */
/* -------------------------------------------------------------------------- */

const InactiveExpensesTable = ({
  searchText,
  categoryFilter,
  selectedOutletId,
  outletNameById,
  onOpenDetails,
  canHardDeleteExpenses,
}: TabTableProps & { canHardDeleteExpenses: boolean }) => {
  const { data, isLoading, error, refetch } = useListInactiveExpenses(selectedOutletId || undefined);
  const { mutateAsync: restoreExpenseAsync } = useRestoreExpense();
  const { mutateAsync: deleteExpenseAsync, isPending: isDeleting } = useHardDeleteExpense();

  const [restoringExpenseId, setRestoringExpenseId] = useState<string | null>(null);
  const [expensePendingDeletion, setExpensePendingDeletion] = useState<Expense | null>(null);

  const inactiveExpenses = data ?? [];
  const visibleExpenses = filterExpenses(inactiveExpenses, searchText, categoryFilter);
  const hasFilters = searchText.trim().length > 0 || !!categoryFilter;

  const handleRestore = async (expense: Expense) => {
    setRestoringExpenseId(expense._id);
    try {
      await restoreExpenseAsync(expense._id);
      toast.success(`${expense.expenseNo} restored`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to restore expense'));
    } finally {
      setRestoringExpenseId(null);
    }
  };

  const handleConfirmDeletion = async () => {
    if (!expensePendingDeletion) return;
    try {
      await deleteExpenseAsync(expensePendingDeletion._id);
      toast.success(`${expensePendingDeletion.expenseNo} deleted permanently`);
      setExpensePendingDeletion(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete expense'));
    }
  };

  const handleDeletionSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleConfirmDeletion();
  };

  return (
    <>
      <ExpenseTable
        expenses={visibleExpenses}
        totalCount={inactiveExpenses.length}
        isLoading={isLoading}
        errorMessage={error?.message}
        onRetry={() => refetch()}
        isInactiveList
        emptyMessage={inactiveExpenses.length === 0 ? 'No inactive expenses. Expenses you deactivate will appear here.' : hasFilters ? 'No expenses match your filters.' : 'No expenses to show.'}
        outletNameById={outletNameById}
        onOpenDetails={onOpenDetails}
        renderRowActions={(expense) => (
          <>
            <Button
              size="icon"
              variant="outline"
              aria-label={`Restore ${expense.expenseNo}`}
              title="Restore"
              isLoading={restoringExpenseId === expense._id}
              onClick={() => handleRestore(expense)}
            >
              <RotateCcw size={16} />
            </Button>
            {canHardDeleteExpenses && (
              <Button
                size="icon"
                variant="danger"
                aria-label={`Delete ${expense.expenseNo} permanently`}
                title="Delete permanently"
                onClick={() => setExpensePendingDeletion(expense)}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </>
        )}
      />

      <SideModal
        isOpen={!!expensePendingDeletion}
        onClose={() => !isDeleting && setExpensePendingDeletion(null)}
        title="Delete permanently"
      >
        <form onSubmit={handleDeletionSubmit} className="flex flex-col gap-5">
          <p className="text-base text-body">
            {expensePendingDeletion?.expenseNo} will be deleted for good. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => setExpensePendingDeletion(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" leftIcon={<Trash2 size={16} />} isLoading={isDeleting} loadingText="Deleting...">
              Delete permanently
            </Button>
          </div>
        </form>
      </SideModal>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*  Create / edit modal                                                       */
/* -------------------------------------------------------------------------- */

const ExpenseFormModal = ({
  expense,
  defaultOutletId,
  outletOptions,
  onClose,
  onSaved,
}: {
  expense?: Expense;
  defaultOutletId: string;
  outletOptions: { label: string; value: string }[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const isEditing = !!expense;
  const { mutateAsync: createExpenseAsync, isPending: isCreating } = useCreateExpense();
  const { mutateAsync: updateExpenseAsync, isPending: isUpdating } = useUpdateExpense();
  const isSaving = isCreating || isUpdating;

  const initialValues: ExpenseFormValues = {
    outletId: expense ? (typeof expense.outletId === 'string' ? expense.outletId : '') : defaultOutletId,
    date: expense ? expense.date.slice(0, 10) : getTodayInputValue(),
    category: expense?.category ?? '',
    paymentMode: expense?.paymentMode ?? '',
    description: expense?.description ?? '',
    payee: expense?.payee ?? '',
    amountInput: expense ? String(expense.amount) : '',
  };

  const [formValues, setFormValues] = useState<ExpenseFormValues>(initialValues);
  const [formErrors, setFormErrors] = useState<ExpenseFormErrors>({});

  const isDraftChanged = (Object.keys(initialValues) as (keyof ExpenseFormValues)[]).some((fieldName) => formValues[fieldName] !== initialValues[fieldName]);

  // Keep a saved category / payment mode selectable even if it is not in the standard lists
  const categoryOptions =
    expense && expense.category && !EXPENSE_CATEGORIES.includes(expense.category)
      ? [...EXPENSE_CATEGORY_OPTIONS, { label: expense.category, value: expense.category }]
      : EXPENSE_CATEGORY_OPTIONS;
  const paymentModeOptions =
    expense && expense.paymentMode && !PAYMENT_MODES.includes(expense.paymentMode)
      ? [...PAYMENT_MODE_OPTIONS, { label: expense.paymentMode, value: expense.paymentMode }]
      : PAYMENT_MODE_OPTIONS;

  const updateFormValues = (changes: Partial<ExpenseFormValues>) => {
    setFormValues((current) => ({ ...current, ...changes }));
    // Clear the error of any field being edited
    setFormErrors((current) => {
      const next = { ...current };
      for (const fieldName of Object.keys(changes) as (keyof ExpenseFormValues)[]) delete next[fieldName as keyof ExpenseFormErrors];
      return next;
    });
  };

  const validateForm = () => {
    const errors: ExpenseFormErrors = {};
    const amount = Number(formValues.amountInput);
    if (!formValues.outletId) errors.outletId = 'Select the outlet';
    if (!formValues.date) errors.date = 'Pick the expense date';
    if (!formValues.category) errors.category = 'Select a category';
    if (!formValues.paymentMode) errors.paymentMode = 'Select how it was paid';
    if (!formValues.description.trim()) errors.description = 'Describe what the money was spent on';
    if (!formValues.amountInput || Number.isNaN(amount) || amount <= 0) errors.amountInput = 'Enter an amount greater than 0';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const payload: CreateExpensePayload = {
      outletId: formValues.outletId,
      date: formValues.date,
      category: formValues.category,
      paymentMode: formValues.paymentMode,
      description: formValues.description.trim(),
      payee: formValues.payee.trim() || null,
      amount: Number(formValues.amountInput),
    };

    try {
      if (expense) {
        await updateExpenseAsync({ expenseId: expense._id, payload });
        toast.success(`${expense.expenseNo} updated`);
      } else {
        const createdExpense = await createExpenseAsync(payload);
        toast.success(createdExpense?.expenseNo ? `Expense ${createdExpense.expenseNo} added` : 'Expense added');
      }
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, isEditing ? 'Failed to update expense' : 'Failed to add expense'));
    }
  };

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleSave();
  };

  return (
    <SideModal isOpen onClose={() => !isSaving && onClose()} title={isEditing ? `Edit ${expense.expenseNo}` : 'Add expense'}>
      <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <SearchSelect
            label="Outlet"
            options={outletOptions}
            value={formValues.outletId}
            placeholder="Select outlet"
            onChange={(option) => updateFormValues({ outletId: String(option.value) })}
            onClear={() => updateFormValues({ outletId: '' })}
          />
          <FieldError message={formErrors.outletId} />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expenseDate">Date</Label>
            <Input
              id="expenseDate"
              type="date"
              value={formValues.date}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateFormValues({ date: event.target.value })}
            />
            <FieldError message={formErrors.date} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expenseAmount">Amount (₹)</Label>
            <Input
              id="expenseAmount"
              type="number"
              inputMode="decimal"
              min={0}
              value={formValues.amountInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateFormValues({ amountInput: event.target.value })}
              autoFocus
            />
            <FieldError message={formErrors.amountInput} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <SearchSelect
              label="Category"
              options={categoryOptions}
              value={formValues.category}
              placeholder="Select category"
              onChange={(option) => updateFormValues({ category: String(option.value) })}
              onClear={() => updateFormValues({ category: '' })}
            />
            <FieldError message={formErrors.category} />
          </div>
          <div className="flex flex-col gap-1.5">
            <SearchSelect
              label="Payment mode"
              options={paymentModeOptions}
              value={formValues.paymentMode}
              placeholder="Select payment mode"
              onChange={(option) => updateFormValues({ paymentMode: String(option.value) })}
              onClear={() => updateFormValues({ paymentMode: '' })}
            />
            <FieldError message={formErrors.paymentMode} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expenseDescription">Description</Label>
          <Input
            id="expenseDescription"
            placeholder="For example Vegetables from the wholesale market"
            value={formValues.description}
            onChange={(event: ChangeEvent<HTMLInputElement>) => updateFormValues({ description: event.target.value })}
          />
          <FieldError message={formErrors.description} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expensePayee">Payee (optional)</Label>
          <Input
            id="expensePayee"
            placeholder="Who was paid"
            value={formValues.payee}
            onChange={(event: ChangeEvent<HTMLInputElement>) => updateFormValues({ payee: event.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving} loadingText="Saving..." disabled={isEditing && !isDraftChanged}>
            {isEditing ? 'Save changes' : 'Add expense'}
          </Button>
        </div>
      </form>
    </SideModal>
  );
};

/* -------------------------------------------------------------------------- */
/*  Details modal (read only)                                                 */
/* -------------------------------------------------------------------------- */

const ExpenseDetailsModal = ({
  expenseId,
  outletNameById,
  canManageExpenses,
  onClose,
  onEdit,
}: {
  expenseId: string;
  outletNameById: Map<string, string>;
  canManageExpenses: boolean;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
}) => {
  const { data: expense, isLoading, error, refetch, isFetching } = useGetExpenseById(expenseId);

  let modalBody: ReactNode;
  if (isLoading) {
    modalBody = (
      <div className="space-y-4" aria-busy="true">
        <div className="h-20 animate-pulse rounded-xl bg-surface-hover" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-hover" />
      </div>
    );
  } else if (error || !expense) {
    modalBody = (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle size={28} className="text-danger" />
        <p className="text-muted">{error?.message ?? 'Could not load this expense'}</p>
        <Button variant="outline" leftIcon={<RefreshCw size={16} />} isLoading={isFetching} onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    modalBody = (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3 rounded-xl bg-primary-soft p-5">
          <div className="min-w-0">
            <p className="text-sm text-muted">{expense.expenseNo}</p>
            <p className="text-3xl font-semibold text-heading">{formatInr(expense.amount)}</p>
          </div>
          <StatusBadge isActive={expense.isActive} />
        </div>

        <div>
          <p className="text-sm text-muted">Description</p>
          <p className="break-words text-base text-heading">{expense.description}</p>
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
          <DetailField label="Category">{expense.category}</DetailField>
          <DetailField label="Date">{formatDate(expense.date)}</DetailField>
          <DetailField label="Payment mode">{expense.paymentMode}</DetailField>
          <DetailField label="Payee">{expense.payee || '—'}</DetailField>
          <DetailField label="Outlet">{resolveOutletName(expense.outletId, outletNameById)}</DetailField>
          <DetailField label="Recorded by">{expense.createdBy?.name ?? '—'}</DetailField>
          <DetailField label="Last updated">{formatDate(expense.updatedAt)}</DetailField>
          {expense.updatedBy?.name && <DetailField label="Updated by">{expense.updatedBy.name}</DetailField>}
        </dl>
      </div>
    );
  }

  return (
    <SideModal isOpen onClose={onClose} title="Expense details">
      <div className="flex flex-col gap-6">
        {modalBody}

        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {expense && expense.isActive && canManageExpenses && (
            <Button type="button" leftIcon={<Pencil size={16} />} onClick={() => onEdit(expense)}>
              Edit
            </Button>
          )}
        </div>
      </div>
    </SideModal>
  );
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const ExpenseMain = () => {
  const { currentRole } = useAuthData();
  const canManageExpenses = !!currentRole && (EXPENSE_MANAGE_ROLES as string[]).includes(currentRole);
  const canHardDeleteExpenses = !!currentRole && (EXPENSE_HARD_DELETE_ROLES as string[]).includes(currentRole);

  const [activeTab, setActiveTab] = useState<ExpenseListTab>('active');
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [modalState, setModalState] = useState<ExpenseModalState>(null);

  const { data: outletListData } = useGetOutletList();
  const outletEntries = toOutletEntries(outletListData);
  const outletOptions = outletEntries.map((outlet) => ({ label: outlet.name, value: outlet.id ?? outlet._id ?? '' }));
  const outletNameById = new Map(outletOptions.map((option) => [option.value, option.label]));

  const isActiveTab = activeTab === 'active';
  const isSearching = searchText.trim().length > 0;

  const closeModal = () => setModalState(null);
  const openCreateModal = () => setModalState({ mode: 'create' });
  const openDetailsModal = (expenseId: string) => setModalState({ mode: 'view', expenseId });
  const openEditModal = (expense: Expense) => setModalState({ mode: 'edit', expense });

  const handleExpenseSaved = () => {
    setActiveTab('active');
    closeModal();
  };

  return (
    <div className="flex w-full flex-col gap-5 p-2">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Receipt size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-heading">Expenses</h1>
            <p className="text-sm text-muted">Record and track what each outlet spends</p>
          </div>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreateModal}>
          Add expense
        </Button>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div role="tablist" aria-label="Expense list" className="flex gap-1 border-b border-border">
          {(['active', ...(canManageExpenses ? (['inactive'] as const) : [])] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px border-b-2 px-4 py-2 text-base font-medium capitalize transition-colors ${
                activeTab === tab ? 'border-primary text-heading' : 'border-transparent text-muted hover:text-heading'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={searchText}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value)}
              placeholder="Search expenses"
              className="pl-9 pr-9"
              aria-label="Search expenses"
            />
            {isSearching && (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setSearchText('')}
              >
                <X size={14} />
              </Button>
            )}
          </div>
          <div className="sm:w-48">
            <SearchSelect
              label=""
              options={EXPENSE_CATEGORY_OPTIONS}
              value={categoryFilter}
              placeholder="All categories"
              onChange={(option) => setCategoryFilter(String(option.value))}
              onClear={() => setCategoryFilter('')}
            />
          </div>
          <div className="sm:w-48">
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

      {/* Each tab owns only the hooks it needs, and is mounted only while open */}
      {isActiveTab ? (
        <ActiveExpensesTable
          searchText={searchText}
          categoryFilter={categoryFilter}
          selectedOutletId={selectedOutletId}
          outletNameById={outletNameById}
          canManageExpenses={canManageExpenses}
          onOpenDetails={openDetailsModal}
          onEdit={openEditModal}
          onCreate={openCreateModal}
        />
      ) : (
        <InactiveExpensesTable
          searchText={searchText}
          categoryFilter={categoryFilter}
          selectedOutletId={selectedOutletId}
          outletNameById={outletNameById}
          canHardDeleteExpenses={canHardDeleteExpenses}
          onOpenDetails={openDetailsModal}
        />
      )}

      {modalState?.mode === 'create' && (
        <ExpenseFormModal defaultOutletId={selectedOutletId} outletOptions={outletOptions} onClose={closeModal} onSaved={handleExpenseSaved} />
      )}
      {modalState?.mode === 'edit' && (
        <ExpenseFormModal
          key={modalState.expense._id}
          expense={modalState.expense}
          defaultOutletId={selectedOutletId}
          outletOptions={outletOptions}
          onClose={closeModal}
          onSaved={handleExpenseSaved}
        />
      )}
      {modalState?.mode === 'view' && (
        <ExpenseDetailsModal
          key={modalState.expenseId}
          expenseId={modalState.expenseId}
          outletNameById={outletNameById}
          canManageExpenses={canManageExpenses}
          onClose={closeModal}
          onEdit={openEditModal}
        />
      )}
    </div>
  );
};

export default ExpenseMain;