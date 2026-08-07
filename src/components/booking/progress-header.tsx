import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_LABELS = ['Serviço', 'Horário', 'Confirmar'];

export function ProgressHeader({
  businessName,
  step,
  onBack,
}: {
  businessName: string;
  step: 1 | 2 | 3 | 4;
  onBack?: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-base-800 bg-base-950/95 px-4 pb-3 pt-4 backdrop-blur">
      <div className="flex items-center gap-2">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-base-300 hover:bg-base-800"
          >
            <ChevronLeft size={20} />
          </button>
        ) : (
          <div className="w-7" />
        )}
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-medium text-base-300">{businessName}</p>
        </div>
        <div className="w-7" />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1;
          const active = stepNumber === step;
          const done = stepNumber < step;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'h-1.5 w-full rounded-full transition-colors',
                  done || active ? 'bg-accent' : 'bg-base-800',
                )}
              />
              <span
                className={cn(
                  'text-[11px]',
                  active ? 'font-medium text-base-100' : 'text-base-500',
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </header>
  );
}
