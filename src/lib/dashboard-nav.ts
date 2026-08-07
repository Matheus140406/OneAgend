import { LayoutDashboard, CalendarDays, Users, UserCog, Scissors, BarChart3, MessageCircle, UserPlus } from 'lucide-react';
import type { Permission } from '@/lib/auth/rbac';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Se definido, o item mostra um cadeado quando o usuário não tem essa permissão (mas continua navegável — a página em si bloqueia). */
  permission?: Permission;
}

export const DASHBOARD_MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  // "Profissionais" nao existe no protótipo (que nao modela prestadores de
  // servico separados do negocio) — mantido pois e essencial para o motor
  // real de agendamento (expediente/folgas/vinculo com servicos).
  { href: '/dashboard/profissionais', label: 'Profissionais', icon: UserCog },
  { href: '/dashboard/servicos', label: 'Serviços', icon: Scissors },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart3, permission: 'canViewFinancial' },
  { href: '/dashboard/mensagens', label: 'Mensagens', icon: MessageCircle },
  { href: '/dashboard/equipe', label: 'Equipe', icon: UserPlus },
] as const;

// Mantido por compatibilidade com o menu mobile, que lista tudo junto.
export const DASHBOARD_NAV_ITEMS = DASHBOARD_MAIN_NAV;
