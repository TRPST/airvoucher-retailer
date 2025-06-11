'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/utils/cn';

// Variant definitions using CVA for compact tiles
const compactStatsTileVariants = cva(
  'rounded-lg transition-all flex flex-col items-start justify-between min-w-[140px] flex-shrink-0',
  {
    variants: {
      intent: {
        default: 'bg-card text-card-foreground border border-border shadow-sm',
        primary: 'bg-primary/10 text-primary border border-primary/20',
        success: 'bg-green-500/10 text-green-500 border border-green-500/20',
        warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
        info: 'bg-primary/10 text-primary border border-primary/20',
        danger: 'bg-destructive/10 text-destructive border border-destructive/20',
      },
    },
    defaultVariants: {
      intent: 'default',
    },
  }
);

// Export interface for component props
export interface CompactStatsTileProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof compactStatsTileVariants> {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}

export function CompactStatsTile({
  className,
  intent,
  label,
  value,
  icon: Icon,
  ...props
}: CompactStatsTileProps) {
  return (
    <div className={cn(compactStatsTileVariants({ intent, className }), 'h-20 p-4')} {...props}>
      <div className="mb-1 flex w-full items-center justify-between">
        <h3 className="flex-1 truncate text-sm font-medium text-muted-foreground">{label}</h3>
        {Icon && <Icon className="ml-2 h-4 w-4 flex-shrink-0 opacity-70" />}
      </div>
      <div className="w-full">
        <p className="truncate text-base font-bold">{value}</p>
      </div>
    </div>
  );
}
