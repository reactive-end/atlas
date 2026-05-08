// Codex Graph Builder — Constructs dependency graph from indexed files
// Resolves import paths to actual file paths and builds edges

import { basename, dirname } from 'node:path'
import type { IndexedFile, DependencyGraph, GraphNode, GraphEdge } from '@/modules/codex/types'

function resolveImportPath(
  importSource: string,
  importerPath: string,
  allPaths: Set<string>,
): string | null {
  // Skip external packages (no relative or alias path)
  if (!importSource.startsWith('.') && !importSource.startsWith('@/')) {
    return null
  }

  // Handle @/ alias — treat as root-relative
  let resolved: string
  if (importSource.startsWith('@/')) {
    resolved = importSource.replace('@/', 'src/')
  } else {
    // Relative import — resolve from importer's directory
    const importerDir = dirname(importerPath)
    const parts = importerDir.split('/').filter(Boolean)
    const importParts = importSource.split('/')

    for (const part of importParts) {
      if (part === '..') {
        parts.pop()
      } else if (part !== '.') {
        parts.push(part)
      }
    }

    resolved = parts.join('/')
  }

  // Try common extensions
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js']

  for (const ext of extensions) {
    const candidate = resolved + ext
    if (allPaths.has(candidate)) {
      return candidate
    }
  }

  return null
}

export function buildDependencyGraph(files: IndexedFile[]): DependencyGraph {
  const allPaths = new Set(files.map(f => f.path))
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const edgeSet = new Set<string>()

  for (const file of files) {
    const label = basename(file.path).replace(/\.[tj]sx?$/, '')
    const pathParts = file.path.split('/')
    const group = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '.'

    nodes.push({
      id: file.path,
      label,
      type: file.fileType,
      exports: file.exports,
      group,
    })

    // Build edges from imports
    for (const imp of file.imports) {
      const targetPath = resolveImportPath(imp.source, file.path, allPaths)
      if (targetPath && targetPath !== file.path) {
        const edgeKey = `${file.path}→${targetPath}`
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey)
          edges.push({
            source: file.path,
            target: targetPath,
            imports: imp.symbols,
          })
        }
      }
    }
  }

  return { nodes, edges }
}
