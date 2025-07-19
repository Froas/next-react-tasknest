"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAppSession } from '../../app/clientwrapper';
import { Button } from './button';

const Header = () => {
  const pathname = usePathname();
  const session = useAppSession();

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
    <header className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-xl font-bold text-foreground">
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
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center space-x-4">
            <Link
              href="/profile"
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
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
