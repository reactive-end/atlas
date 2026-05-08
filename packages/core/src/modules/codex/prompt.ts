import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CodexConfig } from '@/modules/codex/types'

export function buildCodexPrompt(): string {
  return `Codex: Repository index active at .atlas/index.md with dependency graph at .atlas/graph.html. Before exploring files manually, use codex_search(query) to locate files by exports, imports, path, type, or description. Only fall back to file_read or directory listing if Codex yields no relevant results.`
}

export function buildCodexContextPrompt(repoRoot: string, config: CodexConfig): string {
  if (!config.enabled) {
    return ''
  }

  const indexPath = join(repoRoot, config.indexPath)
  if (!existsSync(indexPath)) {
    return buildCodexPrompt()
  }

  try {
    const content = readFileSync(indexPath, 'utf-8')
    const lines = content.split('\n')

    // Build a compact directory-grouped file map
    const filesByDir = new Map<string, string[]>()
    let currentFile = ''
    let currentType = ''
    let currentExports = ''

    for (const line of lines) {
      if (line.startsWith('# ')) {
        currentFile = line.slice(2).trim()
      } else if (line.startsWith('type:') && currentFile) {
        currentType = line.slice(5).trim()
      } else if (line.startsWith('exports:') && currentFile) {
        currentExports = line.slice(8).trim()
        const lastSlash = currentFile.lastIndexOf('/')
        const dir = lastSlash > 0 ? currentFile.substring(0, lastSlash) : '.'
        const basename = lastSlash > 0 ? currentFile.substring(lastSlash + 1) : currentFile

        const entry = currentExports
          ? `  ${basename} [${currentType}] → ${currentExports}`
          : `  ${basename} [${currentType}]`

        const existing = filesByDir.get(dir) ?? []
        existing.push(entry)
        filesByDir.set(dir, existing)

        currentFile = ''
        currentType = ''
        currentExports = ''
      }
    }

    if (filesByDir.size === 0) {
      return buildCodexPrompt()
    }

    // Format as directory-grouped compact map
    const sections: string[] = []
    let totalEntries = 0
    const maxEntries = 80

    for (const [dir, entries] of filesByDir) {
      if (totalEntries >= maxEntries) break
      sections.push(`[${dir}/]`)
      const remaining = maxEntries - totalEntries
      const batch = entries.slice(0, remaining)
      sections.push(...batch)
      totalEntries += batch.length
    }

    const truncated = totalEntries >= maxEntries
      ? `\n... (use codex_search for full index)`
      : ''

    return [
      'Codex: Repository map (use codex_search for detailed lookup, .atlas/graph.html for visual graph):',
      ...sections,
      truncated,
      '',
      'Use codex_search(query) before manual file exploration.',
    ].filter(l => l !== undefined).join('\n')
  } catch {
    return buildCodexPrompt()
  }
}