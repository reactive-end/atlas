import { readFileSync, statSync } from 'node:fs'
import type { IndexedFile } from './types'

const EXPORT_REGEX = /^export\s+(?:function|const|let|var|class|interface|type|enum|default\s+(?:function|const|class))\s+(\w+)/gm

const JSDOC_REGEX = /\/\*\*\s*\n([\s\S]*?)\*\/\s*\n/

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
      description: 'File not found or inaccessible',
    }
  }

  if (fileSize > maxFileSize) {
    return {
      path: filePath,
      exports: [],
      description: 'File too large to analyze',
    }
  }

  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return {
      path: filePath,
      exports: [],
      description: 'File read error',
    }
  }

  const exports: string[] = []
  let match: RegExpExecArray | null

  while ((match = EXPORT_REGEX.exec(content)) !== null) {
    exports.push(match[1])
  }

  EXPORT_REGEX.lastIndex = 0

  const description = extractDescription(content)

  return {
    path: filePath,
    exports,
    description,
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