export interface IndexedFile {
  path: string
  exports: string[]
  imports: ImportRef[]
  description: string
  fileType: FileType
}

export interface ImportRef {
  source: string
  symbols: string[]
}

export type FileType =
  | 'component'
  | 'service'
  | 'hook'
  | 'util'
  | 'type'
  | 'config'
  | 'test'
  | 'route'
  | 'module'

export interface GraphNode {
  id: string
  label: string
  type: FileType
  exports: string[]
  group: string
}

export interface GraphEdge {
  source: string
  target: string
  imports: string[]
}

export interface DependencyGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface RepoIndex {
  version: number
  repositoryRoot: string
  lastIndexedAt: string
  fileCount: number
  files: IndexedFile[]
  graph: DependencyGraph
}

export interface FileDelta {
  added: string[]
  modified: string[]
  deleted: string[]
  unchanged: string[]
}

export interface IndexStats {
  indexed: number
  updated: number
  deleted: number
  edges: number
}

export interface CodexConfig {
  enabled: boolean
  indexPath: string
  includePatterns: string[]
  excludePatterns: string[]
  maxFileSize: number
  autoIndexOnStart: boolean
}