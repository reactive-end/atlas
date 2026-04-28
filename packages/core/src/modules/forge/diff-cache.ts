// Forge Differential Compression — Caches last output per command
// and returns only the diff on subsequent executions

interface CachedOutput {
  command: string
  lines: string[]
  timestamp: number
}

const outputCache = new Map<string, CachedOutput>()
const MAX_CACHE_ENTRIES = 32
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function normalizeCommand(command: string): string {
  return command.trim().replace(/\s+/g, ' ')
}

function computeDiff(oldLines: string[], newLines: string[]): string {
  const added: string[] = []
  const removed: string[] = []

  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)

  for (const line of newLines) {
    if (!oldSet.has(line)) {
      added.push(`+ ${line}`)
    }
  }

  for (const line of oldLines) {
    if (!newSet.has(line)) {
      removed.push(`- ${line}`)
    }
  }

  if (added.length === 0 && removed.length === 0) {
    return '[Forge: output identical to previous run — omitted]'
  }

  const parts: string[] = [
    `[Forge diff vs last run: +${added.length} lines, -${removed.length} lines]`,
  ]

  if (removed.length > 0) {
    parts.push(...removed.slice(0, 20))
    if (removed.length > 20) {
      parts.push(`  ... and ${removed.length - 20} more removals`)
    }
  }

  if (added.length > 0) {
    parts.push(...added.slice(0, 30))
    if (added.length > 30) {
      parts.push(`  ... and ${added.length - 30} more additions`)
    }
  }

  return parts.join('\n')
}

function evictStaleEntries(): void {
  const now = Date.now()
  for (const [key, entry] of outputCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      outputCache.delete(key)
    }
  }

  // LRU eviction if still too many entries
  while (outputCache.size > MAX_CACHE_ENTRIES) {
    const firstKey = outputCache.keys().next().value
    if (firstKey !== undefined) {
      outputCache.delete(firstKey)
    }
  }
}

export function compressDifferential(
  command: string,
  output: string,
): { result: string; wasDiff: boolean } {
  const key = normalizeCommand(command)
  const newLines = output.split('\n')

  evictStaleEntries()

  const cached = outputCache.get(key)

  if (cached) {
    const similarity = computeSimilarity(cached.lines, newLines)

    // Only show diff if outputs are >60% similar (same command, slightly different result)
    if (similarity > 0.6) {
      const diffResult = computeDiff(cached.lines, newLines)

      // Update cache with new output
      outputCache.set(key, {
        command: key,
        lines: newLines,
        timestamp: Date.now(),
      })

      return { result: diffResult, wasDiff: true }
    }
  }

  // Store in cache for future comparisons
  outputCache.set(key, {
    command: key,
    lines: newLines,
    timestamp: Date.now(),
  })

  return { result: output, wasDiff: false }
}

function computeSimilarity(oldLines: string[], newLines: string[]): number {
  if (oldLines.length === 0 && newLines.length === 0) return 1.0

  const oldSet = new Set(oldLines)
  let matching = 0

  for (const line of newLines) {
    if (oldSet.has(line)) matching++
  }

  const total = Math.max(oldLines.length, newLines.length)
  return total === 0 ? 0 : matching / total
}

export function clearDiffCache(): void {
  outputCache.clear()
}

export function getDiffCacheSize(): number {
  return outputCache.size
}
