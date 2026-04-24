import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { RepoIndex, IndexedFile, FileDelta } from '@/modules/codex/types'

export function readExistingIndex(indexPath: string): RepoIndex | null {
  if (!existsSync(indexPath)) {
    return null
  }

  try {
    const content = readFileSync(indexPath, 'utf-8')
    return parseIndexMarkdown(content)
  } catch {
    return null
  }
}

export function parseIndexMarkdown(content: string): RepoIndex {
  const files: IndexedFile[] = []
  const blocks = content.split(/\n#\s+/).filter(Boolean)

  let version = 1
  let repositoryRoot = ''
  let lastIndexedAt = ''

  for (const block of blocks) {
    if (block.startsWith('version:')) {
      const versionMatch = block.match(/^version:\s*(\d+)/)
      if (versionMatch) {
        version = parseInt(versionMatch[1], 10)
      }
      continue
    }

    if (block.startsWith('repository:')) {
      const repoMatch = block.match(/^repository:\s*(.+)/)
      if (repoMatch) {
        repositoryRoot = repoMatch[1].trim()
      }
      continue
    }

    if (block.startsWith('indexed:')) {
      const indexedMatch = block.match(/^indexed:\s*(.+)/)
      if (indexedMatch) {
        lastIndexedAt = indexedMatch[1].trim()
      }
      continue
    }

    if (block.startsWith('count:')) {
      continue
    }

    const trimmedBlock = block.trim()
    if (!trimmedBlock) continue

    const firstNewline = trimmedBlock.indexOf('\n')
    if (firstNewline === -1) continue

    const path = trimmedBlock.slice(0, firstNewline).trim()
    const rest = trimmedBlock.slice(firstNewline + 1)

    const exportsLineMatch = rest.match(/^exports:\s*(.+)/m)
    const exports: string[] = exportsLineMatch
      ? exportsLineMatch[1].split(',').map(e => e.trim()).filter(Boolean)
      : []

    let description = rest
      .replace(/^exports:.*$/m, '')
      .replace(/^#.*$/gm, '')
      .replace(/^\s+/, '')
      .trim()

    if (description.length > 200) {
      description = description.slice(0, 197) + '...'
    }

    files.push({ path, exports, description })
  }

  return {
    version,
    repositoryRoot: repositoryRoot || '',
    lastIndexedAt: lastIndexedAt || new Date().toISOString(),
    fileCount: files.length,
    files,
  }
}

export function calculateDeltas(
  diskFiles: string[],
  existingIndex: RepoIndex | null,
  repoRoot: string,
): FileDelta {
  const delta: FileDelta = {
    added: [],
    modified: [],
    deleted: [],
    unchanged: [],
  }

  const existingPaths = new Set(existingIndex ? existingIndex.files.map(f => f.path) : [])
  const lastIndexedTime = existingIndex ? new Date(existingIndex.lastIndexedAt).getTime() : 0

  for (const filePath of diskFiles) {
    if (!existingPaths.has(filePath)) {
      delta.added.push(filePath)
    } else {
      try {
        const fullPath = join(repoRoot, filePath)
        const stats = statSync(fullPath)
        if (stats.mtimeMs > lastIndexedTime) {
          delta.modified.push(filePath)
        } else {
          delta.unchanged.push(filePath)
        }
      } catch {
        delta.unchanged.push(filePath)
      }
    }
  }

  for (const existingPath of existingPaths) {
    if (!diskFiles.includes(existingPath)) {
      delta.deleted.push(existingPath)
    }
  }

  return delta
}

export function scanFiles(
  repoRoot: string,
  includePatterns: string[],
  excludePatterns: string[],
): string[] {
  const results: string[] = []

  const matchesPattern = (path: string, patterns: string[]): boolean => {
    for (const pattern of patterns) {
      const regexPattern = pattern
        .replace(/[+.^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*\//g, '{{GLOBSTAR_SLASH}}')
        .replace(/\*\*/g, '{{GLOBSTAR}}')
        .replace(/\*/g, '{{STAR}}')
        .replace(/\?/g, '{{QMARK}}')
        .replace(/{{GLOBSTAR_SLASH}}/g, '(?:.*/)?')
        .replace(/{{GLOBSTAR}}/g, '.*')
        .replace(/{{STAR}}/g, '[^/]*')
        .replace(/{{QMARK}}/g, '.')

      const regex = new RegExp(`^${regexPattern}$`, 'i')
      if (regex.test(path)) {
        return true
      }
    }
    return false
  }

  const shouldExclude = (relativePath: string): boolean => {
    for (const pattern of excludePatterns) {
      if (matchesPattern(relativePath, [pattern])) {
        return true
      }
    }
    return false
  }

  const shouldInclude = (relativePath: string): boolean => {
    return matchesPattern(relativePath, includePatterns)
  }

  function walkDirectory(dir: string): void {
    try {
      const entries = readdirSync(dir)

      for (const entry of entries) {
        const fullPath = join(dir, entry)
        const relativePath = relative(repoRoot, fullPath).replace(/\\/g, '/')

        try {
          const stats = statSync(fullPath)

          if (stats.isDirectory()) {
            const isExcluded = shouldExclude(relativePath) || shouldExclude(relativePath + '/')
            if (!isExcluded) {
              walkDirectory(fullPath)
            }
          } else if (stats.isFile()) {
            if (shouldInclude(relativePath) && !shouldExclude(relativePath)) {
              results.push(relativePath)
            }
          }
        } catch {
          // Skip inaccessible files/directories
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  walkDirectory(repoRoot)

  return results
}