# Relax and Find the Key — Implementation Plan

**Goal:** Build an arcade-style web game where players identify candidate keys of relational schemas under time pressure, with a per-difficulty leaderboard.

**Architecture:** Next.js 14 App Router with client-side problem generation (solver + generator run in the browser), API routes only for leaderboard read/write, and Supabase Postgres for score persistence. All game state managed via `useReducer` on the game page; score passed to result page via URL search params.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Vitest, Supabase JS client

---

## User Flow

```
/ (home) → select difficulty
  → /game?difficulty=easy  (10 questions, 60s each, click-to-select attributes)
  → /result?score=450&difficulty=easy  (enter username)
  → /leaderboard  (tabs: Easy | Medium | Hard, top 20)
```

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `/Users/cheeweixiongclifton/Desktop/GitHub/relax-and-find-the-key/` (project root)

**Step 1: Initialize the project**

Run from `/Users/cheeweixiongclifton/Desktop/GitHub/relax-and-find-the-key/`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```
Expected: scaffolded Next.js project in current directory.

**Step 2: Verify dev server starts**
```bash
npm run dev
```
Expected: server running at http://localhost:3000

**Step 3: Commit**
```bash
git init
git add .
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

## Task 2: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test script)

**Step 1: Install Vitest**
```bash
npm install -D vitest @vitejs/plugin-react
```

**Step 2: Create `vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

**Step 3: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Verify Vitest works**
```bash
npm test
```
Expected: `No test files found` (no failures).

**Step 5: Commit**
```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: configure Vitest for unit testing"
```

---

## Task 3: Install shadcn/ui and Components

**Step 1: Initialize shadcn**
```bash
npx shadcn@latest init --yes
```
When prompted, select: Default style, Slate base color, yes to CSS variables.

**Step 2: Install required components**
```bash
npx shadcn@latest add button card badge input tabs progress
```

**Step 3: Commit**
```bash
git add .
git commit -m "chore: install shadcn/ui components"
```

---

## Task 4: Implement Solver (TDD)

**Files:**
- Create: `lib/solver.ts`
- Create: `lib/__tests__/solver.test.ts`

**Step 1: Write the failing tests**

Create `lib/__tests__/solver.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { computeClosure, isSuperkey, findCandidateKeys, FD } from '../solver'

describe('computeClosure', () => {
  it('returns only the input when no FDs apply', () => {
    const fds: FD[] = [{ lhs: ['B'], rhs: ['C'] }]
    expect(computeClosure(['A'], fds)).toEqual(['A'])
  })

  it('applies a single FD', () => {
    const fds: FD[] = [{ lhs: ['A'], rhs: ['B'] }]
    expect(computeClosure(['A'], fds)).toEqual(['A', 'B'])
  })

  it('computes transitive closure', () => {
    const fds: FD[] = [
      { lhs: ['A'], rhs: ['B'] },
      { lhs: ['B'], rhs: ['C'] },
    ]
    expect(computeClosure(['A'], fds)).toEqual(['A', 'B', 'C'])
  })

  it('applies composite LHS only when all LHS attrs are present', () => {
    const fds: FD[] = [{ lhs: ['A', 'B'], rhs: ['C'] }]
    expect(computeClosure(['A'], fds)).toEqual(['A'])
    expect(computeClosure(['A', 'B'], fds)).toEqual(['A', 'B', 'C'])
  })
})

describe('isSuperkey', () => {
  it('returns true when closure covers all attributes', () => {
    const attrs = ['A', 'B', 'C']
    const fds: FD[] = [{ lhs: ['A'], rhs: ['B', 'C'] }]
    expect(isSuperkey(['A'], attrs, fds)).toBe(true)
  })

  it('returns false when closure does not cover all attributes', () => {
    const attrs = ['A', 'B', 'C']
    const fds: FD[] = [{ lhs: ['A'], rhs: ['B'] }]
    expect(isSuperkey(['A'], attrs, fds)).toBe(false)
  })
})

