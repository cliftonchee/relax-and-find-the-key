'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function ResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const score = Number(searchParams.get('score') ?? 0)
  const difficulty = searchParams.get('difficulty') ?? 'easy'

  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
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
