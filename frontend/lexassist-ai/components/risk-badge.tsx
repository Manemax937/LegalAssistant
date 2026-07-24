import { cn } from '@/lib/utils'
import type { RiskSeverity } from '@/lib/data'

const styles: Record<RiskSeverity, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-accent/15 text-accent-foreground border-accent/30',
  low: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
}

const labels: Record<RiskSeverity, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function RiskBadge({
  severity,
  className,
}: {
  severity: RiskSeverity
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        styles[severity],
        className,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          severity === 'high' && 'bg-destructive',
          severity === 'medium' && 'bg-accent',
          severity === 'low' && 'bg-chart-4',
        )}
      />
      {labels[severity]}
    </span>
  )
}
