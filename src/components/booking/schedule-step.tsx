'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PublicProfessional, PublicService } from './types';

function buildNextDays(count: number) {
  const days: { key: string; weekday: string; day: string }[] = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '');
    days.push({ key, weekday, day: String(date.getDate()) });
  }

  return days;
}

const DAYS = buildNextDays(14);

export function ScheduleStep({
  tenantSlug,
  service,
  onSlotSelected,
}: {
  tenantSlug: string;
  service: PublicService;
  onSlotSelected: (selection: { professionalId: string; startsAt: string }) => void;
}) {
  const [professionals, setProfessionals] = useState<PublicProfessional[] | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('any');
  const [dateKey, setDateKey] = useState(DAYS[0]!.key);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    setProfessionals(null);
    setSelectedProfessionalId('any');
    fetch(`/api/public/tenants/${tenantSlug}/services/${service.id}/professionals`)
      .then((res) => res.json())
      .then((data) => setProfessionals(data.professionals ?? []));
  }, [tenantSlug, service.id]);

  useEffect(() => {
    setSelectedSlot(null);
    setSlots(null);
    setLoadingSlots(true);

    const query = new URLSearchParams({
      serviceId: service.id,
      professionalId: selectedProfessionalId,
      date: dateKey,
    });

    fetch(`/api/public/tenants/${tenantSlug}/availability?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [tenantSlug, service.id, selectedProfessionalId, dateKey]);

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    [],
  );

  function handleSelectSlot(slot: string) {
    setSelectedSlot(slot);
    onSlotSelected({ professionalId: selectedProfessionalId, startsAt: slot });
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="font-display text-xl font-bold text-base-100">Escolha o horário</h1>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setSelectedProfessionalId('any')}
          className={cn(
            'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            selectedProfessionalId === 'any'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-base-700 bg-base-900 text-base-300',
          )}
        >
          Qualquer disponível
        </button>
        {professionals?.map((professional) => (
          <button
            key={professional.id}
            onClick={() => setSelectedProfessionalId(professional.id)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              selectedProfessionalId === professional.id
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-base-700 bg-base-900 text-base-300',
            )}
          >
            {professional.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {DAYS.map((day) => (
          <button
            key={day.key}
            onClick={() => setDateKey(day.key)}
            className={cn(
              'flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-colors',
              dateKey === day.key
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-base-800 bg-base-900 text-base-300',
            )}
          >
            <span className="text-[11px] uppercase">{day.weekday}</span>
            <span className="font-display text-sm font-semibold">{day.day}</span>
          </button>
        ))}
      </div>

      <div className="max-h-[38vh] overflow-y-auto rounded-xl border border-base-800 bg-base-900/60 p-3">
        {loadingSlots && <p className="p-3 text-center text-sm text-base-500">Carregando horários...</p>}

        {!loadingSlots && slots && slots.length === 0 && (
          <p className="p-3 text-center text-sm text-base-500">
            Nenhum horário livre nesse dia. Tente outra data.
          </p>
        )}

        {!loadingSlots && slots && slots.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => handleSelectSlot(slot)}
                className={cn(
                  'rounded-lg border py-2 text-sm font-medium transition-colors',
                  selectedSlot === slot
                    ? 'border-accent bg-accent text-accent-contrast'
                    : 'border-base-700 bg-base-800 text-base-100 hover:border-base-600',
                )}
              >
                {timeFormatter.format(new Date(slot))}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
