import { FD } from '@/lib/solver'

interface FDDisplayProps {
  fds: FD[]
}

export function FDDisplay({ fds }: FDDisplayProps) {
  return (
    <div className="space-y-1">
      {fds.map((fd, i) => (
        <div key={i} className="font-mono text-lg">
          <span className="text-primary font-semibold">{fd.lhs.join(', ')}</span>
          <span className="mx-2 text-muted-foreground">→</span>
          <span>{fd.rhs.join(', ')}</span>
        </div>
      ))}
    </div>
  )
}
