import { useState } from 'react'
import { PARTS } from '@/model/partsCatalog'
import { partKey } from '@/model/parts'
import type { StepPartMetadata } from '@/persistence/stepMetadataParser'
import type { OnshapePartMappings } from '@/persistence/onshapeParts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'

const SKIP = '__skip__'

type Props = {
  open: boolean
  parts: StepPartMetadata[]
  onCancel: () => void
  onImport: (mappings: OnshapePartMappings) => void
}

export function OnshapePartMappingDialog({ open, parts, onCancel, onImport }: Props) {
  const [selections, setSelections] = useState<Record<string, string>>({})

  function cancel() {
    setSelections({})
    onCancel()
  }

  function submit() {
    const mappings = Object.fromEntries(
      Object.entries(selections).filter(([, key]) => key !== SKIP),
    )
    setSelections({})
    onImport(mappings)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) cancel() }}>
      <DialogContent className="grid max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Match Onshape parts</DialogTitle>
          <DialogDescription>
            Choose a Wotobot catalog part for anything you want to keep. Unchanged rows import nothing.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 pr-4">
          <div className="space-y-3">
            {parts.map((source) => (
              <div key={source.instanceId} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,1fr)] sm:items-center">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium" title={source.name}>{source.name}</div>
                  {source.productId && source.productId !== source.name ? (
                    <div className="truncate text-xs text-muted-foreground" title={source.productId}>{source.productId}</div>
                  ) : null}
                </div>
                <Select
                  value={selections[source.instanceId] ?? SKIP}
                  onValueChange={(key) => setSelections((current) => ({ ...current, [source.instanceId]: key }))}
                >
                  <SelectTrigger className="w-full" aria-label={`Wotobot part for ${source.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value={SKIP}>Nothing</SelectItem>
                    {['Structure', 'Motion', 'Electronics', 'Pneumatics', 'Competition'].map((group) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {PARTS.filter((part) => part.group === group).map((part) => (
                          <SelectItem key={partKey(part)} value={partKey(part)}>{part.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={cancel}>Cancel import</Button>
          <Button onClick={submit}>Import parts</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
