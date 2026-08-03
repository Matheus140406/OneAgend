import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  Scissors,
  CreditCard,
  BarChart3,
  MessageCircle,
  ShieldCheck,
  Settings,
} from 'lucide-react';

export const DASHBOARD_NAV_ITEMS = [
  { href: '/dashboard', label: 'Hoje', icon: LayoutDashboard },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/profissionais', label: 'Profissionais', icon: UserCog },
  { href: '/dashboard/servicos', label: 'Serviços', icon: Scissors },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/dashboard/mensagens', label: 'Mensagens', icon: MessageCircle },
  { href: '/dashboard/equipe', label: 'Equipe', icon: ShieldCheck },
  { href: '/dashboard/cobranca', label: 'Cobrança', icon: CreditCard },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
] as const;