describe('findCandidateKeys', () => {
  it('finds a single candidate key', () => {
    const attrs = ['A', 'B', 'C']
    const fds: FD[] = [{ lhs: ['A'], rhs: ['B', 'C'] }]
    expect(findCandidateKeys(attrs, fds)).toEqual([['A']])
  })

  it('finds a composite candidate key', () => {
    const attrs = ['A', 'B', 'C', 'D']
    const fds: FD[] = [{ lhs: ['A', 'B'], rhs: ['C', 'D'] }]
    expect(findCandidateKeys(attrs, fds)).toEqual([['A', 'B']])
  })

  it('finds multiple candidate keys', () => {
    const attrs = ['A', 'B', 'C']
    const fds: FD[] = [
      { lhs: ['A'], rhs: ['B', 'C'] },
      { lhs: ['B'], rhs: ['A', 'C'] },
    ]
    const keys = findCandidateKeys(attrs, fds)
    expect(keys).toHaveLength(2)
    expect(keys).toContainEqual(['A'])
    expect(keys).toContainEqual(['B'])
  })

  it('excludes non-minimal superkeys', () => {
    // A→BC means A is a CK; AB is a superkey but NOT minimal
    const attrs = ['A', 'B', 'C']
    const fds: FD[] = [{ lhs: ['A'], rhs: ['B', 'C'] }]
    const keys = findCandidateKeys(attrs, fds)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toEqual(['A'])
  })

  it('returns empty array when no attribute determines all others', () => {
    const attrs = ['A', 'B', 'C']
    const fds: FD[] = [{ lhs: ['A'], rhs: ['B'] }]
    expect(findCandidateKeys(attrs, fds)).toEqual([])
  })
})
```

**Step 2: Run tests — verify they fail**
```bash
npm test
```
Expected: FAIL — `Cannot find module '../solver'`

**Step 3: Implement `lib/solver.ts`**
```typescript
export interface FD {
  lhs: string[]
  rhs: string[]
}

/** Compute the closure of a set of attributes under a set of FDs. */
export function computeClosure(attrs: string[], fds: FD[]): string[] {
  const result = new Set(attrs)
  let changed = true
  while (changed) {
    changed = false
    for (const fd of fds) {
      if (fd.lhs.every(a => result.has(a))) {
        for (const a of fd.rhs) {
          if (!result.has(a)) {
            result.add(a)
            changed = true
          }
        }
      }
    }
  }
  return [...result].sort()
}

/** Returns true if attrs is a superkey (closure covers allAttrs). */
export function isSuperkey(attrs: string[], allAttrs: string[], fds: FD[]): boolean {
  const cl = computeClosure(attrs, fds)
  return allAttrs.every(a => cl.includes(a))
}

function powerSet<T>(arr: T[]): T[][] {
  return arr
    .reduce<T[][]>((acc, val) => acc.concat(acc.map(set => [...set, val])), [[]])
    .filter(s => s.length > 0)
}

/**
 * Find all candidate keys: minimal superkeys.
 * Returns each key as a sorted array of attribute names.
 */
export function findCandidateKeys(allAttrs: string[], fds: FD[]): string[][] {
  const subsets = powerSet(allAttrs)
  const superkeys = subsets.filter(s => isSuperkey(s, allAttrs, fds))
  const candidateKeys = superkeys.filter(
    s => !superkeys.some(other => other.length < s.length && other.every(a => s.includes(a)))
  )
  return candidateKeys
    .map(k => [...k].sort())
    .sort((a, b) => (a.join(',') < b.join(',') ? -1 : 1))
}
```

**Step 4: Run tests — verify they pass**
```bash
npm test
```
Expected: All solver tests PASS.

**Step 5: Commit**
```bash
git add lib/solver.ts lib/__tests__/solver.test.ts
git commit -m "feat: implement candidate key solver with tests"
```

---

## Task 5: Implement Problem Generator (TDD)

**Files:**
- Create: `lib/generate.ts`
- Create: `lib/__tests__/generate.test.ts`

**Step 1: Write the failing tests**

Create `lib/__tests__/generate.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { generateProblem, generateQuestions, Difficulty } from '../generate'

