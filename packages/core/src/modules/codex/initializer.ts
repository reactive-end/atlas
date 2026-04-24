import { join } from 'node:path'
import type { CodexConfig, IndexStats } from '@/modules/codex/types'
import { runCodexIndex } from '@/modules/codex/codex'
import { isIndexStale } from '@/modules/codex/writer'

export function initializeCodex(repoRoot: string, config: CodexConfig): IndexStats | null {
  if (!config.enabled || !config.autoIndexOnStart) {
    return null
  }

  const indexPath = join(repoRoot, config.indexPath)
  if (isIndexStale(repoRoot, indexPath, config.includePatterns, config.excludePatterns)) {
    return runCodexIndex(repoRoot, config)
  }

  return null
}