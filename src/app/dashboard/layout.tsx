import Link from 'next/link';
import { Bell, Search, Settings, Crown } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { countAppointmentsInMonth, evaluateAppointmentLimit } from '@/lib/billing/appointment-limit';
import { SidebarNavLinks, MobileNavLinks } from '@/components/dashboard/nav-links';
import { SignOutButton } from '@/components/dashboard/sign-out-button';
import { TrialBanner } from '@/components/dashboard/trial-banner';
import { AppointmentLimitBanner } from '@/components/dashboard/appointment-limit-banner';
import { PremiumAvatar } from '@/components/premium/avatar';
import { ROLE_META } from '@/components/premium/role-badge';
import { Kbd } from '@/components/premium/kbd';
import { getNicheThemeVars } from '@/lib/niche-theme';
import { NICHE_META } from '@/lib/niche-labels';
import { cn } from '@/lib/utils';
import type { Permission } from '@/lib/auth/rbac';

const ALL_PERMISSIONS: Permission[] = [
  'canViewFinancial',
  'canManageScheduleAll',
  'canManageClients',
  'canManageSettings',
  'canTriggerBroadcast',
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();

  const usedThisMonth = await countAppointmentsInMonth(prisma, user.tenantId, user.tenant.timezone, new Date());
  const appointmentLimitCheck = evaluateAppointmentLimit(usedThisMonth, user.tenant.plan);

  const permissions = Object.fromEntries(
    ALL_PERMISSIONS.map((p) => [p, user.role === 'OWNER' || user[p]]),
  ) as Record<Permission, boolean>;

  const niche = NICHE_META[user.tenant.niche];
  const roleMeta = ROLE_META[user.role];

  return (
    <div className="flex h-screen overflow-hidden bg-base-950" style={getNicheThemeVars(user.tenant.niche) as React.CSSProperties}>
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-white/[0.06] bg-sidebar md:flex">
        <div className="border-b border-white/[0.06] px-4 pb-4 pt-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/20 text-sm">
              {niche.emoji}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-base-100">OneAgend</p>
              <p className="truncate text-[10px] text-accent">{niche.label}</p>
            </div>
          </Link>
        </div>

        <SidebarNavLinks permissions={permissions} />

        <div className="space-y-0.5 border-t border-white/[0.06] px-2 pb-4 pt-2">
          <Link
            href="/dashboard/configuracoes"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-base-400 transition-colors hover:bg-white/5"
          >
            <Settings size={14} /> Configurações
          </Link>
          <Link
            href="/dashboard/cobranca"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-base-400 transition-colors hover:bg-white/5"
          >
            <Crown size={14} /> Planos
          </Link>

          <div className="mt-1 flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
            <PremiumAvatar name={user.name} colorClassName={cn(roleMeta.bgClassName, roleMeta.colorClassName)} size={24} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-base-100">{user.name.split(' ')[0]}</p>
              <p className={cn('text-[9px]', roleMeta.colorClassName)}>{roleMeta.label}</p>
            </div>
            <SignOutButton iconOnly />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-black/20 px-5 backdrop-blur">
          <div className="relative hidden sm:block">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-500" />
            <input
              placeholder="Buscar…"
              disabled
              className="w-40 rounded-lg border border-white/[0.06] bg-white/[0.03] py-1.5 pl-8 pr-4 text-xs text-base-100 outline-none placeholder:text-base-500"
            />
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <Kbd>⌘K</Kbd>
            </div>
          </div>
          <p className="truncate text-sm font-semibold text-base-100 sm:hidden">{user.tenant.name}</p>

          <div className="flex items-center gap-2">
            <button className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/5">
              <Bell size={14} className="text-base-500" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] px-3 py-1.5">
              <PremiumAvatar name={user.name} colorClassName={cn(roleMeta.bgClassName, roleMeta.colorClassName)} size={22} />
              <div className="hidden sm:block">
                <p className="text-[11px] font-semibold leading-tight text-base-100">{user.name}</p>
                <p className={cn('text-[9px] leading-tight', roleMeta.colorClassName)}>{roleMeta.label}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="md:hidden">
          <MobileNavLinks />
        </div>

        <TrialBanner subscription={user.tenant.subscription} />
        <AppointmentLimitBanner check={appointmentLimitCheck} />

        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
