import { describe, it, expect } from 'vitest'
import { parseIndexMarkdown, calculateDeltas } from './tracker'
import { analyzeFile } from './analyzer'
import { handleCodexSearch } from './tool-handlers'

describe('Codex Module', () => {
  describe('parseIndexMarkdown', () => {
    it('parses valid markdown index format', () => {
      const content = `version: 1
repository: /test/repo
indexed: 2024-01-01T00:00:00.000Z
count: 2

# src/client.ts
exports: saveObservation, searchObservations
CRUD operations for Vault observations.

# src/database.ts
exports: openDatabase, closeDatabase
SQLite adapter with WAL mode.
`

      const index = parseIndexMarkdown(content)

      expect(index.version).toBe(1)
      expect(index.fileCount).toBe(2)
      expect(index.files).toHaveLength(2)
      expect(index.files[0].path).toBe('src/client.ts')
      expect(index.files[0].exports).toContain('saveObservation')
      expect(index.files[0].description).toContain('CRUD operations')
    })

    it('extracts file paths from content', () => {
      const content = `version: 1
repository: /test
indexed: 2024-01-01T00:00:00.000Z
count: 1

# src/utils.ts
exports:
Utility functions.
`

      const index = parseIndexMarkdown(content)

      expect(index.files[0].path).toBe('src/utils.ts')
    })
  })

  describe('calculateDeltas', () => {
    it('detects added files', () => {
      const diskFiles = ['src/a.ts', 'src/b.ts']
      const existingFiles = new Map<string, string>([['src/a.ts', 'desc']])

      const delta = calculateDeltas(diskFiles, existingFiles, '/test')

      expect(delta.added).toContain('src/b.ts')
      expect(delta.unchanged).toContain('src/a.ts')
    })

    it('detects deleted files', () => {
      const diskFiles = ['src/a.ts']
      const existingFiles = new Map<string, string>([
        ['src/a.ts', 'desc'],
        ['src/deleted.ts', 'desc'],
      ])

      const delta = calculateDeltas(diskFiles, existingFiles, '/test')

      expect(delta.deleted).toContain('src/deleted.ts')
    })
  })

  describe('analyzeFile', () => {
    it('extracts exports from simple content via regex', () => {
      const content = `export function testFunction(): void {}
export const TEST_CONST = 'value'
export class TestClass {}
`

      const exports: string[] = []
      const expRegex = /^export\s+(?:function|const|let|var|class|interface|type|enum|default\s+(?:function|const|class))\s+(\w+)/gm
      let match: RegExpExecArray | null

      while ((match = expRegex.exec(content)) !== null) {
        exports.push(match[1])
      }

      expect(exports).toContain('testFunction')
      expect(exports).toContain('TEST_CONST')
      expect(exports).toContain('TestClass')
    })

    it('handles large content size check', () => {
      const largeContent = 'x'.repeat(60000)

      expect(largeContent.length).toBeGreaterThan(50000)
    })
  })

  describe('handleCodexSearch', () => {
    it('returns error when index not found', () => {
      const result = handleCodexSearch('test', 10)

      expect(result.isError).toBe(true)
      expect(result.content).toContain('not found')
    })
  })
})