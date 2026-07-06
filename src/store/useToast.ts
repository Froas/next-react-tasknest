import { create } from 'zustand';

export type ToastKind = 'error' | 'success' | 'info';

export interface ToastAction {
 label: string;
 run: () => void;
}

export interface Toast {
 id: string;
 kind: ToastKind;
 message: string;
 action?: ToastAction;
 // Called when the toast is dismissed for any reason *other* than the
 // action firing — used for soft-delete commit-on-timeout.
 onExpire?: () => void;
 ttlMs?: number;
}

interface ToastStore {
 toasts: Toast[];
 push: (
 kind: ToastKind,
 message: string,
 options?: { action?: ToastAction; onExpire?: () => void; ttlMs?: number }
 ) => string;
 dismiss: (id: string, fireExpire?: boolean) => void;
 clear: () => void;
}

const TOAST_TTL_MS = 5000;

export const useToast = create<ToastStore>((set, get) => ({
 toasts: [],
 push: (kind, message, options = {}) => {
 const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
 const ttl = options.ttlMs ?? TOAST_TTL_MS;
 set((state) => ({
 toasts: [
 ...state.toasts,
 { id, kind, message, action: options.action, onExpire: options.onExpire, ttlMs: ttl },
 ],
 }));
 if (typeof window !== 'undefined') {
 window.setTimeout(() => get().dismiss(id, true), ttl);
 }
 return id;
 },
 dismiss: (id, fireExpire = false) => {
 const t = get().toasts.find((x) => x.id === id);
 if (fireExpire && t?.onExpire) {
 try {
 t.onExpire();
 } catch (err) {
 console.error('Toast onExpire threw:', err);
 }
 }
 set((state) => ({ toasts: state.toasts.filter((x) => x.id !== id) }));
 },
 clear: () => set({ toasts: [] }),
}));

// Convenience helpers callable outside of React components.
export const toast = {
 error: (message: string) => useToast.getState().push('error', message),
 success: (message: string) => useToast.getState().push('success', message),
 info: (message: string) => useToast.getState().push('info', message),
 // Full form for soft-delete and similar"act now or commit later" flows.
 withAction: (
 kind: ToastKind,
 message: string,
 action: ToastAction,
 options: { onExpire?: () => void; ttlMs?: number } = {}
 ) => useToast.getState().push(kind, message, { action, ...options }),
};
