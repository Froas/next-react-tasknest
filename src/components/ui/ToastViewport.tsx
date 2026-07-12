'use client';

import React from 'react';
import { useToast } from '@/store/useToast';
import { useErrorWatcher } from '@/store/useErrorWatcher';
import { useBroadcastSync } from '@/store/useBroadcastSync';
import { useNotificationWatcher } from '@/store/useNotifications';
import { useWeeklyReviewPrompt } from '@/store/useWeeklyReview';

const KIND_STYLES: Record<string, string> = {
 error: 'bg-red-600 text-white',
 success: 'bg-emerald-600 text-white',
 info: 'bg-primary text-primary-foreground',
};

export const ToastViewport: React.FC = () => {
 useErrorWatcher();
 useBroadcastSync();
 useNotificationWatcher();
 useWeeklyReviewPrompt();
 const toasts = useToast((s) => s.toasts);
 const dismiss = useToast((s) => s.dismiss);

 if (toasts.length === 0) return null;

 return (
 <div className="fixed bottom-4 right-4 z-[100] flex flex-col space-y-2 max-w-sm">
 {toasts.map((t) => (
 <div
 key={t.id}
 role="status"
 className={`px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 ${
 KIND_STYLES[t.kind] ?? KIND_STYLES.info
 }`}
 >
 <span className="flex-1 text-sm">{t.message}</span>
 {t.action && (
 <button
 onClick={() => {
 try {
 t.action!.run();
 } finally {
 // Action fired → don't trigger onExpire commit.
 dismiss(t.id, false);
 }
 }}
 className="text-sm font-semibold underline underline-offset-2 hover:opacity-90"
 >
 {t.action.label}
 </button>
 )}
 <button
 onClick={() => dismiss(t.id, false)}
 aria-label="Dismiss"
 className="text-white/80 hover:text-white text-sm leading-none"
 >
 ×
 </button>
 </div>
 ))}
 </div>
 );
};
