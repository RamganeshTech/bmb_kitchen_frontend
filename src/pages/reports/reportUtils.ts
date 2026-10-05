import type { ReportScope } from '../../api_service/report_api/reportApi';

/* -------------------------------------------------------------------------- */
/*  Shared constants and formatting helpers for every report component.       */
/*  Keep all report formatting here so numbers and dates look identical       */
/*  wherever a report component is placed.                                    */
/* -------------------------------------------------------------------------- */

export const REPORT_SCOPE_OPTIONS: { value: ReportScope; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
export const formatInr = (amount: number) => inrFormatter.format(amount);

const countFormatter = new Intl.NumberFormat('en-IN');
export const formatCount = (value: number) => countFormatter.format(value);

const compactNumberFormatter = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
export const formatCompactNumber = (value: number) => compactNumberFormatter.format(value);

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
export const formatDateTime = (value?: string | Date) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : dateTimeFormatter.format(date);
};

const shortDateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });
/** Formats a 'YYYY-MM-DD' key coming from the daily trend into e.g. "04 Oct". */
export const formatShortDate = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(date.getTime()) ? dateKey : shortDateFormatter.format(date);
};

// The backend applies `to` as an exact timestamp, so a chosen end date must be sent as the end of that day.
export const toStartOfDayIso = (dateInput: string) => new Date(`${dateInput}T00:00:00`).toISOString();
export const toEndOfDayIso = (dateInput: string) => new Date(`${dateInput}T23:59:59.999`).toISOString();

const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  split: 'Split',
  unpaid: 'Unpaid',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
  online: 'Online',
};

const toTitleCase = (value: string) => value.replace(/_/g, ' ').replace(/^\w/, (firstLetter) => firstLetter.toUpperCase());

export const formatPaymentModeLabel = (paymentMode: string) => PAYMENT_MODE_LABELS[paymentMode] ?? toTitleCase(paymentMode);
export const formatOrderTypeLabel = (orderType: string) => ORDER_TYPE_LABELS[orderType] ?? toTitleCase(orderType);

export const calculateSharePercent = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);
