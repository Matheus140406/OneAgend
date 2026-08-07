'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProgressHeader } from './progress-header';
import { ServiceStep } from './service-step';
import { ScheduleStep } from './schedule-step';
import { ConfirmStep } from './confirm-step';
import { SuccessStep } from './success-step';
import type { PublicService, PublicTenant } from './types';

type Step = 1 | 2 | 3 | 4;

export function BookingFlow({ tenant }: { tenant: PublicTenant }) {
  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [selection, setSelection] = useState<{ professionalId: string; startsAt: string } | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selectedService || !selection) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch(`/api/public/tenants/${tenant.slug}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: selectedService.id,
        professionalId: selection.professionalId,
        startsAt: selection.startsAt,
        clientName,
        clientWhatsapp,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Não foi possível confirmar. Tente outro horário.');
      return;
    }

    setStep(4);
  }

  function reset() {
    setStep(1);
    setSelectedService(null);
    setSelection(null);
    setClientName('');
    setClientWhatsapp('');
    setError(null);
  }

  const canContinueStep1 = Boolean(selectedService);
  const canContinueStep2 = Boolean(selection);
  const canConfirmStep3 = clientName.trim().length >= 2 && clientWhatsapp.trim().length >= 8;

  return (
    <>
      {step < 4 && (
        <ProgressHeader
          businessName={tenant.name}
          step={step}
          onBack={step > 1 ? () => setStep((s) => (s - 1) as Step) : undefined}
        />
      )}

      <div className="flex flex-1 flex-col overflow-y-auto">
        {step === 1 && (
          <ServiceStep
            services={tenant.services}
            selectedServiceId={selectedService?.id ?? null}
            onSelect={(service) => {
              setSelectedService(service);
              setSelection(null);
            }}
          />
        )}

        {step === 2 && selectedService && (
          <ScheduleStep
            tenantSlug={tenant.slug}
            service={selectedService}
            onSlotSelected={(value) => setSelection(value)}
          />
        )}

        {step === 3 && selectedService && selection && (
          <ConfirmStep
            service={selectedService}
            startsAt={selection.startsAt}
            clientName={clientName}
            clientWhatsapp={clientWhatsapp}
            onChangeName={setClientName}
            onChangeWhatsapp={setClientWhatsapp}
            error={error}
          />
        )}

        {step === 4 && selectedService && selection && (
          <SuccessStep service={selectedService} startsAt={selection.startsAt} onNewBooking={reset} />
        )}
      </div>

      {step < 4 && (
        <footer className="sticky bottom-0 border-t border-base-800 bg-base-950/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          {step === 1 && (
            <Button size="lg" className="w-full" disabled={!canContinueStep1} onClick={() => setStep(2)}>
              Continuar
            </Button>
          )}
          {step === 2 && (
            <Button size="lg" className="w-full" disabled={!canContinueStep2} onClick={() => setStep(3)}>
              Continuar
            </Button>
          )}
          {step === 3 && (
            <Button size="lg" className="w-full" disabled={!canConfirmStep3 || submitting} onClick={handleConfirm}>
              {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
            </Button>
          )}
        </footer>
      )}
    </>
  );
}
