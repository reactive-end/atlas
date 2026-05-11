import type { ForgeConfig } from '@/config/schema'
import { smartFilter } from '@/modules/forge/filters'
import { deduplicateLines } from '@/modules/forge/dedup'
import { RedundancyCache } from '@/modules/forge/redundancy'
import { compressMarkdown } from '@/modules/forge/markdown'
import { compressErrors } from '@/modules/forge/error-compressor'

export interface CompressionResult {
  output: string
  originalLines: number
  compressedLines: number
  ratio: number
}

let redundancyCache: RedundancyCache | null = null

function getRedundancyCache(config: ForgeConfig): RedundancyCache {
  if (!redundancyCache) {
    redundancyCache = new RedundancyCache(config.redundancyCacheSize)
  }
  return redundancyCache
}

function groupFilesByDirectory(lines: string[]): string[] {
  const fileLineRegex = /^(\s*)([./][\w/.-]+)/
  const groups = new Map<string, string[]>()
  const nonFileLines: string[] = []

  for (const line of lines) {
    const match = fileLineRegex.exec(line)
    if (match) {
      const fullPath = match[2]
      const lastSlash = fullPath.lastIndexOf('/')
      const dir = lastSlash > 0 ? fullPath.substring(0, lastSlash) : '.'
      const existing = groups.get(dir) ?? []
      existing.push(line)
      groups.set(dir, existing)
    } else {
      nonFileLines.push(line)
    }
  }

  if (groups.size === 0) {
    return lines
  }

  const grouped: string[] = [...nonFileLines]
  for (const [dir, files] of groups) {
    grouped.push(`[${dir}/]`)
    for (const file of files) {
      grouped.push(`  ${file.trim()}`)
    }
  }

  return grouped
}

function truncateLines(lines: string[], maxLines: number): string[] {
  if (lines.length <= maxLines) {
    return lines
  }

  const headCount = Math.ceil(maxLines * 0.6)
  const tailCount = maxLines - headCount
  const head = lines.slice(0, headCount)
  const tail = lines.slice(-tailCount)
  const skipped = lines.length - headCount - tailCount

  return [...head, `\n... [${skipped} lines omitted] ...\n`, ...tail]
}

function summarizeLines(lines: string[], threshold: number): string[] {
  if (lines.length <= threshold) {
    return lines
  }

  const errorLines = lines.filter(l =>
    /error|fail|exception|fatal/i.test(l),
  )
  const warningLines = lines.filter(l =>
    /warn|warning/i.test(l),
  )

  const summary: string[] = [
    `[Summary of ${lines.length} lines]`,
    `Total: ${lines.length} lines`,
  ]

  if (errorLines.length > 0) {
    summary.push(`Errors (${errorLines.length}):`)
    for (const line of errorLines.slice(0, 10)) {
      summary.push(`  ${line.trim()}`)
    }
    if (errorLines.length > 10) {
      summary.push(`  ... and ${errorLines.length - 10} more errors`)
    }
  }

  if (warningLines.length > 0) {
    summary.push(`Warnings (${warningLines.length}):`)
    for (const line of warningLines.slice(0, 5)) {
      summary.push(`  ${line.trim()}`)
    }
    if (warningLines.length > 5) {
      summary.push(`  ... and ${warningLines.length - 5} more warnings`)
    }
  }

  const firstLines = lines.slice(0, 5)
  const lastLines = lines.slice(-5)
  summary.push('First 5 lines:', ...firstLines)
  summary.push('Last 5 lines:', ...lastLines)

  return summary
}

export function compressBashOutput(
  text: string,
  config: ForgeConfig,
): CompressionResult {
  // Split once at the start — all pipeline stages operate on string[]
  const originalLines = text.split('\n')
  const originalCount = originalLines.length

  // smartFilter + compressMarkdown operate on full text (regex-based)
  let filtered = smartFilter(text)

  const dedupResult = deduplicateLines(filtered, config.dedupMin)
  filtered = dedupResult.text

  if (config.compressMarkdown) {
    filtered = compressMarkdown(filtered)
  }

  // Compress repetitive errors (TS/ESLint) before truncation
  filtered = compressErrors(filtered)

  // Convert to lines for directory grouping + truncation
  let lines = filtered.split('\n')

  lines = groupFilesByDirectory(lines)

  if (lines.length > config.summarizeThresholdLines) {
    lines = summarizeLines(lines, config.summarizeThresholdLines)
  } else {
    lines = truncateLines(lines, config.maxLines)
  }

  // Join once at the end
  let output = lines.join('\n')

  if (config.redundancyCacheEnabled) {
    const cache = getRedundancyCache(config)
    if (cache.isDuplicate(output)) {
      output = '[Output identical/similar to previous — omitted]'
    } else {
      cache.add(output)
    }
  }

  const compressedCount = output.split('\n').length
  const ratio = originalCount > 0 ? 1 - (compressedCount / originalCount) : 0

  return {
    output,
    originalLines: originalCount,
    compressedLines: compressedCount,
    ratio: Math.max(0, ratio),
  }
}

export function resetRedundancyCache(): void {
  redundancyCache?.clear()
  redundancyCache = null
}

export function getForgeStats(config: ForgeConfig): {
  cacheSize: number
  cacheEnabled: boolean
  maxLines: number
  summarizeThresholdLines: number
  bypass: string[]
  enabled: boolean
} {
  return {
    cacheSize: redundancyCache?.size ?? 0,
    cacheEnabled: config.redundancyCacheEnabled,
    maxLines: config.maxLines,
    summarizeThresholdLines: config.summarizeThresholdLines,
    bypass: config.bypass,
    enabled: config.enabled,
  }
}
