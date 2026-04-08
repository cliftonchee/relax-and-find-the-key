import Link from 'next/link'
import { TIME_PER_QUESTION } from '@/lib/scoring'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const difficulties = [
  {
    level: 'easy' as const,
    label: 'Easy',
    description: '3–4 attributes, 2-3 FDs, 1 candidate key (singleton), 1-2 chain depth',
    multiplier: '×1',
    color: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
  },
  {
    level: 'medium' as const,
    label: 'Medium',
    description: '5–6 attributes, 3-5 FDs, up to 2 candidate keys (may be composite), 2-3 chain depth, up to 1 redundant FD, up to 2 equivalent attributes',
    multiplier: '×2',
    color: 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20',
  },
  {
    level: 'hard' as const,
    label: 'Hard',
    description: '6–8 attributes, 5-8 FDs, 2+ candidate keys, 3+ chain depth, 1+ redundant FDs, 2+ equivalent attributes',
    multiplier: '×3',
    color: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-10">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-extrabold tracking-tight">🔑 Relax and Find the Key</h1>
        <p className="text-muted-foreground text-lg">
          Identify candidate keys before the clock runs out
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {difficulties.map(({ level, label, description, multiplier, color }) => (
          <Link key={level} href={`/game?difficulty=${level}`}>
            <Card className={`h-full flex flex-col cursor-pointer border transition-colors ${color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  {label}
                  <Badge variant="secondary">{multiplier} pts</Badge>
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <p className="text-sm text-muted-foreground">10 questions · {TIME_PER_QUESTION[level]}s each</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Link href="/leaderboard">
        <Button variant="outline" size="lg">
          View Leaderboard
        </Button>
      </Link>

      <div className="max-w-md text-center text-sm text-muted-foreground space-y-1">
        <p>Given a relation schema R and a set of functional dependencies,</p>
        <p>click the attributes that form each candidate key, then submit.</p>
        <p>Find all keys to score. The faster you answer, the more points you earn.</p>
      </div>
    </main>
  )
}
