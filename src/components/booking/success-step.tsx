import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PublicService } from './types';

export function SuccessStep({
  service,
  startsAt,
  onNewBooking,
}: {
  service: PublicService;
  startsAt: string;
  onNewBooking: () => void;
}) {
  const date = new Date(startsAt);
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Check size={32} />
      </div>
      <h1 className="font-display text-2xl font-bold text-base-100">Agendamento confirmado</h1>
      <p className="text-base-400">
        {service.name} · {dateLabel}
      </p>
      <p className="text-sm text-base-500">Você vai receber um lembrete no WhatsApp antes do horário.</p>
      <Button variant="outline" size="lg" className="mt-4" onClick={onNewBooking}>
        Fazer novo agendamento
      </Button>
    </div>
  );
}
