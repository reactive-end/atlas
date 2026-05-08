// Shared FNV-1a hash implementation for Forge modules
// Used by redundancy cache, diff cache, and read cache

const FNV_OFFSET = 2166136261
const FNV_PRIME = 16777619

export function fnv1aHash(input: string): number {
  let hash = FNV_OFFSET
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = (hash * FNV_PRIME) >>> 0
  }
  return hash
}
