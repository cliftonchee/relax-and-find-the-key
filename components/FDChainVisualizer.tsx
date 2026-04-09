'use client'

import { useEffect, useState } from 'react'
import { ClosureTrace } from '@/lib/solver'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface Props {
  traces: ClosureTrace[]
  allAttributes: string[]
}

function TracePanel({ trace, allAttributes }: { trace: ClosureTrace; allAttributes: string[] }) {
  const [visibleSteps, setVisibleSteps] = useState(0)

  // Reset and replay animation every time this panel is (re-)mounted or the trace changes
  useEffect(() => {
    setVisibleSteps(0)
    if (trace.steps.length === 0) return

    let step = 0
    let timeoutId: ReturnType<typeof setTimeout>

    const tick = () => {
      step++
      setVisibleSteps(step)
      if (step < trace.steps.length) {
        timeoutId = setTimeout(tick, 600)
      }
    }
    timeoutId = setTimeout(tick, 350)

    return () => clearTimeout(timeoutId)
  }, [trace])

  const isDone = visibleSteps >= trace.steps.length
  const coversAll = trace.finalClosure.length === allAttributes.length

  return (
    <div className="space-y-3">
      {/* Starting set */}
      <div className="flex items-center gap-2 text-sm font-mono">
        <span className="text-muted-foreground text-xs">Start:</span>
        <span className="rounded px-1.5 py-0.5 bg-primary/10 text-primary font-bold">
          {'{' + trace.startAttrs.join(', ') + '}'}
        </span>
      </div>

      {/* FD firing steps */}
      <div className="space-y-2">
        {trace.steps.length === 0 && (
          <p className="text-xs text-muted-foreground font-mono">
            No FDs needed — key attributes already determine all.
          </p>
        )}
        {trace.steps.slice(0, visibleSteps).map((step, i) => {
          const isLatest = i === visibleSteps - 1
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 text-sm font-mono flex-wrap"
              style={isLatest ? { animation: 'fd-step-in 0.3s ease forwards' } : undefined}
            >
              <span className="text-muted-foreground text-xs w-5 shrink-0">{i + 1}.</span>
              <span className="text-primary font-semibold">{step.fd.lhs.join(', ')}</span>
              <span className="text-muted-foreground">→</span>
              <span>{step.fd.rhs.join(', ')}</span>
              <span className="text-muted-foreground text-xs mx-0.5">fires, adds</span>
              <span
                className={cn(
                  'font-bold px-1 rounded text-xs',
                  isLatest
                    ? 'text-emerald-400 bg-emerald-400/15'
                    : 'text-foreground'
                )}
              >
                {'{' + step.newAttrs.join(', ') + '}'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Final closure */}
      {isDone && (
        <div
          className="flex items-center gap-2 text-sm font-mono pt-2 border-t border-border flex-wrap"
          style={{ animation: 'fd-step-in 0.3s ease forwards' }}
        >
          {coversAll ? (
            <>
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-muted-foreground text-xs">Closure covers all attributes:</span>
              <span className="text-emerald-400 font-bold">
                {'{' + trace.finalClosure.join(', ') + '}'}
              </span>
            </>
          ) : (
            <>
              <span className="text-yellow-400">→</span>
              <span className="text-muted-foreground text-xs">Closure:</span>
              <span className="font-bold">{'{' + trace.finalClosure.join(', ') + '}'}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function FDChainVisualizer({ traces, allAttributes }: Props) {
  if (traces.length === 0) return null

  const isSingleKey = traces.length === 1

  return (
    <div className="w-full rounded-lg border border-border bg-card/40 p-4 space-y-3 mt-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        FD Chain Proof
        {isSingleKey && (
          <>
            {' '}
            &mdash; Key{' '}
            <span className="text-primary font-mono">
              {'{' + traces[0].startAttrs.join(', ') + '}'}
            </span>
          </>
        )}
      </p>

      {isSingleKey ? (
        <TracePanel trace={traces[0]} allAttributes={allAttributes} />
      ) : (
        // Use Radix Tabs — unmountOnHide ensures each panel re-mounts (replaying animation) on switch
        <Tabs defaultValue="0">
          <TabsList className="mb-2">
            {traces.map((trace, i) => (
              <TabsTrigger key={i} value={String(i)} className="font-mono text-xs">
                {'{' + trace.startAttrs.join(', ') + '}'}
              </TabsTrigger>
            ))}
          </TabsList>
          {traces.map((trace, i) => (
            <TabsContent key={i} value={String(i)} unmountOnHide>
              <TracePanel trace={trace} allAttributes={allAttributes} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
