import { readFileSync, statSync } from 'node:fs'
import type { IndexedFile, ImportRef, FileType } from '@/modules/codex/types'

const EXPORT_REGEX = /^export\s+(?:function|const|let|var|class|interface|type|enum|default\s+(?:function|const|class))\s+(\w+)/gm

const IMPORT_REGEX = /^import\s+(?:(?:type\s+)?(?:\{([^}]+)\}|(\w+))\s+from\s+)?['"]([^'"]+)['"]/gm

const JSDOC_REGEX = /\/\*\*\s*\n([\s\S]*?)\*\/\s*\n/

// File type classification patterns
const TYPE_PATTERNS: Array<{ type: FileType; patterns: RegExp[] }> = [
  { type: 'test', patterns: [/\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/, /__tests__/] },
  { type: 'config', patterns: [/config/, /\.config\.[tj]s$/, /tsconfig/, /vite\.config/] },
  { type: 'type', patterns: [/types?\.[tj]s$/, /\.d\.ts$/, /interfaces?\.[tj]s$/] },
  { type: 'hook', patterns: [/use[A-Z]/, /hooks?\//] },
  { type: 'route', patterns: [/route/, /router/, /page\.[tj]sx?$/, /\+page/] },
  { type: 'component', patterns: [/\.[tj]sx$/, /components?\//] },
  { type: 'service', patterns: [/service/, /api\//, /client\.[tj]s$/] },
  { type: 'util', patterns: [/utils?\//, /helpers?\//, /lib\//] },
]

function classifyFileType(filePath: string, content: string): FileType {
  for (const { type, patterns } of TYPE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(filePath)) {
        return type
      }
    }
  }

  // Content-based classification
  if (/export\s+default\s+function\s+\w+.*\(/.test(content) && /return\s*\(?\s*</.test(content)) {
    return 'component'
  }

  if (/export\s+(?:class|function)\s+\w+Service/.test(content)) {
    return 'service'
  }

  return 'module'
}

function extractImports(content: string): ImportRef[] {
  const imports: ImportRef[] = []
  let match: RegExpExecArray | null

  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    const namedImports = match[1]
    const defaultImport = match[2]
    const source = match[3]

    const symbols: string[] = []

    if (namedImports) {
      for (const sym of namedImports.split(',')) {
        const cleaned = sym.trim().replace(/\s+as\s+\w+/, '')
        if (cleaned) {
          symbols.push(cleaned)
        }
      }
    }

    if (defaultImport) {
      symbols.push(defaultImport)
    }

    imports.push({ source, symbols })
  }

  IMPORT_REGEX.lastIndex = 0
  return imports
}

export function analyzeFile(filePath: string, maxFileSize: number = 50000): IndexedFile {
  let content: string
  let fileSize: number

  try {
    const stats = statSync(filePath)
    fileSize = stats.size
  } catch {
    return {
      path: filePath,
      exports: [],
      imports: [],
      description: 'File not found or inaccessible',
      fileType: 'module',
    }
  }

  if (fileSize > maxFileSize) {
    return {
      path: filePath,
      exports: [],
      imports: [],
      description: 'File too large to analyze',
      fileType: 'module',
    }
  }

  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return {
      path: filePath,
      exports: [],
      imports: [],
      description: 'File read error',
      fileType: 'module',
    }
  }

  const exports: string[] = []
  let match: RegExpExecArray | null

  while ((match = EXPORT_REGEX.exec(content)) !== null) {
    exports.push(match[1])
  }

  EXPORT_REGEX.lastIndex = 0

  const imports = extractImports(content)
  const description = extractDescription(content)
  const fileType = classifyFileType(filePath, content)

  return {
    path: filePath,
    exports,
    imports,
    description,
    fileType,
  }
}

function extractDescription(content: string): string {
  const jsdocMatch = JSDOC_REGEX.exec(content)
  if (jsdocMatch) {
    const docContent = jsdocMatch[1]
      .replace(/^\s*\*\s*/gm, ' ')
      .replace(/\s+$/, '')
      .trim()
    if (docContent.length > 0) {
      return docContent
    }
  }

  const lines = content.split('\n')
  const commentLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('//')) {
      commentLines.push(trimmed.slice(2).trim())
    } else if (trimmed && !trimmed.startsWith('//')) {
      break
    }
  }

  if (commentLines.length > 0) {
    return commentLines.join(' ').slice(0, 200)
  }

  return 'TypeScript module'
}