import Link from 'next/link';
import type { AppointmentLimitCheck } from '@/lib/billing/appointment-limit';
import { cn } from '@/lib/utils';

const WARNING_THRESHOLD = 0.8; // avisa a partir de 80% de uso

export function AppointmentLimitBanner({ check }: { check: AppointmentLimitCheck }) {
  if (check.limit === null) return null; // plano sem teto (Platina)

  const ratio = check.used / check.limit;
  if (ratio < WARNING_THRESHOLD) return null;

  const atLimit = !check.allowed;

  return (
    <div
      className={cn(
        'px-4 py-2 text-center text-sm md:px-6',
        atLimit ? 'bg-danger/10 text-danger' : 'bg-warn/10 text-warn',
      )}
    >
      {atLimit ? (
        <>
          Limite de {check.limit} agendamentos deste mês atingido. Novos agendamentos públicos ficam bloqueados até o
          próximo mês.{' '}
        </>
      ) : (
        <>
          Você já usou {check.used} de {check.limit} agendamentos deste mês ({check.remaining} restantes).{' '}
        </>
      )}
      <Link href="/dashboard/cobranca" className="font-medium underline underline-offset-2">
        Trocar de plano
      </Link>
    </div>
  );
}
