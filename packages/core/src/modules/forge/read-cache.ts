// Forge Read Cache — Tracks recently read files and returns
// compact summaries for re-reads of unchanged content

import { fnv1aHash } from '@/modules/forge/hash'

interface CachedRead {
  path: string
  contentHash: number
  lineCount: number
  exports: string[]
  summary: string
  timestamp: number
}

const readCache = new Map<string, CachedRead>()
const MAX_CACHE_SIZE = 64
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

function extractQuickExports(content: string): string[] {
  const exports: string[] = []
  const regex = /^export\s+(?:function|const|let|var|class|interface|type|enum)\s+(\w+)/gm
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    exports.push(match[1])
  }

  regex.lastIndex = 0
  return exports.slice(0, 20) // Cap at 20 exports for summary
}

function buildSummary(path: string, lineCount: number, exports: string[]): string {
  const exportsStr = exports.length > 0
    ? `exports: ${exports.join(', ')}`
    : 'no public exports'

  return `[File: ${path} — unchanged since last read, ${lineCount} lines, ${exportsStr}]`
}

function evictStale(): void {
  const now = Date.now()
  for (const [key, entry] of readCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      readCache.delete(key)
    }
  }

  while (readCache.size > MAX_CACHE_SIZE) {
    const firstKey = readCache.keys().next().value
    if (firstKey !== undefined) {
      readCache.delete(firstKey)
    }
  }
}

export function compressReadResult(
  filePath: string,
  content: string,
): { result: string; wasCached: boolean } {
  evictStale()

  const hash = fnv1aHash(content)
  const cached = readCache.get(filePath)

  if (cached && cached.contentHash === hash) {
    // Content unchanged — return compact summary
    return {
      result: cached.summary,
      wasCached: true,
    }
  }

  // New or changed content — cache and return original
  const lineCount = content.split('\n').length
  const exports = extractQuickExports(content)
  const summary = buildSummary(filePath, lineCount, exports)

  readCache.set(filePath, {
    path: filePath,
    contentHash: hash,
    lineCount,
    exports,
    summary,
    timestamp: Date.now(),
  })

  return { result: content, wasCached: false }
}

export function clearReadCache(): void {
  readCache.clear()
}

export function getReadCacheSize(): number {
  return readCache.size
}
