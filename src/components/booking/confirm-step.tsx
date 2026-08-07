import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDurationMinutes, formatPriceFromCents } from '@/lib/utils';
import type { PublicService } from './types';

export function ConfirmStep({
  service,
  startsAt,
  clientName,
  clientWhatsapp,
  onChangeName,
  onChangeWhatsapp,
  error,
}: {
  service: PublicService;
  startsAt: string;
  clientName: string;
  clientWhatsapp: string;
  onChangeName: (value: string) => void;
  onChangeWhatsapp: (value: string) => void;
  error: string | null;
}) {
  const date = new Date(startsAt);
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="font-display text-xl font-bold text-base-100">Confirme seus dados</h1>

      <div className="rounded-xl border border-base-800 bg-base-900 p-4">
        <p className="font-medium text-base-100">{service.name}</p>
        <p className="mt-1 text-sm text-base-400">
          {dateLabel} às {timeLabel} · {formatDurationMinutes(service.durationMinutes)}
        </p>
        <p className="mt-1 font-display text-sm font-semibold text-accent">
          {formatPriceFromCents(service.priceCents)}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clientName">Seu nome</Label>
        <Input
          id="clientName"
          value={clientName}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Nome completo"
          autoComplete="name"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clientWhatsapp">WhatsApp</Label>
        <Input
          id="clientWhatsapp"
          value={clientWhatsapp}
          onChange={(e) => onChangeWhatsapp(e.target.value)}
          placeholder="(11) 99999-9999"
          inputMode="tel"
          autoComplete="tel"
        />
        <p className="text-xs text-base-500">Você vai receber a confirmação e um lembrete por aqui.</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
