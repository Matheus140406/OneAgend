'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Select } from '@/components/ui/select';
import type { AppointmentStatus } from '@prisma/client';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
  DONE: 'Concluído',
};

export function AppointmentStatusSelect({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: AppointmentStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function handleChange(newStatus: AppointmentStatus) {
    setValue(newStatus);
    setSaving(true);
    await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <Select
      value={value}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value as AppointmentStatus)}
      className="h-9 w-auto px-2 text-xs"
    >
      {Object.entries(STATUS_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </Select>
  );
}
