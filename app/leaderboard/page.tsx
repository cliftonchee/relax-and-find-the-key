'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Difficulty = 'easy' | 'medium' | 'hard'

interface ScoreEntry {
  id: number
  username: string
  score: number
  created_at: string
}

const MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' }

function LeaderboardTable({ difficulty }: { difficulty: Difficulty }) {
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setFetchError(false)
    fetch(`/api/leaderboard?difficulty=${difficulty}`)
      .then(r => r.json())
      .then(data => setScores(Array.isArray(data) ? data : []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [difficulty])

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Loading...</p>
  }

  if (fetchError) {
    return <p className="text-center text-muted-foreground py-8">Failed to load scores.</p>
  }

  if (scores.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No scores yet. Be the first!</p>
  }

  return (
    <div className="space-y-2">
      {scores.map((entry, i) => (
        <div
          key={entry.id}
          className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <span className="w-8 text-center text-lg font-bold">
            {MEDAL[i] ?? <span className="text-muted-foreground text-sm">#{i + 1}</span>}
          </span>
          <span className="flex-1 font-mono font-semibold tracking-wide">{entry.username}</span>
          <Badge variant="secondary" className="font-mono text-base">
            {entry.score}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {new Date(entry.created_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-8 max-w-xl mx-auto">
      <div className="w-full flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Leaderboard</h1>
        <Link href="/">
          <Button variant="outline">Play</Button>
        </Link>
      </div>

      <Card className="w-full">
        <CardContent className="pt-6">
          <Tabs defaultValue="easy">
            <TabsList className="w-full">
              <TabsTrigger value="easy" className="flex-1">Easy</TabsTrigger>
              <TabsTrigger value="medium" className="flex-1">Medium</TabsTrigger>
              <TabsTrigger value="hard" className="flex-1">Hard</TabsTrigger>
            </TabsList>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
              <TabsContent key={diff} value={diff}>
                <LeaderboardTable difficulty={diff} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}
