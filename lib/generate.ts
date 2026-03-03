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
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
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
