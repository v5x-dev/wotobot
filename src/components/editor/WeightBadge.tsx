import { totalWeightPounds } from '@/model/weight'
import type { PlacedPart } from '@/model/parts'

export function WeightBadge({ parts }: { parts: PlacedPart[] }) {
  return (
    <div className="h-fit w-fit rounded-md border border-sidebar-border bg-sidebar/90 px-3 py-1 text-xs tabular-nums">
      {totalWeightPounds(parts).toFixed(2)} lbs
    </div>
  )
}
