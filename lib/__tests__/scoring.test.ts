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

  it('returns false when duplicate keys are submitted for a multi-key question', () => {
    // submitting the same key twice should not satisfy a 2-key requirement
    expect(isCorrectAnswer([['A'], ['A']], [['A'], ['B']])).toBe(false)
  })
})
