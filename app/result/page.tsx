'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { QuestionResult } from '@/app/game/page'

function ResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const score = Number(searchParams.get('score') ?? 0)
  const difficulty = searchParams.get('difficulty') ?? 'easy'

  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<QuestionResult[]>([])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('quiz-history')
      if (raw) setHistory(JSON.parse(raw))
    } catch {
      // ignore parse errors
    }
  }, [])

  async function handleSave() {
    if (!username.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), score, difficulty }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
    } catch {
      setError('Could not save score. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-8 max-w-2xl mx-auto pt-16">
      <div className="text-center space-y-2">
        <p className="text-muted-foreground uppercase tracking-widest text-sm">Game Over</p>
        <h1 className="text-7xl font-extrabold tabular-nums">{score}</h1>
        <p className="text-muted-foreground capitalize">{difficulty} mode</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-lg">Enter your name</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!saved ? (
            <>
              <Input
                placeholder="YOUR NAME"
                value={username}
                onChange={e => setUsername(e.target.value.toUpperCase().slice(0, 20))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="text-center text-xl font-bold tracking-widest uppercase"
                maxLength={20}
                disabled={saving}
              />
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={!username.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save to Leaderboard'}
              </Button>
            </>
          ) : (
            <p className="text-center text-green-400 font-semibold py-2">Score saved!</p>
          )}
        </CardContent>
      </Card>

      {/* Question-by-question summary */}
      {history.length > 0 && (
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Question Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((result, i) => (
              <div key={i} className="relative group">
                {/* Summary row */}
                <div
                  className={cn(
                    'flex items-start gap-3 rounded-md px-3 py-2 text-sm cursor-default',
                    result.correct ? 'bg-green-500/10' : 'bg-red-500/10'
                  )}
                >
                  {/* Icon + number */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <span className={result.correct ? 'text-green-400' : 'text-red-400'}>
                      {result.correct ? '✓' : '✗'}
                    </span>
                    <span className="text-muted-foreground text-xs w-4">Q{i + 1}</span>
                  </div>

                  {/* Schema + answer info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="font-mono text-xs text-muted-foreground">
                      R({result.attributes.join(', ')})
                    </p>
                    <p className="font-mono text-xs">
                      <span className="text-muted-foreground">Answer: </span>
                      {result.candidateKeys.map(k => '{' + k.join(', ') + '}').join(', ')}
                    </p>
                    {!result.correct && result.submittedKeys.length > 0 && (
                      <p className="font-mono text-xs text-red-400/80">
                        <span className="text-muted-foreground">You said: </span>
                        {result.submittedKeys.map(k => '{' + k.join(', ') + '}').join(', ')}
                      </p>
                    )}
                    {!result.correct && result.submittedKeys.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Timed out</p>
                    )}
                  </div>

                  {/* Points + hover hint */}
                  <div className="shrink-0 text-xs font-semibold tabular-nums pt-0.5 flex flex-col items-end gap-1">
                    {result.correct ? (
                      <span className="text-green-400">+{result.pointsEarned}</span>
                    ) : (
                      <span className="text-muted-foreground">+0</span>
                    )}
                    <span className="text-muted-foreground/50 text-[10px] font-normal group-hover:text-muted-foreground transition-colors">
                      hover
                    </span>
                  </div>
                </div>

                {/* Hover popover — full question detail */}
                <div className="pointer-events-none invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-0 right-0 bottom-full mb-1.5 z-20">
                  <div className="rounded-lg border border-border bg-card shadow-lg p-3 space-y-2 text-xs font-mono">
                    {/* Schema */}
                    <p className="font-semibold text-sm">
                      R({result.attributes.join(', ')})
                    </p>

                    {/* FDs */}
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground uppercase tracking-wide text-[10px] font-sans">
                        Functional Dependencies
                      </p>
                      {result.fds.map((fd, j) => (
                        <p key={j}>
                          <span className="text-primary font-semibold">{fd.lhs.join(', ')}</span>
                          <span className="text-muted-foreground mx-1.5">→</span>
                          <span>{fd.rhs.join(', ')}</span>
                        </p>
                      ))}
                    </div>

                    {/* Divider + answer */}
                    <div className="border-t border-border pt-2 space-y-0.5">
                      <p className="text-muted-foreground uppercase tracking-wide text-[10px] font-sans">
                        Candidate Keys
                      </p>
                      <p className="text-emerald-400 font-semibold">
                        {result.candidateKeys.map(k => '{' + k.join(', ') + '}').join('  ·  ')}
                      </p>
                    </div>
                  </div>

                  {/* Caret pointing down into the row */}
                  <div className="flex justify-center">
                    <div className="w-2 h-2 bg-card border-r border-b border-border rotate-45 -mt-1.5" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push(`/game?difficulty=${difficulty}`)}>
          Play Again
        </Button>
        <Button onClick={() => router.push('/leaderboard')}>View Leaderboard</Button>
      </div>
    </main>
  )
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  )
}
