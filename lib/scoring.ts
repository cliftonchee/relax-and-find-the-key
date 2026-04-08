import { Difficulty } from './generate'

export type { Difficulty }

const TIME_PER_QUESTION: Record<Difficulty, number> = {
  easy: 60,
  medium: 90,
  hard: 120,
}

export { TIME_PER_QUESTION }

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
  const normalizedSubmitted = submitted.map(normalizeKey)
  if (new Set(normalizedSubmitted).size !== normalizedSubmitted.length) return false
  const correctSet = new Set(correct.map(normalizeKey))
  return normalizedSubmitted.every(k => correctSet.has(k))
}
