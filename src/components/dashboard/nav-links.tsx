'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav';

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

export function SidebarNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {DASHBOARD_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'bg-accent/10 text-accent' : 'text-base-300 hover:bg-base-800 hover:text-base-100',
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto no-scrollbar px-3 py-2">
      {DASHBOARD_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              active ? 'border-accent bg-accent/10 text-accent' : 'border-base-800 text-base-300',
            )}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
