import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, GraduationCap, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { useRobotEditor } from '@/editor/useRobotEditor'
import { TUTORIAL_STEPS } from './tutorialSteps'

type Editor = ReturnType<typeof useRobotEditor>

const STORAGE_KEY = 'wotobot.tutorialSeen.v1'

function highlightTarget(selector: string | undefined) {
  // Remove previous highlights
  document.querySelectorAll('[data-tutorial-highlight]').forEach((el) => {
    el.removeAttribute('data-tutorial-highlight')
    const htmlEl = el as HTMLElement
    htmlEl.style.outline = ''
    htmlEl.style.outlineOffset = ''
    htmlEl.style.boxShadow = ''
    htmlEl.style.borderRadius = ''
  })
  if (!selector) return
  const el = document.querySelector(selector) as HTMLElement | null
  if (!el) return
  el.setAttribute('data-tutorial-highlight', 'true')
  el.style.outline = '2px solid hsl(var(--primary))'
  el.style.outlineOffset = '2px'
  el.style.boxShadow = '0 0 0 6px hsl(var(--primary) / 0.15)'
  el.style.borderRadius = '6px'
  // Scroll into view if collapsed sidebar etc.
  try {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  } catch {
    // ignore
  }
}

function clearHighlights() {
  highlightTarget(undefined)
}

export function TutorialOverlay({
  open,
  onOpenChange,
  editor,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: Editor
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const prevOpenRef = useRef(open)
  const cardRef = useRef<HTMLDivElement>(null)

  const steps = TUTORIAL_STEPS
  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1
  const validated = step.validate ? step.validate(editor) : true

  // Reset to first step when opening
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setStepIndex(0)
    }
    prevOpenRef.current = open
  }, [open])

  // Highlight target element when step changes or when open
  useLayoutEffect(() => {
    if (!open) {
      clearHighlights()
      return
    }
    highlightTarget(step.target)
    return () => {
      // cleanup handled on next effect; keep highlight while open for current step
    }
  }, [open, step.target])

  // Re-apply highlight after DOM mutations (sidebar collapse, etc.)
  useEffect(() => {
    if (!open || !step.target) return
    const onResize = () => highlightTarget(step.target)
    window.addEventListener('resize', onResize)
    const id = window.setInterval(onResize, 800)
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearInterval(id)
    }
  }, [open, step.target])

  // Clear highlights when closing
  useEffect(() => {
    if (!open) clearHighlights()
    return () => {
      if (!open) clearHighlights()
    }
  }, [open])

  // Keyboard nav inside tutorial
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'Escape') {
        onOpenChange(false)
      } else if (e.key === 'ArrowRight') {
        if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1)
      } else if (e.key === 'ArrowLeft') {
        if (stepIndex > 0) setStepIndex((i) => i - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, stepIndex, steps.length, onOpenChange])

  if (!open) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col">
      {/* dim backdrop but allow clicks through — highlight will be above */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px]" />

      {/* Center card — pointer events enabled */}
      <div className="pointer-events-auto relative flex min-h-0 flex-1 items-end justify-center p-3 sm:items-center sm:p-6">
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-title"
          className="flex max-h-[min(86vh,700px)] w-full max-w-xl flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GraduationCap className="size-4" />
              </span>
              <div>
                <h2 id="tutorial-title" className="text-sm font-semibold leading-none">
                  {step.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Step {stepIndex + 1} of {steps.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close tutorial"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Progress — single segmented indicator */}
          <div className="px-4 pt-3">
            <div className="flex gap-1">
              {steps.map((s, idx) => (
                <button
                  key={s.id}
                  aria-label={`Go to step ${idx + 1}: ${s.title}`}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${idx === stepIndex ? 'bg-primary' : idx < stepIndex ? 'bg-primary/50' : 'bg-muted'}`}
                  onClick={() => setStepIndex(idx)}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <p className="text-sm leading-relaxed">{step.description}</p>
            {step.detail ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {step.detail}
              </p>
            ) : null}
            {step.hint ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                {step.hint}
              </div>
            ) : null}

            {step.validate ? (
              <div className="mt-4 flex items-center gap-2 text-xs">
                {validated ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-800 dark:bg-green-900/30 dark:text-green-200">
                    <Check className="size-3.5" /> {step.validateLabel ?? 'Completed'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                    {step.validateLabel ?? 'Do the task to continue'} — you can still click Next
                  </span>
                )}
              </div>
            ) : null}

            {/* Differences callout for vs-protobot step */}
            {step.id === 'vs-protobot' ? (
              <div className="mt-4 grid gap-2 rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed">
                <div className="grid grid-cols-[90px_1fr_1fr] gap-2 font-medium">
                  <span />
                  <span>wotobot</span>
                  <span>Protobot Rebuilt</span>
                </div>
                <div className="grid grid-cols-[90px_1fr_1fr] gap-2">
                  <span className="text-muted-foreground">Runtime</span>
                  <span>React + r3f (browser)</span>
                  <span>Unity 2021.3.5f1</span>
                </div>
                <div className="grid grid-cols-[90px_1fr_1fr] gap-2">
                  <span className="text-muted-foreground">Install</span>
                  <span>npm install or static dist</span>
                  <span>Protobot Rebuilt.zip → .exe</span>
                </div>
                <div className="grid grid-cols-[90px_1fr_1fr] gap-2">
                  <span className="text-muted-foreground">Saving</span>
                  <span>.wbb local (FSA)</span>
                  <span>SavedObject + Firebase</span>
                </div>
                <div className="grid grid-cols-[90px_1fr_1fr] gap-2">
                  <span className="text-muted-foreground">Import</span>
                  <span>STEP via worker</span>
                  <span>—</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Skip
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isFirst}
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              {isLast ? (
                <Button
                  size="sm"
                  onClick={() => {
                    try {
                      localStorage.setItem(STORAGE_KEY, '1')
                    } catch {
                      // ignore
                    }
                    onOpenChange(false)
                  }}
                >
                  Done
                </Button>
              ) : (
                <Button size="sm" onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}>
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
