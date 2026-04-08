import { describe, it, expect } from 'vitest'
import { generateProblem, generateQuestions, Difficulty } from '../generate'
import { findCandidateKeys } from '../solver'

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

  it('medium: 5–6 attributes, 1–2 candidate keys', () => {
    for (let i = 0; i < RUNS; i++) {
      const p = generateProblem('medium')
      expect(p.attributes.length).toBeGreaterThanOrEqual(5)
      expect(p.attributes.length).toBeLessThanOrEqual(6)
      expect(p.candidateKeys.length).toBeGreaterThanOrEqual(1)
      expect(p.candidateKeys.length).toBeLessThanOrEqual(2)
    }
  })

  it('hard: 6–8 attributes, 2+ candidate keys', () => {
    for (let i = 0; i < RUNS; i++) {
      const p = generateProblem('hard')
      expect(p.attributes.length).toBeGreaterThanOrEqual(6)
      expect(p.attributes.length).toBeLessThanOrEqual(8)
      expect(p.candidateKeys.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('candidate keys in problem are correct per solver', () => {
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
