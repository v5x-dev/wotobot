import { totalWeightPounds } from './weight'
import type { PlacedPart } from './parts'

export function WeightBadge({ parts }: { parts: PlacedPart[] }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 h-fit w-fit -translate-x-1/2 rounded-md border border-sidebar-border bg-sidebar/90 px-3 py-1 text-xs tabular-nums">
      Total weight: {totalWeightPounds(parts).toFixed(2)} lbs
    </div>
  )
}
