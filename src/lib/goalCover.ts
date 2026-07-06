// Deterministic visual identity for a goal: hash its id into a palette and
// return a Tailwind gradient class so each goal gets a consistent, distinct
// header without storing extra data on the backend. Manual overrides are
// applied first via `useGoalColors`.

import { useGoalColors } from '@/store/useGoalColors';

export const GRADIENTS = [
 'from-blue-500 to-purple-600',
 'from-emerald-500 to-teal-600',
 'from-amber-500 to-orange-600',
 'from-rose-500 to-pink-600',
 'from-indigo-500 to-blue-600',
 'from-cyan-500 to-blue-500',
 'from-fuchsia-500 to-purple-600',
 'from-lime-500 to-emerald-500',
 'from-red-500 to-orange-500',
 'from-violet-500 to-indigo-600',
];

const hash = (s: string): number => {
 let h = 0;
 for (let i = 0; i < s.length; i++) {
 h = ((h << 5) - h + s.charCodeAt(i)) | 0;
 }
 return Math.abs(h);
};

// Static (non-reactive) — used outside React or in non-subscribing callers.
export const goalGradientClass = (goalId: string): string => {
 const override = useGoalColors.getState().overrides[goalId];
 if (override) return override;
 return GRADIENTS[hash(goalId) % GRADIENTS.length];
};

// Reactive hook — re-renders when the override for `goalId` changes.
export const useGoalGradientClass = (goalId: string): string => {
 const override = useGoalColors((s) => s.overrides[goalId]);
 if (override) return override;
 return GRADIENTS[hash(goalId) % GRADIENTS.length];
};
