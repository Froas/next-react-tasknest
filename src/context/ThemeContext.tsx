'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type ThemePreference = Theme | 'system';

interface ThemeContextType {
 theme: Theme;
 preference: ThemePreference;
 setPreference: (p: ThemePreference) => void;
 toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
 const context = useContext(ThemeContext);
 if (!context) {
 throw new Error('useTheme must be used within a ThemeProvider');
 }
 return context;
};

interface ThemeProviderProps {
 children: React.ReactNode;
}

const systemTheme = (): Theme =>
 typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
 ? 'dark'
 : 'light';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
 const [preference, setPreferenceState] = useState<ThemePreference>('system');
 const [theme, setTheme] = useState<Theme>('light');

 useEffect(() => {
 const saved = (localStorage.getItem('theme-preference') as ThemePreference | null)
 ?? (localStorage.getItem('theme') as ThemePreference | null);
 if (saved === 'light' || saved === 'dark' || saved === 'system') {
 setPreferenceState(saved);
 }
 }, []);

 // Resolve preference → concrete theme. Subscribe to OS scheme changes
 // when running in 'system' mode so the app flips automatically.
 useEffect(() => {
 const resolve = (): Theme => (preference === 'system' ? systemTheme() : preference);
 setTheme(resolve());
 if (preference !== 'system' || typeof window === 'undefined') return;
 const mq = window.matchMedia('(prefers-color-scheme: dark)');
 const onChange = () => setTheme(resolve());
 mq.addEventListener('change', onChange);
 return () => mq.removeEventListener('change', onChange);
 }, [preference]);

 useEffect(() => {
 const root = document.documentElement;
 if (theme === 'dark') root.classList.add('dark');
 else root.classList.remove('dark');
 }, [theme]);

 const setPreference = (p: ThemePreference) => {
 setPreferenceState(p);
 try {
 localStorage.setItem('theme-preference', p);
 } catch {
 /* ignore */
 }
 };

 const toggleTheme = () => {
 // Cycle: system → light → dark → system
 setPreference(preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system');
 };

 return (
 <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>
 {children}
 </ThemeContext.Provider>
 );
};
