"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAppSession } from '../../app/clientwrapper';
import { useTheme } from '@/context/ThemeContext';
import { Button } from './button';
import { OverdueBadge } from './OverdueBadge';
import { Menu, Monitor, Moon, Sun, X, Rows3, Rows4 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDensity, useDensityClass } from '@/store/useDensity';

const Header = () => {
 const pathname = usePathname();
 const session = useAppSession();
 const { theme, preference, toggleTheme } = useTheme();
 const density = useDensity((s) => s.density);
 const toggleDensity = useDensity((s) => s.toggle);
 useDensityClass();
 const [mobileOpen, setMobileOpen] = useState(false);

 // Close the drawer on route change.
 useEffect(() => {
 setMobileOpen(false);
 }, [pathname]);

 const isActive = (path: string) => pathname === path;

 const navItems = [
 { href: '/', label: 'Dashboard' },
 { href: '/goal', label: 'Goals' },
 { href: '/milestone', label: 'Milestones' },
 { href: '/task', label: 'Tasks' },
 { href: '/todo', label: 'Todos' },
 { href: '/event', label: 'Events' },
 { href: '/calendar', label: 'Calendar' },
 { href: '/visualization', label: 'Visualization' },
 { href: '/activity', label: 'Activity' },
 ];

 const shouldShowSignOut = session && pathname !== '/login';

 const linkClass = (active: boolean) =>
 `inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
 active
 ? 'bg-muted dark:bg-card text-foreground'
 : 'text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-card hover:text-foreground dark:hover:text-white'
 }`;

 return (
 <header className="bg-card dark:bg-card border-b border-border dark:border-border">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex justify-between h-16 items-center">
 <div className="flex-shrink-0 flex items-center">
 <Link href="/" className="text-xl font-bold text-foreground">
 TaskNest
 </Link>
 </div>

 <nav className="hidden md:flex flex-1 justify-center space-x-2 lg:space-x-4">
 {navItems.map((item) => (
 <Link key={item.href} href={item.href} className={linkClass(isActive(item.href))}>
 {item.label}
 </Link>
 ))}
 </nav>

 <div className="flex items-center space-x-2 sm:space-x-4">
 <OverdueBadge />
 <button
 onClick={toggleDensity}
 className="hidden sm:inline-flex p-2 rounded-md text-foreground dark:text-muted-foreground/60 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-card transition-colors"
 title={`Switch to ${density === 'compact' ? 'comfortable' : 'compact'} density`}
 aria-label="Toggle density"
 >
 {density === 'compact' ? <Rows3 className="w-5 h-5" /> : <Rows4 className="w-5 h-5" />}
 </button>
 <button
 onClick={toggleTheme}
 className="p-2 rounded-md text-foreground dark:text-muted-foreground/60 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-card transition-colors"
 title={`Theme: ${preference} (click to cycle)`}
 aria-label="Toggle theme"
 >
 {preference === 'system' ? (
 <Monitor className="w-5 h-5" />
 ) : theme === 'light' ? (
 <Moon className="w-5 h-5" />
 ) : (
 <Sun className="w-5 h-5" />
 )}
 </button>

 <Link
 href="/profile"
 className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-card hover:text-foreground dark:hover:text-white transition-colors duration-200"
 >
 Profile
 </Link>
 {shouldShowSignOut && (
 <Button
 variant="outline"
 onClick={() => signOut({ callbackUrl: '/login' })}
 className="hidden sm:inline-flex text-sm"
 >
 Sign out
 </Button>
 )}

 <button
 onClick={() => setMobileOpen((v) => !v)}
 className="md:hidden p-2 rounded-md text-foreground dark:text-muted-foreground/60 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-card transition-colors"
 aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
 aria-expanded={mobileOpen}
 >
 {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
 </button>
 </div>
 </div>

 {mobileOpen && (
 <div className="md:hidden py-3 border-t border-border dark:border-border flex flex-col space-y-1">
 {navItems.map((item) => (
 <Link key={item.href} href={item.href} className={linkClass(isActive(item.href))}>
 {item.label}
 </Link>
 ))}
 <Link href="/profile" className={linkClass(isActive('/profile'))}>
 Profile
 </Link>
 {shouldShowSignOut && (
 <Button
 variant="outline"
 onClick={() => signOut({ callbackUrl: '/login' })}
 className="text-sm self-start mt-2"
 >
 Sign out
 </Button>
 )}
 </div>
 )}
 </div>
 </header>
 );
};

export default Header;
