interface CacheEntry {
  hash: number
  shingles: Set<number>
  timestamp: number
}

function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
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

export class RedundancyCache {
  private cache: CacheEntry[] = []
  private readonly maxSize: number
  private readonly similarityThreshold: number
  private readonly shingleSize: number

  constructor(maxSize: number, similarityThreshold = 0.85, shingleSize = 3) {
    this.maxSize = maxSize
    this.similarityThreshold = similarityThreshold
    this.shingleSize = shingleSize
  }

  isDuplicate(text: string): boolean {
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