describe('generateProblem', () => {
  const RUNS = 15 // run multiple times since generation is random

  it('easy: 3–4 attributes, exactly 1 candidate key', () => {
    for (let i = 0; i < RUNS; i++) {
      const p = generateProblem('easy')
      expect(p.attributes.length).toBeGreaterThanOrEqual(3)
      expect(p.attributes.length).toBeLessThanOrEqual(4)
      expect(p.candidateKeys).toHaveLength(1)
    }
  })

  it('medium: 5–6 attributes, exactly 2 candidate keys', () => {
    for (let i = 0; i < RUNS; i++) {
      const p = generateProblem('medium')
      expect(p.attributes.length).toBeGreaterThanOrEqual(5)
      expect(p.attributes.length).toBeLessThanOrEqual(6)
      expect(p.candidateKeys).toHaveLength(2)
    }
  })

  it('hard: 6–8 attributes, 3+ candidate keys', () => {
    for (let i = 0; i < RUNS; i++) {
      const p = generateProblem('hard')
      expect(p.attributes.length).toBeGreaterThanOrEqual(6)
      expect(p.attributes.length).toBeLessThanOrEqual(8)
      expect(p.candidateKeys.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('candidate keys in problem are correct per solver', () => {
    const { findCandidateKeys } = require('../solver')
    for (const diff of ['easy', 'medium', 'hard'] as Difficulty[]) {
      const p = generateProblem(diff)
      const computed = findCandidateKeys(p.attributes, p.fds)
      expect(computed).toEqual(p.candidateKeys)
    }
  })
})

describe('generateQuestions', () => {
  it('returns exactly 10 questions', () => {
    expect(generateQuestions('easy')).toHaveLength(10)
    expect(generateQuestions('medium')).toHaveLength(10)
    expect(generateQuestions('hard')).toHaveLength(10)
  })
})
```

**Step 2: Run tests — verify they fail**
```bash
npm test
```
Expected: FAIL — `Cannot find module '../generate'`

**Step 3: Implement `lib/generate.ts`**
```typescript
import { FD, findCandidateKeys } from './solver'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Problem {
  attributes: string[]
  fds: FD[]
  candidateKeys: string[][]
}

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { minAttrs: number; maxAttrs: number; minFDs: number; maxFDs: number; minKeys: number; maxKeys: number }
> = {
  easy:   { minAttrs: 3, maxAttrs: 4, minFDs: 2, maxFDs: 3, minKeys: 1, maxKeys: 1 },
  medium: { minAttrs: 5, maxAttrs: 6, minFDs: 3, maxFDs: 5, minKeys: 2, maxKeys: 2 },
  hard:   { minAttrs: 6, maxAttrs: 8, minFDs: 4, maxFDs: 7, minKeys: 3, maxKeys: 99 },
}

const ALL_ATTRS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function randomSubset<T>(arr: T[], minSize: number, maxSize: number): T[] {
  const size = randomInt(minSize, Math.min(maxSize, arr.length))
  return shuffle(arr).slice(0, size)
}

function generateFDs(attrs: string[], count: number): FD[] {
  const fds: FD[] = []
  for (let i = 0; i < count; i++) {
    const lhsMaxSize = Math.max(1, Math.floor(attrs.length / 2))
    const lhs = randomSubset(attrs, 1, lhsMaxSize)
    const remaining = attrs.filter(a => !lhs.includes(a))
    if (remaining.length === 0) continue
    const rhsMaxSize = Math.max(1, Math.floor(remaining.length / 2))
    const rhs = randomSubset(remaining, 1, rhsMaxSize)
    fds.push({ lhs, rhs })
  }
  return fds
}

// Hand-crafted fallbacks for when random generation fails to hit target
const FALLBACKS: Record<Difficulty, Problem> = {
  easy: {
    attributes: ['A', 'B', 'C'],
    fds: [{ lhs: ['A'], rhs: ['B', 'C'] }],
    candidateKeys: [['A']],
  },
  medium: {
    attributes: ['A', 'B', 'C', 'D', 'E'],
    fds: [
      { lhs: ['A'], rhs: ['B', 'C', 'D', 'E'] },
      { lhs: ['B'], rhs: ['A', 'C', 'D', 'E'] },
    ],
    candidateKeys: [['A'], ['B']],
  },
  hard: {
    attributes: ['A', 'B', 'C', 'D', 'E', 'F'],
    fds: [
      { lhs: ['A'], rhs: ['B', 'C'] },
      { lhs: ['B'], rhs: ['A', 'C'] },
      { lhs: ['C', 'D'], rhs: ['A', 'B', 'E', 'F'] },
      { lhs: ['D'], rhs: ['E', 'F'] },
      { lhs: ['E'], rhs: ['D', 'F'] },
    ],
    candidateKeys: [['A', 'D'], ['A', 'E'], ['B', 'D'], ['B', 'E'], ['C', 'D'], ['C', 'E']],
  },
}

export function generateProblem(difficulty: Difficulty, maxAttempts = 500): Problem {
  const config = DIFFICULTY_CONFIG[difficulty]
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const n = randomInt(config.minAttrs, config.maxAttrs)
    const attributes = ALL_ATTRS.slice(0, n)
    const fdCount = randomInt(config.minFDs, config.maxFDs)
    const fds = generateFDs(attributes, fdCount)
    const candidateKeys = findCandidateKeys(attributes, fds)
    if (candidateKeys.length >= config.minKeys && candidateKeys.length <= config.maxKeys) {
      return { attributes, fds, candidateKeys }
    }
  }
  return FALLBACKS[difficulty]
}

export function generateQuestions(difficulty: Difficulty, count = 10): Problem[] {
  return Array.from({ length: count }, () => generateProblem(difficulty))
}
```

**Step 4: Run tests — verify they pass**
```bash
npm test
```
Expected: All generator tests PASS.

**Step 5: Commit**
```bash
git add lib/generate.ts lib/__tests__/generate.test.ts
git commit -m "feat: implement problem generator with difficulty levels and tests"
```

---

## Task 6: Implement Scoring Utilities (TDD)

**Files:**
- Create: `lib/scoring.ts`
- Create: `lib/__tests__/scoring.test.ts`

**Step 1: Write the failing tests**

Create `lib/__tests__/scoring.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { calculateQuestionScore, isCorrectAnswer, TIME_PER_QUESTION } from '../scoring'

describe('calculateQuestionScore', () => {
  it('returns 0 when timeRemaining is 0', () => {
    expect(calculateQuestionScore(0, 'easy')).toBe(0)
  })

  it('returns 0 when timeRemaining is negative', () => {
    expect(calculateQuestionScore(-10, 'easy')).toBe(0)
  })

  it('applies easy multiplier (×1)', () => {
    expect(calculateQuestionScore(30, 'easy')).toBe(30)
  })

  it('applies medium multiplier (×2)', () => {
    expect(calculateQuestionScore(30, 'medium')).toBe(60)
  })

  it('applies hard multiplier (×3)', () => {
    expect(calculateQuestionScore(30, 'hard')).toBe(90)
  })

  it('max score per question is TIME_PER_QUESTION × multiplier', () => {
    expect(calculateQuestionScore(TIME_PER_QUESTION, 'hard')).toBe(TIME_PER_QUESTION * 3)
  })
})

describe('isCorrectAnswer', () => {
  it('returns true for matching single key', () => {
    expect(isCorrectAnswer([['A']], [['A']])).toBe(true)
  })

  it('returns false for wrong single key', () => {
    expect(isCorrectAnswer([['B']], [['A']])).toBe(false)
  })

  it('returns false when wrong number of keys submitted', () => {
    expect(isCorrectAnswer([['A']], [['A'], ['B']])).toBe(false)
    expect(isCorrectAnswer([['A'], ['B']], [['A']])).toBe(false)
  })

  it('is order-independent within a key', () => {
    expect(isCorrectAnswer([['B', 'A']], [['A', 'B']])).toBe(true)
  })

  it('is order-independent across keys', () => {
    expect(isCorrectAnswer([['B'], ['A']], [['A'], ['B']])).toBe(true)
  })

  it('returns false for empty submission vs non-empty correct', () => {
    expect(isCorrectAnswer([], [['A']])).toBe(false)
  })
})
```

**Step 2: Run tests — verify they fail**
```bash
npm test
```
Expected: FAIL — `Cannot find module '../scoring'`

**Step 3: Implement `lib/scoring.ts`**
```typescript
import { Difficulty } from './generate'

export { Difficulty }

export const TIME_PER_QUESTION = 60

const MULTIPLIERS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

export function calculateQuestionScore(timeRemaining: number, difficulty: Difficulty): number {
  if (timeRemaining <= 0) return 0
  return Math.round(timeRemaining * MULTIPLIERS[difficulty])
}

function normalizeKey(key: string[]): string {
  return [...key].sort().join(',')
}

/**
 * Returns true only if submitted contains exactly the same keys as correct
 * (order-independent, both within a key and across keys).
 */
export function isCorrectAnswer(submitted: string[][], correct: string[][]): boolean {
  if (submitted.length !== correct.length) return false
  const correctSet = new Set(correct.map(normalizeKey))
  return submitted.every(k => correctSet.has(normalizeKey(k)))
}
```

**Step 4: Run tests — verify they pass**
```bash
npm test
```
Expected: All scoring tests PASS.

**Step 5: Commit**
```bash
git add lib/scoring.ts lib/__tests__/scoring.test.ts
git commit -m "feat: implement scoring utilities with tests"
```

---

## Task 7: Supabase Setup

**Files:**
- Create: `lib/supabase.ts`
- Create: `.env.local` (not committed)
- Create: `.env.local.example`

**Step 1: Install Supabase client**
```bash
npm install @supabase/supabase-js
```

**Step 2: Create Supabase project**

1. Go to https://supabase.com and create a new project.
2. In the SQL editor, run:
```sql
create table scores (
  id          bigserial primary key,
  username    text        not null,
  score       integer     not null,
  difficulty  text        not null check (difficulty in ('easy', 'medium', 'hard')),
  created_at  timestamptz default now()
);

create index on scores (difficulty, score desc);
```
3. Go to Project Settings → API and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Step 3: Create `.env.local`**
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Step 4: Create `.env.local.example`**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Step 5: Create `lib/supabase.ts`**
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface ScoreRow {
  id: number
  username: string
  score: number
  difficulty: string
  created_at: string
}
```

**Step 6: Ensure `.env.local` is gitignored**

Confirm `.gitignore` includes `.env.local` (create-next-app adds this by default).

**Step 7: Commit**
```bash
git add lib/supabase.ts .env.local.example
git commit -m "feat: configure Supabase client and create scores table"
```

---

## Task 8: Implement API Routes

**Files:**
- Create: `app/api/leaderboard/route.ts`
- Create: `app/api/submit-score/route.ts`

**Step 1: Create `app/api/leaderboard/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const difficulty = request.nextUrl.searchParams.get('difficulty')
  if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('scores')
    .select('id, username, score, created_at')
    .eq('difficulty', difficulty)
    .order('score', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

**Step 2: Create `app/api/submit-score/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { username, score, difficulty } = body

  if (!username || typeof score !== 'number' || !['easy', 'medium', 'hard'].includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const trimmedUsername = String(username).trim().slice(0, 20) || 'ANON'

  const { data, error } = await supabase
    .from('scores')
    .insert({ username: trimmedUsername, score, difficulty })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

**Step 3: Verify routes respond (after Supabase env is set)**
```bash
npm run dev
# In another terminal:
curl "http://localhost:3000/api/leaderboard?difficulty=easy"
```
Expected: `[]` (empty array, no scores yet)

**Step 4: Commit**
```bash
git add app/api/leaderboard/route.ts app/api/submit-score/route.ts
git commit -m "feat: implement leaderboard GET and submit-score POST API routes"
```

---

## Task 9: Implement Shared UI Components

**Files:**
- Create: `components/TimerRing.tsx`
- Create: `components/AttributeChip.tsx`
- Create: `components/FDDisplay.tsx`

**Step 1: Create `components/TimerRing.tsx`**
```tsx
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
```

**Step 2: Create `components/AttributeChip.tsx`**
```tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AttributeChipProps {
  attr: string
  selected: boolean
  disabled?: boolean
  onClick: () => void
}

export function AttributeChip({ attr, selected, disabled, onClick }: AttributeChipProps) {
  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      size="lg"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-14 h-14 text-xl font-bold transition-all',
        selected && 'ring-2 ring-offset-2 ring-primary'
      )}
    >
      {attr}
    </Button>
  )
}
```

**Step 3: Create `components/FDDisplay.tsx`**
```tsx
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
```

**Step 4: Commit**
```bash
git add components/TimerRing.tsx components/AttributeChip.tsx components/FDDisplay.tsx
git commit -m "feat: add TimerRing, AttributeChip, and FDDisplay components"
```

---

## Task 10: Implement Home Page

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx` (update title/metadata)

**Step 1: Update `app/layout.tsx`**
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Relax and Find the Key',
  description: 'An arcade game for identifying candidate keys in relational schemas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**Step 2: Replace `app/page.tsx`**
```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const difficulties = [
  {
    level: 'easy',
    label: 'Easy',
    description: '3–4 attributes, 1 candidate key',
    multiplier: '×1',
    color: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
  },
  {
    level: 'medium',
    label: 'Medium',
    description: '5–6 attributes, 2 candidate keys',
    multiplier: '×2',
    color: 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20',
  },
  {
    level: 'hard',
    label: 'Hard',
    description: '6–8 attributes, 3+ candidate keys',
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
            <Card className={`cursor-pointer border transition-colors ${color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  {label}
                  <Badge variant="secondary">{multiplier} pts</Badge>
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">10 questions · 60s each</p>
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
```

**Step 3: Run dev and visually verify home page**
```bash
npm run dev
```
Open http://localhost:3000 — should show title, three difficulty cards, leaderboard link.

**Step 4: Commit**
```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: implement home page with difficulty selection"
```

---

## Task 11: Implement Game Page

**Files:**
- Create: `app/game/page.tsx`

This is the most complex page. It uses `useReducer` for all game state and URL search params for difficulty.

**Step 1: Create `app/game/page.tsx`**
```tsx
'use client'

import { useEffect, useReducer, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { generateQuestions, Problem, Difficulty } from '@/lib/generate'
import { calculateQuestionScore, isCorrectAnswer, TIME_PER_QUESTION } from '@/lib/scoring'
import { TimerRing } from '@/components/TimerRing'
import { AttributeChip } from '@/components/AttributeChip'
import { FDDisplay } from '@/components/FDDisplay'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type Phase = 'loading' | 'playing' | 'feedback' | 'finished'

interface GameState {
  difficulty: Difficulty
  questions: Problem[]
  currentIndex: number
  score: number
  selectedAttrs: string[]
  submittedKeys: string[][]
  timeRemaining: number
  phase: Phase
  lastCorrect: boolean
  pointsEarned: number
}

type Action =
  | { type: 'INIT'; questions: Problem[] }
  | { type: 'TOGGLE_ATTR'; attr: string }
  | { type: 'ADD_KEY' }
  | { type: 'SUBMIT_ANSWER' }
  | { type: 'TICK' }
  | { type: 'TIMEOUT' }
  | { type: 'NEXT_QUESTION' }

function initialState(difficulty: Difficulty): GameState {
  return {
    difficulty,
    questions: [],
    currentIndex: 0,
    score: 0,
    selectedAttrs: [],
    submittedKeys: [],
    timeRemaining: TIME_PER_QUESTION,
    phase: 'loading',
    lastCorrect: false,
    pointsEarned: 0,
  }
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'INIT':
      return { ...state, questions: action.questions, phase: 'playing' }

    case 'TOGGLE_ATTR': {
      if (state.phase !== 'playing') return state
      const selected = state.selectedAttrs.includes(action.attr)
        ? state.selectedAttrs.filter(a => a !== action.attr)
        : [...state.selectedAttrs, action.attr]
      return { ...state, selectedAttrs: selected }
    }

    case 'ADD_KEY': {
      if (state.selectedAttrs.length === 0) return state
      return {
        ...state,
        submittedKeys: [...state.submittedKeys, [...state.selectedAttrs].sort()],
        selectedAttrs: [],
      }
    }

    case 'SUBMIT_ANSWER': {
      const question = state.questions[state.currentIndex]
      // Include any currently selected attrs as a final key
      const allKeys = [
        ...state.submittedKeys,
        ...(state.selectedAttrs.length > 0 ? [[...state.selectedAttrs].sort()] : []),
      ]
      if (allKeys.length === 0) return state
      const correct = isCorrectAnswer(allKeys, question.candidateKeys)
      const points = correct ? calculateQuestionScore(state.timeRemaining, state.difficulty) : 0
      return {
        ...state,
        score: state.score + points,
        submittedKeys: allKeys,
        selectedAttrs: [],
        phase: 'feedback',
        lastCorrect: correct,
        pointsEarned: points,
      }
    }

    case 'TICK':
      return { ...state, timeRemaining: state.timeRemaining - 1 }

    case 'TIMEOUT': {
      const question = state.questions[state.currentIndex]
      return {
        ...state,
        phase: 'feedback',
        lastCorrect: false,
        pointsEarned: 0,
        submittedKeys: question.candidateKeys, // show correct answer
      }
    }

    case 'NEXT_QUESTION': {
      if (state.currentIndex >= state.questions.length - 1) {
        return { ...state, phase: 'finished' }
      }
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        selectedAttrs: [],
        submittedKeys: [],
        timeRemaining: TIME_PER_QUESTION,
        phase: 'playing',
      }
    }

    default:
      return state
  }
}

function GameContent({ difficulty }: { difficulty: Difficulty }) {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, initialState(difficulty))

  // Generate questions on mount
  useEffect(() => {
    const questions = generateQuestions(difficulty)
    dispatch({ type: 'INIT', questions })
  }, [difficulty])

  // Countdown timer
  useEffect(() => {
    if (state.phase !== 'playing') return
    if (state.timeRemaining <= 0) {
      dispatch({ type: 'TIMEOUT' })
      return
    }
    const id = setTimeout(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearTimeout(id)
  }, [state.phase, state.timeRemaining])

  // Auto-advance after feedback
  useEffect(() => {
    if (state.phase !== 'feedback') return
    const id = setTimeout(() => dispatch({ type: 'NEXT_QUESTION' }), 2000)
    return () => clearTimeout(id)
  }, [state.phase])

  // Redirect when finished
  useEffect(() => {
    if (state.phase === 'finished') {
      router.push(`/result?score=${state.score}&difficulty=${difficulty}`)
    }
  }, [state.phase, state.score, difficulty, router])

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Generating questions...</p>
      </div>
    )
  }

  if (state.questions.length === 0) return null

  const question = state.questions[state.currentIndex]
  const isFeedback = state.phase === 'feedback'
  const questionNumber = state.currentIndex + 1

  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-6 max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="w-full flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Question <span className="font-bold text-foreground">{questionNumber}</span> / {state.questions.length}
        </div>
        <div className="text-lg font-bold">Score: {state.score}</div>
      </div>

      <Progress value={(questionNumber / state.questions.length) * 100} className="w-full h-2" />

      {/* Timer + Schema */}
      <div className="w-full flex items-start gap-6">
        <TimerRing timeRemaining={state.timeRemaining} total={TIME_PER_QUESTION} />
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xl">
              R({question.attributes.join(', ')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Functional Dependencies:</p>
            <FDDisplay fds={question.fds} />
          </CardContent>
        </Card>
      </div>

      {/* Instruction */}
      <p className="text-muted-foreground text-sm text-center">
        {question.candidateKeys.length === 1
          ? 'Select the attributes that form the candidate key, then submit.'
          : `Find all ${question.candidateKeys.length} candidate keys. Add each key then submit.`}
      </p>

      {/* Attribute chips */}
      <div className="flex flex-wrap gap-3 justify-center">
        {question.attributes.map(attr => (
          <AttributeChip
            key={attr}
            attr={attr}
            selected={state.selectedAttrs.includes(attr)}
            disabled={isFeedback}
            onClick={() => dispatch({ type: 'TOGGLE_ATTR', attr })}
          />
        ))}
      </div>

      {/* Submitted keys so far */}
      {state.submittedKeys.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Submitted keys:</span>
          {state.submittedKeys.map((key, i) => (
            <Badge key={i} variant="secondary" className="font-mono">
              {'{' + key.join(', ') + '}'}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      {!isFeedback && (
        <div className="flex gap-3">
          {question.candidateKeys.length > 1 && (
            <Button
              variant="outline"
              onClick={() => dispatch({ type: 'ADD_KEY' })}
              disabled={state.selectedAttrs.length === 0}
            >
              Add Key
            </Button>
          )}
          <Button
            onClick={() => dispatch({ type: 'SUBMIT_ANSWER' })}
            disabled={state.selectedAttrs.length === 0 && state.submittedKeys.length === 0}
          >
            Submit Answer
          </Button>
        </div>
      )}

      {/* Feedback banner */}
      {isFeedback && (
        <div
          className={cn(
            'w-full rounded-lg p-4 text-center space-y-1 transition-all',
            state.lastCorrect
              ? 'bg-green-500/20 border border-green-500/40'
              : 'bg-red-500/20 border border-red-500/40'
          )}
        >
          <p className="text-lg font-bold">
            {state.lastCorrect ? `+${state.pointsEarned} points!` : 'Wrong answer'}
          </p>
          <p className="text-sm text-muted-foreground">
            Correct keys:{' '}
            {question.candidateKeys.map(k => '{' + k.join(', ') + '}').join(' and ')}
          </p>
        </div>
      )}
    </main>
  )
}

export default function GamePage() {
  return (
    <Suspense>
      <GamePageInner />
    </Suspense>
  )
}

function GamePageInner() {
  const searchParams = useSearchParams()
  const difficulty = (searchParams.get('difficulty') ?? 'easy') as Difficulty
  return <GameContent difficulty={difficulty} />
}
```

**Step 2: Run dev and test game flow manually**
```bash
npm run dev
```
Navigate to http://localhost:3000/game?difficulty=easy and verify:
- Questions load
- Timer counts down
- Attribute chips toggle
- Submit shows feedback
- Auto-advances after 2 seconds
- Redirects to /result after question 10

**Step 3: Commit**
```bash
git add app/game/page.tsx
git commit -m "feat: implement game page with timer, attribute selection, and scoring"
```

---

## Task 12: Implement Result Page

**Files:**
- Create: `app/result/page.tsx`

**Step 1: Create `app/result/page.tsx`**
```tsx
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
```

**Step 2: Test manually**
Navigate to http://localhost:3000/result?score=450&difficulty=easy
- Score should display large
- Name input should work (uppercase, max 20 chars)
- Save should call API (verify in Supabase dashboard)
- Buttons navigate correctly

**Step 3: Commit**
```bash
git add app/result/page.tsx
git commit -m "feat: implement result page with username entry and score submission"
```

---

## Task 13: Implement Leaderboard Page

**Files:**
- Create: `app/leaderboard/page.tsx`

**Step 1: Create `app/leaderboard/page.tsx`**
```tsx
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

  useEffect(() => {
    setLoading(true)
    fetch(`/api/leaderboard?difficulty=${difficulty}`)
      .then(r => r.json())
      .then(data => setScores(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [difficulty])

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Loading...</p>
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
```

**Step 2: Test manually**
Navigate to http://localhost:3000/leaderboard
- Tabs switch between difficulties
- After submitting a score via the result page, it should appear here

**Step 3: Commit**
```bash
git add app/leaderboard/page.tsx
git commit -m "feat: implement leaderboard page with tabs per difficulty"
```

---

## Task 14: Run All Tests and Deploy

**Step 1: Run full test suite**
```bash
npm test
```
Expected: All tests in `lib/__tests__/` pass.

**Step 2: Run production build**
```bash
npm run build
```
Expected: Build succeeds with no type errors.

**Step 3: Fix any TypeScript/lint errors surfaced by build**

Common issues:
- Missing `'use client'` directives
- Untyped params
- Unused imports

**Step 4: Create `vercel.json` (optional, only if custom config needed)**

If deploying to Vercel with default settings, no `vercel.json` is needed. Just push to GitHub and import the repo at https://vercel.com/new.

**Step 5: Add environment variables in Vercel**

In Vercel project settings → Environment Variables, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Step 6: Final commit**
```bash
git add .
git commit -m "chore: production build passes, ready for deployment"
```

**Step 7: Push and deploy**
```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```
Then import the repo in Vercel dashboard. Vercel will auto-detect Next.js and deploy.

---

## Summary

| Task | What it builds |
|------|----------------|
| 1 | Next.js project scaffolding |
| 2 | Vitest test runner |
| 3 | shadcn/ui components |
| 4 | Solver: closure + candidate key finder (TDD) |
| 5 | Generator: random schema by difficulty (TDD) |
| 6 | Scoring: time × multiplier, answer checking (TDD) |
| 7 | Supabase client + scores table |
| 8 | API routes: leaderboard GET, submit-score POST |
| 9 | Shared UI: TimerRing, AttributeChip, FDDisplay |
| 10 | Home page: difficulty selection |
| 11 | Game page: full game loop with reducer |
| 12 | Result page: score display + username entry |
| 13 | Leaderboard page: tabbed top-20 |
| 14 | Tests, build, deploy |
