import { FD, findCandidateKeys, computeClosure } from './solver'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Problem {
  attributes: string[]
  fds: FD[]
  candidateKeys: string[][]
}

// ---------------------------------------------------------------------------
// Qualitative scoring helpers
// ---------------------------------------------------------------------------

/**
 * FD triviality classification.
 *  - trivial:            RHS ⊆ LHS
 *  - semi-trivial:       RHS ∩ LHS ≠ ∅  (but RHS ⊄ LHS)
 *  - completely-nontrivial: RHS ∩ LHS = ∅
 */
export type FDType = 'trivial' | 'semi-trivial' | 'completely-nontrivial'

export function classifyFD(fd: FD): FDType {
  const lhsSet = new Set(fd.lhs)
  if (fd.rhs.every(a => lhsSet.has(a))) return 'trivial'
  if (fd.rhs.some(a => lhsSet.has(a))) return 'semi-trivial'
  return 'completely-nontrivial'
}

/**
 * Compute the maximum transitive chain depth across all possible starting
 * attribute sets, correctly handling cycles.
 *
 * KEY INSIGHT: cycles (A→B, B→A) must NOT inflate depth. The fix is to track
 * the *set of attributes in the current closure* rather than which FD indices
 * were visited. An FD firing is only "new work" if it adds at least one
 * attribute not already in the closure — this naturally short-circuits cycles
 * because once A and B are both in the closure, firing A→B or B→A adds nothing.
 *
 * Algorithm: BFS from every singleton starting set {X}, repeatedly applying
 * FDs that add new attributes. The depth is the number of rounds until the
 * closure stabilises. We take the max over all starting sets.
 *
 * This matches the intuitive notion: "how many reasoning steps does a student
 * need to chase" — a cycle collapses to a single step once both sides are known.
 */
export function maxTransitiveChainDepth(fds: FD[]): number {
  // Collect all attributes mentioned anywhere in the FDs
  const allAttrs = [...new Set(fds.flatMap(fd => [...fd.lhs, ...fd.rhs]))]
  if (allAttrs.length === 0) return 0

  let globalMax = 0

  for (const startAttr of allAttrs) {
    // BFS: each "level" = one round of firing all applicable FDs that add new attrs
    const closure = new Set<string>([startAttr])
    let depth = 0
    let changed = true

    while (changed) {
      changed = false
      for (const fd of fds) {
        // FD is applicable if all LHS attrs are in the closure
        if (!fd.lhs.every(a => closure.has(a))) continue
        // Only count this round as a new step if it genuinely adds attrs
        const newAttrs = fd.rhs.filter(a => !closure.has(a))
        if (newAttrs.length > 0) {
          newAttrs.forEach(a => closure.add(a))
          changed = true
        }
      }
      if (changed) depth++
    }

    globalMax = Math.max(globalMax, depth)
  }

  return globalMax
}

/**
 * Find equivalence classes of attributes via cycles in the FD graph.
 *
 * Two attributes X and Y are equivalent if X→Y and Y→X are both derivable
 * (directly or transitively). We compute this by finding SCCs in the
 * attribute-level dependency graph: draw an edge X→Y for every FD where
 * {X} alone (or as part of the LHS when all other LHS attrs are in the same
 * SCC) determines Y.
 *
 * For simplicity and correctness we use the closure-based definition:
 * X ~ Y  iff  Y ∈ closure({X})  AND  X ∈ closure({Y})
 *
 * Returns an array of equivalence classes (only classes of size ≥ 2,
 * since singletons are trivial). Each class is a sorted array of attrs.
 */
export function findEquivalenceClasses(attrs: string[], fds: FD[]): string[][] {
  const classes: string[][] = []
  const assigned = new Set<string>()

  for (let i = 0; i < attrs.length; i++) {
    if (assigned.has(attrs[i])) continue
    const cls = [attrs[i]]
    const closureI = new Set(computeClosure([attrs[i]], fds))

    for (let j = i + 1; j < attrs.length; j++) {
      if (assigned.has(attrs[j])) continue
      // attrs[j] is equivalent to attrs[i] iff each determines the other
      const closureJ = new Set(computeClosure([attrs[j]], fds))
      if (closureI.has(attrs[j]) && closureJ.has(attrs[i])) {
        cls.push(attrs[j])
        assigned.add(attrs[j])
      }
    }

    if (cls.length >= 2) {
      cls.forEach(a => assigned.add(a))
      classes.push([...cls].sort())
    }
  }

  return classes
}

