'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DASHBOARD_MAIN_NAV } from '@/lib/dashboard-nav';
import type { Permission } from '@/lib/auth/rbac';

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

export function SidebarNavLinks({ permissions }: { permissions: Record<Permission, boolean> }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
      {DASHBOARD_MAIN_NAV.map(({ href, label, icon: Icon, permission }) => {
        const active = isActive(pathname, href);
        const locked = permission ? !permissions[permission] : false;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors',
              active ? 'bg-accent/15 font-semibold text-accent' : locked ? 'text-base-600' : 'text-base-400 hover:bg-white/5',
            )}
          >
            <Icon size={14} />
            <span className="flex-1 truncate text-left">{label}</span>
            {locked && <Lock size={9} className="text-base-600" />}
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
      {DASHBOARD_MAIN_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              active ? 'border-accent bg-accent/10 text-accent' : 'border-base-800 text-base-400',
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
