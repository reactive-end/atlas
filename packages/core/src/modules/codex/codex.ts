import type { CodexConfig, IndexStats, IndexedFile } from '@/modules/codex/types'
import { scanFiles, readExistingIndex, calculateDeltas } from '@/modules/codex/tracker'
import { analyzeFile } from '@/modules/codex/analyzer'
import { ensureAtlasDir, writeIndexMd } from '@/modules/codex/writer'
import { buildDependencyGraph } from '@/modules/codex/graph-builder'
import { writeGraphHtml } from '@/modules/codex/graph-renderer'
import { join } from 'node:path'

export function runCodexIndex(repoRoot: string, config: CodexConfig): IndexStats {
  const indexPath = join(repoRoot, config.indexPath)

  const diskFiles = scanFiles(repoRoot, config.includePatterns, config.excludePatterns)

  const existingIndex = readExistingIndex(indexPath)

  const delta = calculateDeltas(diskFiles, existingIndex, repoRoot)

  const newFiles: IndexedFile[] = []

  for (const filePath of delta.added) {
    const absolutePath = join(repoRoot, filePath)
    const analyzed = analyzeFile(absolutePath, config.maxFileSize)
    analyzed.path = filePath
    newFiles.push(analyzed)
  }

  for (const filePath of delta.modified) {
    const absolutePath = join(repoRoot, filePath)
    const analyzed = analyzeFile(absolutePath, config.maxFileSize)
    analyzed.path = filePath
    newFiles.push(analyzed)
  }

  const unchangedFiles: IndexedFile[] = []
  if (existingIndex) {
    for (const file of existingIndex.files) {
      if (delta.unchanged.includes(file.path)) {
        unchangedFiles.push(file)
      }
    }
  }

  const allFiles = [...newFiles, ...unchangedFiles]

  // Build dependency graph from all indexed files
  const graph = buildDependencyGraph(allFiles)

  ensureAtlasDir(repoRoot)
  writeIndexMd(repoRoot, indexPath, allFiles)

  // Generate interactive HTML visualization
  writeGraphHtml(repoRoot, graph)

  return {
    indexed: allFiles.length,
    updated: newFiles.length,
    deleted: delta.deleted.length,
    edges: graph.edges.length,
  }
}