import { LayoutDashboard, CalendarDays, Users, UserCog, Scissors, CreditCard } from 'lucide-react';

export const DASHBOARD_NAV_ITEMS = [
  { href: '/dashboard', label: 'Hoje', icon: LayoutDashboard },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/profissionais', label: 'Profissionais', icon: UserCog },
  { href: '/dashboard/servicos', label: 'Serviços', icon: Scissors },
  { href: '/dashboard/cobranca', label: 'Cobrança', icon: CreditCard },
] as const;
