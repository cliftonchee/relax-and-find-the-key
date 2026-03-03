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
  const cl = new Set(computeClosure(attrs, fds))
  return allAttrs.every(a => cl.has(a))
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
    .sort((a, b) => a.length !== b.length ? a.length - b.length : a.join(',').localeCompare(b.join(',')))
}