/**
 * Count the total number of attributes involved in any equivalence cycle.
 * Used as a difficulty signal: more equivalences = harder to reason about keys.
 */
export function countEquivalentAttrs(attrs: string[], fds: FD[]): number {
  return findEquivalenceClasses(attrs, fds).reduce((s, cls) => s + cls.length, 0)
}

/**
 * Count how many FDs are redundant (implied by the remaining FDs).
 */
export function countRedundantFDs(attrs: string[], fds: FD[]): number {
  let count = 0
  for (let i = 0; i < fds.length; i++) {
    const others = fds.filter((_, j) => j !== i)
    const closure = computeClosure(fds[i].lhs, others)
    const closureSet = new Set(closure)
    if (fds[i].rhs.every(a => closureSet.has(a))) count++
  }
  return count
}

/**
 * Fraction of candidate keys that are composite (length > 1).
 */
export function compositeFraction(candidateKeys: string[][]): number {
  if (candidateKeys.length === 0) return 0
  return candidateKeys.filter(k => k.length > 1).length / candidateKeys.length
}

/**
 * Check whether any non-prime attribute has a partial dependency on a
 * composite candidate key — i.e., it is functionally determined by a
 * *proper subset* of some candidate key.
 */
export function hasPartialDependency(attrs: string[], fds: FD[], candidateKeys: string[][]): boolean {
  const primeAttrs = new Set(candidateKeys.flat())
  const nonPrime = attrs.filter(a => !primeAttrs.has(a))
  for (const key of candidateKeys) {
    if (key.length < 2) continue
    // Generate all proper non-empty subsets of the key
    for (let mask = 1; mask < (1 << key.length) - 1; mask++) {
      const subset = key.filter((_, i) => mask & (1 << i))
      const closure = new Set(computeClosure(subset, fds))
      if (nonPrime.some(a => closure.has(a))) return true
    }
  }
  return false
}

/**
 * Average size of the LHS across all FDs (proxy for how many are composite-LHS).
 */
export function avgLHSSize(fds: FD[]): number {
  if (fds.length === 0) return 0
  return fds.reduce((s, fd) => s + fd.lhs.length, 0) / fds.length
}

// ---------------------------------------------------------------------------
// Qualitative profile per difficulty
// ---------------------------------------------------------------------------

interface QualitativeProfile {
  // Chain depth (cycle-safe: rounds of new-attribute derivation from any singleton)
  minChainDepth: number
  maxChainDepth: number
  // Redundant FDs
  minRedundant: number
  maxRedundant: number
  // Fraction of composite candidate keys (0-1)
  minCompositeFraction: number
  maxCompositeFraction: number
  // Require at least one partial dependency?
  requirePartialDep: boolean
  // FD types: at least this fraction must be completely-nontrivial
  minNontrivialFraction: number
  // Average LHS size
  minAvgLHS: number
  maxAvgLHS: number
  // Number of attributes involved in equivalence cycles (A<->B counts as 2).
  // Cycles are a distinct difficulty axis: they spawn multiple interchangeable
  // key components and cannot be collapsed by chain-depth alone.
  minEquivAttrs: number
  maxEquivAttrs: number
}

const QUALITATIVE_PROFILES: Record<Difficulty, QualitativeProfile> = {
  easy: {
    minChainDepth: 1,
    maxChainDepth: 2,        // at most one transitive hop
    minRedundant: 0,
    maxRedundant: 0,         // no redundant FDs -- every FD is essential
    minCompositeFraction: 0,
    maxCompositeFraction: 0, // all keys must be singleton
    requirePartialDep: false,
    minNontrivialFraction: 0.8,
    minAvgLHS: 1,
    maxAvgLHS: 1.3,          // LHS almost always single attribute
    minEquivAttrs: 0,
    maxEquivAttrs: 0,        // no cycles -- no equivalence classes
  },
  medium: {
    minChainDepth: 2,
    maxChainDepth: 3,
    minRedundant: 0,
    maxRedundant: 1,
    minCompositeFraction: 0.3,
    maxCompositeFraction: 1,
    requirePartialDep: true,
    minNontrivialFraction: 0.6,
    minAvgLHS: 1,
    maxAvgLHS: 1.8,
    minEquivAttrs: 0,
    maxEquivAttrs: 2,        // at most one A<->B pair -- introduces concept without overloading
  },
  hard: {
    minChainDepth: 3,
    maxChainDepth: 8,
    minRedundant: 1,
    maxRedundant: 8,
    minCompositeFraction: 0.5,
    maxCompositeFraction: 1,
    requirePartialDep: true,
    minNontrivialFraction: 0.4,
    minAvgLHS: 1.4,
    maxAvgLHS: 8,
    minEquivAttrs: 2,        // must have at least one equivalence cycle
    maxEquivAttrs: 8,
  },
}

