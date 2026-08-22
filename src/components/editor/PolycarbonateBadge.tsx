import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { PlacedPart } from '@/model/parts'
import {
  evaluatePolycarbonate,
  MAX_POLYCARBONATE_PIECES,
  MAX_TOTAL_AREA,
  polycarbonateLimitReasons,
  formatInches,
} from '@/model/polycarbonateLimits'

export function PolycarbonateBadge({ parts }: { parts: PlacedPart[] }) {
  const status = evaluatePolycarbonate(parts)
  if (!status.over) return null

  const reasons = polycarbonateLimitReasons(status)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="pointer-events-auto h-fit w-fit rounded-md border border-destructive/60 bg-destructive/15 px-3 py-1 text-xs tabular-nums text-destructive"
        >
          {status.overArea
            ? `PC ${formatInches(status.totalArea)}/${MAX_TOTAL_AREA} in² over limit`
            : `PC ${status.count}/${MAX_POLYCARBONATE_PIECES} over limit`}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <ul className="grid gap-0.5">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}
