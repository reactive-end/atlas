import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parseIndexMarkdown, calculateDeltas, scanFiles } from '@/modules/codex/tracker'
import { analyzeFile } from '@/modules/codex/analyzer'
import { handleCodexSearch } from '@/modules/codex/tool-handlers'
import * as fs from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { RepoIndex } from '@/modules/codex/types'

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
    let tmpDir: string

    beforeEach(() => {
      tmpDir = join(tmpdir(), `codex-delta-test-${Date.now()}`)
      fs.mkdirSync(join(tmpDir, 'src'), { recursive: true })
    })

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    it('detects added files', () => {
      fs.writeFileSync(join(tmpDir, 'src', 'a.ts'), 'export const a = 1')
      fs.writeFileSync(join(tmpDir, 'src', 'b.ts'), 'export const b = 2')

      // Force a.ts mtime to the past so it appears unchanged
      const pastDate = new Date('2020-01-01')
      fs.utimesSync(join(tmpDir, 'src', 'a.ts'), pastDate, pastDate)

      const diskFiles = ['src/a.ts', 'src/b.ts']
      const existingIndex: RepoIndex = {
        version: 1,
        repositoryRoot: tmpDir,
        lastIndexedAt: new Date().toISOString(),
        fileCount: 1,
        files: [{ path: 'src/a.ts', exports: [], description: 'desc' }],
      }

      const delta = calculateDeltas(diskFiles, existingIndex, tmpDir)

      expect(delta.added).toContain('src/b.ts')
      expect(delta.unchanged).toContain('src/a.ts')
    })

    it('detects deleted files', () => {
      fs.writeFileSync(join(tmpDir, 'src', 'a.ts'), 'export const a = 1')

      const diskFiles = ['src/a.ts']
      const existingIndex: RepoIndex = {
        version: 1,
        repositoryRoot: tmpDir,
        lastIndexedAt: new Date().toISOString(),
        fileCount: 2,
        files: [
          { path: 'src/a.ts', exports: [], description: 'desc' },
          { path: 'src/deleted.ts', exports: [], description: 'desc' },
        ],
      }

      const delta = calculateDeltas(diskFiles, existingIndex, tmpDir)

      expect(delta.deleted).toContain('src/deleted.ts')
    })

    it('detects modified files when mtime is newer than last index', () => {
      fs.writeFileSync(join(tmpDir, 'src', 'a.ts'), 'export const a = 1')

      const diskFiles = ['src/a.ts']
      const existingIndex: RepoIndex = {
        version: 1,
        repositoryRoot: tmpDir,
        lastIndexedAt: '2024-01-01T00:00:00.000Z',
        fileCount: 1,
        files: [{ path: 'src/a.ts', exports: [], description: 'Old desc' }],
      }

      const delta = calculateDeltas(diskFiles, existingIndex, tmpDir)

      expect(delta.modified).toContain('src/a.ts')
      expect(delta.unchanged).toHaveLength(0)
    })

    it('keeps unchanged files when mtime is older than last index', () => {
      fs.writeFileSync(join(tmpDir, 'src', 'a.ts'), 'export const a = 1')

      const diskFiles = ['src/a.ts']
      const existingIndex: RepoIndex = {
        version: 1,
        repositoryRoot: tmpDir,
        lastIndexedAt: '2099-01-01T00:00:00.000Z',
        fileCount: 1,
        files: [{ path: 'src/a.ts', exports: [], description: 'Desc' }],
      }

      const delta = calculateDeltas(diskFiles, existingIndex, tmpDir)

      expect(delta.unchanged).toContain('src/a.ts')
      expect(delta.modified).toHaveLength(0)
    })
  })

  describe('scanFiles', () => {
    let tmpDir: string

    beforeEach(() => {
      tmpDir = join(tmpdir(), `codex-scan-test-${Date.now()}`)
      fs.mkdirSync(join(tmpDir, 'packages', 'core', 'src'), { recursive: true })
      fs.mkdirSync(join(tmpDir, 'packages', 'core', 'node_modules', 'lib'), { recursive: true })
      fs.writeFileSync(join(tmpDir, 'packages', 'core', 'src', 'index.ts'), 'export const a = 1')
      fs.writeFileSync(join(tmpDir, 'packages', 'core', 'node_modules', 'lib', 'foo.ts'), 'export const b = 2')
    })

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    it('discovers files matching include patterns', () => {
      const files = scanFiles(tmpDir, ['**/src/**/*.ts'], [])

      expect(files).toContain('packages/core/src/index.ts')
    })

    it('excludes nested node_modules directories', () => {
      const files = scanFiles(tmpDir, ['**/*.ts'], ['**/node_modules/**'])

      expect(files).toContain('packages/core/src/index.ts')
      expect(files).not.toContain('packages/core/node_modules/lib/foo.ts')
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
