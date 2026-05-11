import { fnv1aHash } from '@/modules/forge/hash'

interface CacheEntry {
  hash: number
  shingles: Set<number>
  timestamp: number
}

function generateShingles(text: string, shingleSize: number): Set<number> {
  const words = text.split(/\s+/)
  const shingles = new Set<number>()

  for (let i = 0; i <= words.length - shingleSize; i++) {
    const shingle = words.slice(i, i + shingleSize).join(' ')
    shingles.add(fnv1aHash(shingle))
  }

  return shingles
}

function jaccardSimilarity(setA: Set<number>, setB: Set<number>): number {
  if (setA.size === 0 && setB.size === 0) {
    return 1.0
  }

  let intersection = 0
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++
    }
  }

  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

const DEFAULT_TTL_MS = 10 * 60 * 1000 // 10 minutes

export class RedundancyCache {
  private cache: CacheEntry[] = []
  private readonly maxSize: number
  private readonly similarityThreshold: number
  private readonly shingleSize: number
  private readonly ttlMs: number

  constructor(maxSize: number, similarityThreshold = 0.85, shingleSize = 3, ttlMs = DEFAULT_TTL_MS) {
    this.maxSize = maxSize
    this.similarityThreshold = similarityThreshold
    this.shingleSize = shingleSize
    this.ttlMs = ttlMs
  }

  private evictStale(): void {
    const now = Date.now()
    this.cache = this.cache.filter(entry => now - entry.timestamp <= this.ttlMs)
  }

  isDuplicate(text: string): boolean {
    this.evictStale()

    const hash = fnv1aHash(text)

    for (const entry of this.cache) {
      if (entry.hash === hash) {
        return true
      }
    }

    const shingles = generateShingles(text, this.shingleSize)

    for (const entry of this.cache) {
      const similarity = jaccardSimilarity(shingles, entry.shingles)
      if (similarity >= this.similarityThreshold) {
        return true
      }
    }

    return false
  }

  add(text: string): void {
    this.evictStale()

    const hash = fnv1aHash(text)
    const shingles = generateShingles(text, this.shingleSize)

    this.cache.push({
      hash,
      shingles,
      timestamp: Date.now(),
    })

    while (this.cache.length > this.maxSize) {
      this.cache.shift()
    }
  }

  clear(): void {
    this.cache = []
  }

  get size(): number {
    return this.cache.length
  }
}