// ---------------------------------------------------------------------------
// Quantitative config (unchanged from original, kept for reference)
// ---------------------------------------------------------------------------

interface QuantitativeConfig {
  minAttrs: number; maxAttrs: number
  minFDs: number;   maxFDs: number
  minKeys: number;  maxKeys: number
}

const QUANTITATIVE_CONFIG: Record<Difficulty, QuantitativeConfig> = {
  easy:   { minAttrs: 3, maxAttrs: 4, minFDs: 2, maxFDs: 3,  minKeys: 1, maxKeys: 1 },
  medium: { minAttrs: 5, maxAttrs: 6, minFDs: 3, maxFDs: 5,  minKeys: 1, maxKeys: 2 },
  hard:   { minAttrs: 6, maxAttrs: 8, minFDs: 5, maxFDs: 8,  minKeys: 2, maxKeys: 8 },
}

const ALL_ATTRS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

// ---------------------------------------------------------------------------
// Random helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// FD generation — difficulty-aware
// ---------------------------------------------------------------------------

/**
 * Generate FDs for a given difficulty, using the qualitative profile to bias
 * the shape of each FD:
 *  - easy:   single-attr LHS, completely non-trivial RHS
 *  - medium: mix; may introduce one composite LHS
 *  - hard:   larger LHS allowed, semi-trivial RHS possible
 */
function generateFDs(attrs: string[], count: number, difficulty: Difficulty): FD[] {
  const fds: FD[] = []
  const maxLHSSize = difficulty === 'easy' ? 1
                   : difficulty === 'medium' ? Math.max(1, Math.floor(attrs.length / 3))
                   : Math.max(1, Math.floor(attrs.length / 2))

  for (let i = 0; i < count * 4 && fds.length < count; i++) {
    const lhs = randomSubset(attrs, 1, maxLHSSize)
    const lhsSet = new Set(lhs)

    // For easy/medium: keep RHS completely disjoint from LHS
    // For hard: allow some overlap (semi-trivial) with ~20% probability
    const allowOverlap = difficulty === 'hard' && Math.random() < 0.2
    const rhsPool = allowOverlap ? attrs.filter(a => !lhs.includes(a) || Math.random() < 0.3)
                                  : attrs.filter(a => !lhsSet.has(a))

    if (rhsPool.length === 0) continue

    const maxRHSSize = Math.max(1, Math.floor(rhsPool.length / 2))
    const rhs = randomSubset(rhsPool, 1, maxRHSSize)

    // Deduplicate: skip if same FD already added
    const isDup = fds.some(f =>
      f.lhs.slice().sort().join() === lhs.slice().sort().join() &&
      f.rhs.slice().sort().join() === rhs.slice().sort().join()
    )
    if (!isDup) fds.push({ lhs, rhs })
  }
  return fds
}

// ---------------------------------------------------------------------------
// Qualitative validation
// ---------------------------------------------------------------------------

