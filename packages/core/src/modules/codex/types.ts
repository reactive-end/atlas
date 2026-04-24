export interface IndexedFile {
  path: string
  exports: string[]
  description: string
}

export interface RepoIndex {
  version: number
  repositoryRoot: string
  lastIndexedAt: string
  fileCount: number
  files: IndexedFile[]
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
}

export interface CodexConfig {
  enabled: boolean
  indexPath: string
  includePatterns: string[]
  excludePatterns: string[]
  maxFileSize: number
  autoIndexOnStart: boolean
}