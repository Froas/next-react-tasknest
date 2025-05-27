"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Button } from './button';

const Header = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/goals', label: 'Goals' },
    { href: '/milestones', label: 'Milestones' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/todos', label: 'Todos' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/visualization', label: 'Visualization' },
  ];

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
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
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center space-x-4">
            <Link
              href="/profile"
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
            >
              Profile
            </Link>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm"
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
  