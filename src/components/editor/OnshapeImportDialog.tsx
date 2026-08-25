import { useEffect, useState } from 'react'
import { Check, LoaderCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  fileName: string
  error: string
  loading: boolean
  progress: string
  startedAt: number
  fileSize: number
  onChooseFile: () => void
  onCancel: () => void
  onOpenChange: (open: boolean) => void
}

export function OnshapeImportDialog({
  open,
  fileName,
  error,
  loading,
  progress,
  startedAt,
  fileSize,
  onChooseFile,
  onCancel,
  onOpenChange,
}: Props) {
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (!loading) return
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [loading])

  const elapsedSeconds = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
  const fileSizeMb = fileSize / (1024 * 1024)
  const longRunning = elapsedSeconds >= 30 && /Scanning|Decoding/.test(progress)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from Onshape</DialogTitle>
          <DialogDescription>
            {loading
              ? `${fileName} is ${fileSizeMb.toFixed(1)} MB.`
              : error
                ? 'The STEP file could not be imported.'
                : 'Before exporting your STEP file, turn on:'}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground">
            <LoaderCircle className="animate-spin" />
            <div>
              <div className="text-foreground">{progress}</div>
              <div className="mt-1 text-xs">Elapsed time: {elapsedSeconds}s</div>
              {longRunning ? (
                <div className="mt-2 max-w-sm text-xs">
                  This file is taking longer than usual, but the metadata scan is still running.
                </div>
              ) : null}
            </div>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            {error}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2.5 font-medium">
            <Check aria-hidden="true" className="size-4 shrink-0" />
            <span>Export models oriented Y axis up</span>
          </div>
        )}
        {loading ? (
          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>Cancel import</Button>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onChooseFile}>{error ? 'Choose another file' : 'Choose STEP file'}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
