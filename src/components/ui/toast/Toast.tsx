// lib/toast.tsx
import { createRoot, type Root } from 'react-dom/client';
import { ToastContainer } from './ToastContainer';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let listeners: Listener[] = [];
let mountedRoot: Root | null = null;

function notify() {
  listeners.forEach((listener) => listener(toasts));
}

// Lazily injects the toast container into the DOM on the first call —
// this is what lets us skip wrapping <App> in a <ToastProvider>.
function ensureMounted() {
  if (mountedRoot) return;
  const el = document.createElement('div');
  el.id = 'toast-root';
  document.body.appendChild(el);
  mountedRoot = createRoot(el);
  mountedRoot.render(<ToastContainer />);
}

export function subscribeToToasts(listener: Listener) {
  listeners.push(listener);
  listener(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

interface ToastOptions {
  message: string;
  type: ToastType;
  duration?: number;
}

function createToast({ message, type, duration = 4000 }: ToastOptions) {
  ensureMounted();
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, message, type, duration }];
  notify();
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

export const toast = Object.assign(createToast, {
  success: (message: string, duration?: number) =>
    createToast({ message, type: 'success', duration }),
  error: (message: string, duration?: number) =>
    createToast({ message, type: 'error', duration }),
  warning: (message: string, duration?: number) =>
    createToast({ message, type: 'warning', duration }),
  info: (message: string, duration?: number) =>
    createToast({ message, type: 'info', duration }),
});