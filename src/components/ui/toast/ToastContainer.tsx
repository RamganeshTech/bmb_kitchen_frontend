// components/ui/ToastContainer.tsx
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { dismissToast, subscribeToToasts, type ToastItem, type ToastType } from './Toast';
import { cn } from '../../../lib/cn';

const iconByType: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorByType: Record<ToastType, string> = {
  success: 'border-success/20 text-success',
  error: 'border-danger/20 text-danger',
  warning: 'border-warning/20 text-warning',
  info: 'border-primary/20 text-primary',
};

// error/warning interrupt screen reader users immediately; success/info wait politely
const ariaLiveByType: Record<ToastType, 'assertive' | 'polite'> = {
  success: 'polite',
  info: 'polite',
  warning: 'assertive',
  error: 'assertive',
};

function ToastRow({ toast: t }: { toast: ToastItem }) {
  const Icon = iconByType[t.type];

  return (
    <div
      role={t.type === 'error' || t.type === 'warning' ? 'alert' : 'status'}
      aria-live={ariaLiveByType[t.type]}
      aria-atomic="true"
      className={cn(
        'flex items-start gap-3 w-full sm:w-80 bg-surface border rounded-lg shadow-lg px-4 py-3',
        'motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:fade-in duration-200',
        colorByType[t.type]
      )}
    >
      <Icon size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1 text-sm text-body min-w-0 break-words">{t.message}</p>
      <button
        type="button"
        onClick={() => dismissToast(t.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-muted hover:text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToToasts(setToasts), []);

  return (
    <div
      role="region"
      aria-label="Notifications"
      className={cn(
        'fixed z-[9999] flex flex-col gap-2 pointer-events-none',
        // Mobile: full-width, anchored to bottom. Desktop: compact stack, bottom-right.
        'inset-x-0 bottom-0 px-4 pb-4 items-center',
        'sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end sm:px-0'
      )}
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full sm:w-auto">
          <ToastRow toast={t} />
        </div>
      ))}
    </div>
  );
}