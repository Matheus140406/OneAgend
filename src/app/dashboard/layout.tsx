import Link from 'next/link';
import { requireCurrentUser } from '@/lib/auth';
import { PLAN_DETAILS } from '@/lib/plans';
import { Badge } from '@/components/ui/badge';
import { SidebarNavLinks, MobileNavLinks } from '@/components/dashboard/nav-links';
import { SignOutButton } from '@/components/dashboard/sign-out-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();

  return (
    <div className="flex min-h-screen bg-base-950">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-base-800 p-4 md:flex">
        <Link href="/dashboard" className="mb-6 px-2 font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          OneAgend
        </Link>
        <SidebarNavLinks />
        <div className="mt-auto">
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-base-800 bg-base-950/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <div>
              <p className="font-display text-base font-semibold text-base-100">{user.tenant.name}</p>
              <p className="text-xs text-base-500">{user.tenant.businessType}</p>
            </div>
            <Badge variant="accent">{PLAN_DETAILS[user.tenant.plan].label}</Badge>
          </div>
          <div className="md:hidden">
            <MobileNavLinks />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
