import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CodexConfig } from '@/modules/codex/types'

export function buildCodexPrompt(): string {
  return `Codex: Repository index active at .atlas/index.md. Before exploring files manually, use codex_search(query) to locate files by exports, path, or description. Only fall back to file_read or directory listing if Codex yields no relevant results.`
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

    // Extract a compact file map from the index
    const fileEntries: string[] = []
    let currentFile = ''

    for (const line of lines) {
      if (line.startsWith('# ')) {
        currentFile = line.slice(2).trim()
      } else if (line.startsWith('exports:') && currentFile) {
        const exports = line.slice(8).trim()
        if (exports) {
          fileEntries.push(`${currentFile} → ${exports}`)
        } else {
          fileEntries.push(currentFile)
        }
        currentFile = ''
      }
    }

    if (fileEntries.length === 0) {
      return buildCodexPrompt()
    }

    // Cap the index summary to avoid bloating the system prompt
    const maxEntries = 50
    const entries = fileEntries.slice(0, maxEntries)
    const truncated = fileEntries.length > maxEntries
      ? `\n... and ${fileEntries.length - maxEntries} more files`
      : ''

    return [
      'Codex: Repository map (use codex_search for detailed lookup):',
      ...entries,
      truncated,
      '',
      'Use codex_search(query) before manual file exploration.',
    ].filter(l => l !== undefined).join('\n')
  } catch {
    return buildCodexPrompt()
  }
}