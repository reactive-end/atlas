import { existsSync, mkdirSync, writeFileSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { IndexedFile } from '@/modules/codex/types'

export function ensureAtlasDir(repoRoot: string): string {
  const atlasDir = join(repoRoot, '.atlas')

  if (!existsSync(atlasDir)) {
    mkdirSync(atlasDir, { recursive: true })
  }

  return atlasDir
}

export function writeIndexMd(
  repoRoot: string,
  indexPath: string,
  files: IndexedFile[],
): void {
  const lines: string[] = [
    `version: ${1}`,
    `repository: ${repoRoot}`,
    `indexed: ${new Date().toISOString()}`,
    `count: ${files.length}`,
    '',
  ]

  for (const file of files) {
    const exportsStr = file.exports.join(', ')
    lines.push(`# ${file.path}`)
    lines.push(`exports: ${exportsStr}`)
    lines.push(file.description)
    lines.push('')
  }

  writeFileSync(indexPath, lines.join('\n'), 'utf-8')
}

export function isIndexStale(
  repoRoot: string,
  indexPath: string,
  _includePatterns: string[],
  _excludePatterns: string[],
): boolean {
  if (!existsSync(indexPath)) {
    return true
  }

  try {
    const indexStats = statSync(indexPath)
    const indexMtime = indexStats.mtimeMs

    function checkDirModified(dir: string): boolean {
      try {
        const entries = readdirSync(dir)

        for (const entry of entries) {
          const fullPath = join(dir, entry)
          const stats = statSync(fullPath)

          if (stats.isDirectory()) {
            if (entry !== 'node_modules' && entry !== '.atlas') {
              if (checkDirModified(fullPath)) {
                return true
              }
            }
          } else if (stats.isFile()) {
            if (stats.mtimeMs > indexMtime) {
              return true
            }
          }
        }
      } catch {
        // Skip errors
      }

      return false
    }

    return checkDirModified(repoRoot)
  } catch {
    return true
  }
}