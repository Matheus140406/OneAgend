import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', {
  variants: {
    variant: {
      neutral: 'bg-base-800 text-base-300',
      accent: 'bg-accent/15 text-accent',
      warn: 'bg-warn/15 text-warn',
      danger: 'bg-danger/15 text-danger',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
