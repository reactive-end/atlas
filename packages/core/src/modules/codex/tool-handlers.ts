import { readFileSync, existsSync } from 'node:fs'
import type { CodexConfig } from '@/modules/codex/types'
import { parseIndexMarkdown } from '@/modules/codex/tracker'
import { runCodexIndex } from '@/modules/codex/codex'

export interface CodexToolResult {
  content: string
  isError: boolean
}

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase()
  const t = text.toLowerCase()

  // Exact match
  if (t === q) return 100
  // Contains full query
  if (t.includes(q)) return 50

  // Word-level matching
  const queryWords = q.split(/\s+/)
  let wordScore = 0
  for (const word of queryWords) {
    if (t.includes(word)) {
      wordScore += 15
    }
  }

  return wordScore
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

    const matches: Array<{ file: typeof index.files[0]; score: number }> = []

    for (const file of index.files) {
      let score = 0

      // Path matching (weighted)
      score += fuzzyScore(query, file.path) * 0.5

      // Export matching (highest weight)
      for (const exp of file.exports) {
        const expScore = fuzzyScore(query, exp)
        if (expScore > 0) {
          score += expScore * 1.5
        }
      }

      // Import source matching
      for (const imp of file.imports) {
        const impScore = fuzzyScore(query, imp.source)
        if (impScore > 0) {
          score += impScore * 0.3
        }
        for (const sym of imp.symbols) {
          const symScore = fuzzyScore(query, sym)
          if (symScore > 0) {
            score += symScore * 0.5
          }
        }
      }

      // Description matching
      score += fuzzyScore(query, file.description) * 0.3

      // File type matching
      score += fuzzyScore(query, file.fileType) * 0.2

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
      const importsStr = match.file.imports.length > 0
        ? `\nimports: ${match.file.imports.map(i => i.source).join(', ')}`
        : ''
      return `[${idx + 1}] ${match.file.path} [${match.file.fileType}]\nexports: ${exportsStr}${importsStr}\n${match.file.description}`
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
      content: `Codex re-indexed: ${stats.indexed} files, ${stats.updated} updated, ${stats.deleted} removed, ${stats.edges} dependency edges. Graph written to .atlas/graph.html`,
      isError: false,
    }
  } catch (err) {
    return {
      content: `Codex re-index failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      isError: true,
    }
  }
}