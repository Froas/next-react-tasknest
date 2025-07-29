"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAppSession } from '../../app/clientwrapper';
import { useTheme } from '@/context/ThemeContext';
import { Button } from './button';
import { Moon, Sun } from 'lucide-react';

const Header = () => {
  const pathname = usePathname();
  const session = useAppSession();
  const { theme, toggleTheme } = useTheme();

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
  ];

  // Hide sign out button if not authenticated or on login page
  const shouldShowSignOut = session && pathname !== '/login';

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              TaskNest
            </Link>
          </div>
          
          <nav className="flex-1 flex justify-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>
            
            <Link
              href="/profile"
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
            >
              Profile
            </Link>
            {shouldShowSignOut && (
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm"
              >
                Sign out
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
