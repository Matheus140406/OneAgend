import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Linha de brilho no topo (na cor do accent) — usada para destacar o card em foco. */
  accentGlow?: boolean;
}

export function Card({ className, accentGlow, children, ...props }: CardProps) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-niche border border-white/[0.06] bg-base-900 shadow-niche', className)}
      {...props}
    >
      {accentGlow && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      )}
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-white/[0.06] p-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-display text-lg font-semibold text-base-100', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
