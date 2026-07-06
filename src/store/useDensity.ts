'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';

type Density = 'comfortable' | 'compact';

interface DensityStore {
 density: Density;
 toggle: () => void;
 set: (d: Density) => void;
}

// Density preference (comfortable vs compact). Applied to <html> as a class
// so global Tailwind styles (e.g. `compact:py-2`) can opt into the change
// without every component subscribing.
export const useDensity = create<DensityStore>()(
 persist(
 (set) => ({
 density: 'comfortable',
 toggle: () => set((s) => ({ density: s.density === 'compact' ? 'comfortable' : 'compact' })),
 set: (density) => set({ density }),
 }),
 { name: 'tasknest:density' }
 )
);

// Hook that mirrors the density into a DOM class so we can write
// compact-aware CSS without extra wiring per component.
export const useDensityClass = () => {
 const density = useDensity((s) => s.density);
 useEffect(() => {
 if (typeof document === 'undefined') return;
 const root = document.documentElement;
 if (density === 'compact') root.classList.add('density-compact');
 else root.classList.remove('density-compact');
 }, [density]);
};
