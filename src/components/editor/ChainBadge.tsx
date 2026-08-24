export function ChainBadge({ linkCount }: { linkCount: number }) {
  return (
    <div className="h-fit w-fit rounded-md border border-[#3EA6FF]/60 bg-[#3EA6FF]/15 px-3 py-1 text-xs tabular-nums text-[#7ec8ff]">
      Chain: {linkCount} {linkCount === 1 ? 'link' : 'links'}
    </div>
  )
}
