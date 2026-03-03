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

  it('returns the full attribute set when there are no FDs', () => {
    const attrs = ['A', 'B', 'C']
    const fds: FD[] = []
    expect(findCandidateKeys(attrs, fds)).toEqual([['A', 'B', 'C']])
  })

  it('finds composite CK when single attributes do not cover all', () => {
    const attrs = ['A', 'B', 'C']
    const fds: FD[] = [{ lhs: ['A'], rhs: ['B'] }]
    // A→B: closure({A,C}) = {A,B,C} so {A,C} is the CK
    expect(findCandidateKeys(attrs, fds)).toEqual([['A', 'C']])
  })
})
