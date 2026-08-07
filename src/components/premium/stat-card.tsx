import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function StatCard({
  label,
  value,
  sub,
  icon,
  up,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  up?: boolean;
}) {
  return (
    <Card accentGlow>
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/[0.09] text-accent">{icon}</div>
          {sub && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-400' : 'text-danger'}`}>
              {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {sub}
            </span>
          )}
        </div>
        <p className="font-display text-2xl font-bold tracking-tight text-base-100">{value}</p>
        <p className="mt-1 text-xs text-base-500">{label}</p>
      </div>
    </Card>
  );
}
