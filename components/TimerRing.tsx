interface TimerRingProps {
  timeRemaining: number
  total: number
}

export function TimerRing({ timeRemaining, total }: TimerRingProps) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, timeRemaining / total)
  const strokeDashoffset = circumference * (1 - progress)
  const colorClass =
    progress > 0.5 ? 'stroke-green-500' : progress > 0.25 ? 'stroke-yellow-500' : 'stroke-red-500'

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" className="stroke-muted" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className={`${colorClass} transition-all duration-1000 ease-linear`}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-2xl font-bold tabular-nums">{timeRemaining}</span>
    </div>
  )
}
