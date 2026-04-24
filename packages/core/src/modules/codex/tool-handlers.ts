import { readFileSync, existsSync } from 'node:fs'
import type { CodexConfig } from '@/modules/codex/types'
import { parseIndexMarkdown } from '@/modules/codex/tracker'
import { runCodexIndex } from '@/modules/codex/codex'

export interface CodexToolResult {
  content: string
  isError: boolean
}

export function handleCodexSearch(query: string, limit: number = 10): CodexToolResult {
  const indexPath = '.atlas/index.md'

  if (!existsSync(indexPath)) {
    return {
      content: 'Codex index not found. Run codex_reindex to build it.',
      isError: true,
    }
  }

  try {
    const content = readFileSync(indexPath, 'utf-8')
    const index = parseIndexMarkdown(content)

    const lowerQuery = query.toLowerCase()
    const matches: Array<{ file: { path: string; exports: string[]; description: string }; score: number }> = []

    for (const file of index.files) {
      let score = 0

      if (file.path.toLowerCase().includes(lowerQuery)) {
        score += 10
      }

      for (const exp of file.exports) {
        if (exp.toLowerCase().includes(lowerQuery)) {
          score += 20
        }
      }

      if (file.description.toLowerCase().includes(lowerQuery)) {
        score += 5
      }

      if (score > 0) {
        matches.push({ file, score })
      }
    }

    matches.sort((a, b) => b.score - a.score)

    const topMatches = matches.slice(0, limit)

    if (topMatches.length === 0) {
      return {
        content: 'No matches found in Codex index.',
        isError: false,
      }
    }

    const results = topMatches.map((match, idx) => {
      const exportsStr = match.file.exports.join(', ')
      return `[${idx + 1}] ${match.file.path}\nexports: ${exportsStr}\n${match.file.description}`
    })

    return {
      content: results.join('\n\n'),
      isError: false,
    }
  } catch (err) {
    return {
      content: `Error reading Codex index: ${err instanceof Error ? err.message : 'Unknown error'}`,
      isError: true,
    }
  }
}

export function handleCodexReindex(repoRoot: string, config: CodexConfig): CodexToolResult {
  try {
    const stats = runCodexIndex(repoRoot, config)

    return {
      content: `Codex re-indexed: ${stats.indexed} files, ${stats.updated} updated, ${stats.deleted} removed.`,
      isError: false,
    }
  } catch (err) {
    return {
      content: `Codex re-index failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      isError: true,
    }
  }
}