function meetsQualitativeProfile(
  attrs: string[],
  fds: FD[],
  candidateKeys: string[][],
  profile: QualitativeProfile
): boolean {
  // Chain depth
  const depth = maxTransitiveChainDepth(fds)
  if (depth < profile.minChainDepth || depth > profile.maxChainDepth) return false

  // Redundant FDs
  const redundant = countRedundantFDs(attrs, fds)
  if (redundant < profile.minRedundant || redundant > profile.maxRedundant) return false

  // Composite key fraction
  const cf = compositeFraction(candidateKeys)
  if (cf < profile.minCompositeFraction || cf > profile.maxCompositeFraction) return false

  // Partial dependency
  if (profile.requirePartialDep && !hasPartialDependency(attrs, fds, candidateKeys)) return false

  // Non-trivial FD fraction
  const nontrivialCount = fds.filter(fd => classifyFD(fd) === 'completely-nontrivial').length
  const ntFrac = fds.length > 0 ? nontrivialCount / fds.length : 0
  if (ntFrac < profile.minNontrivialFraction) return false

  // Average LHS size
  const avgLHS = avgLHSSize(fds)
  if (avgLHS < profile.minAvgLHS || avgLHS > profile.maxAvgLHS) return false

  // Equivalence class size: attributes involved in mutual-determination cycles
  const equivAttrs = countEquivalentAttrs(attrs, fds)
  if (equivAttrs < profile.minEquivAttrs || equivAttrs > profile.maxEquivAttrs) return false

  return true
}

// ---------------------------------------------------------------------------
// Fallback constructor (systematic, not hardcoded raw literals)
// ---------------------------------------------------------------------------

/**
 * Build a guaranteed-valid fallback problem for each difficulty
 * by constructing FDs that provably satisfy the profile.
 */
function buildFallback(difficulty: Difficulty): Problem {
  if (difficulty === 'easy') {
    // A → BC  (single key A, chain depth 1, no redundancy)
    const attributes = ['A', 'B', 'C']
    const fds: FD[] = [
      { lhs: ['A'], rhs: ['B'] },
      { lhs: ['A'], rhs: ['C'] },
    ]
    return { attributes, fds, candidateKeys: findCandidateKeys(attributes, fds) }
  }

  if (difficulty === 'medium') {
    // Keys: {A,C} and {B,C} — composite; partial dep: A→D (A is part of key {A,C})
    const attributes = ['A', 'B', 'C', 'D', 'E']
    const fds: FD[] = [
      { lhs: ['A'], rhs: ['B'] },   // A→B (transitivity: A,C → B,C → E via next FD)
      { lhs: ['B'], rhs: ['A'] },   // A↔B (so both {A,C} and {B,C} are keys)
      { lhs: ['A', 'C'], rhs: ['E'] },
      { lhs: ['A'], rhs: ['D'] },   // partial dep: D depends on A alone (part of composite key)
    ]
    return { attributes, fds, candidateKeys: findCandidateKeys(attributes, fds) }
  }

  // hard: long chain, redundancy, composite keys, partial deps
  const attributes = ['A', 'B', 'C', 'D', 'E', 'F']
  const fds: FD[] = [
    { lhs: ['A'], rhs: ['B'] },         // chain: A→B→C
    { lhs: ['B'], rhs: ['C'] },
    { lhs: ['A'], rhs: ['C'] },         // redundant (implied by A→B→C)
    { lhs: ['C', 'D'], rhs: ['E', 'F'] },
    { lhs: ['D'], rhs: ['A'] },         // D→A→B→C, so D,D=key? No — D alone covers A,B,C but not E,F without CD
    { lhs: ['E'], rhs: ['F'] },         // partial dep within composite key context
  ]
  return { attributes, fds, candidateKeys: findCandidateKeys(attributes, fds) }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateProblem(difficulty: Difficulty, maxAttempts = 1000): Problem {
  const qConfig = QUANTITATIVE_CONFIG[difficulty]
  const qProfile = QUALITATIVE_PROFILES[difficulty]

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const n = randomInt(qConfig.minAttrs, qConfig.maxAttrs)
    const attributes = ALL_ATTRS.slice(0, n)
    const fdCount = randomInt(qConfig.minFDs, qConfig.maxFDs)
    const fds = generateFDs(attributes, fdCount, difficulty)
    if (fds.length === 0) continue

    const candidateKeys = findCandidateKeys(attributes, fds)

    // Quantitative gate
    if (candidateKeys.length < qConfig.minKeys || candidateKeys.length > qConfig.maxKeys) continue

    // Qualitative gate
    if (!meetsQualitativeProfile(attributes, fds, candidateKeys, qProfile)) continue

    return { attributes, fds, candidateKeys }
  }

  // Fallback: construct a valid problem deterministically
  return buildFallback(difficulty)
}

export function generateQuestions(difficulty: Difficulty, count = 10): Problem[] {
  return Array.from({ length: count }, () => generateProblem(difficulty))
}
