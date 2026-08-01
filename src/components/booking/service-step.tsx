import { formatDurationMinutes, formatPriceFromCents, cn } from '@/lib/utils';
import type { PublicService } from './types';

export function ServiceStep({
  services,
  selectedServiceId,
  onSelect,
}: {
  services: PublicService[];
  selectedServiceId: string | null;
  onSelect: (service: PublicService) => void;
}) {
  if (services.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-base-400">
        Esse negócio ainda não cadastrou serviços disponíveis para agendamento.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      <h1 className="mb-1 font-display text-xl font-bold text-base-100">Escolha o serviço</h1>
      {services.map((service) => {
        const selected = service.id === selectedServiceId;
        return (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={cn(
              'flex items-center justify-between rounded-xl border p-4 text-left transition-colors active:scale-[0.99]',
              selected ? 'border-accent bg-accent/10' : 'border-base-800 bg-base-900 hover:border-base-700',
            )}
          >
            <div>
              <p className="font-medium text-base-100">{service.name}</p>
              <p className="text-sm text-base-400">{formatDurationMinutes(service.durationMinutes)}</p>
            </div>
            <p className="font-display text-base font-semibold text-accent">
              {formatPriceFromCents(service.priceCents)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
