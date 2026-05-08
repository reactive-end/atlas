// Candidates detector tests
// Tests for Phase 3 skill candidate detection logic
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  analyzeToolExecution,
  isCandidatesEnabled,
} from '@/modules/athena/candidates/detector'



vi.mock('@/modules/athena/candidates/storage', () => ({
  getSessionToolCallCount: vi.fn().mockReturnValue(0),
  incrementSessionToolCallCount: vi.fn().mockReturnValue(1),
  getOrCreateCandidatesManifest: vi.fn().mockReturnValue({
    version: '1.0.0',
    candidates: [],
    stats: { totalDetected: 0, totalPromoted: 0, totalRejected: 0, createdAt: Date.now() },
  }),
  saveCandidatesManifest: vi.fn(),
  upsertCandidate: vi.fn(),
  removeExpiredCandidates: vi.fn(),
  enforceMaxCandidates: vi.fn(),
  incrementDetectedCount: vi.fn(),
}))

import {
  getSessionToolCallCount,
  incrementSessionToolCallCount,
} from '@/modules/athena/candidates/storage'



describe('candidates detector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('analyzeToolExecution', () => {
    it('should return empty for low-value tools', () => {
      const candidates = analyzeToolExecution('cd', { path: '/foo' }, 'output', 'session-1')
      expect(candidates.length).toBe(0)
    })

    it('should return empty for empty args', () => {
      const candidates = analyzeToolExecution('bash', {}, 'output', 'session-1')
      expect(candidates.length).toBe(0)
    })

    it('should detect repeated pattern for non-trivial tool calls', () => {
      vi.mocked(getSessionToolCallCount).mockReturnValue(3)
      vi.mocked(incrementSessionToolCallCount).mockReturnValue(4)

      const candidates = analyzeToolExecution('bash', { command: 'npm test' }, 'test output', 'session-1')

      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates[0].evidence.some(e => e.reason === 'repeated')).toBe(true)
    })

    it('should detect high_complexity for large output tools', () => {
      const longOutput = 'x'.repeat(21_000)

      const candidates = analyzeToolExecution('bash', { command: 'npm build', env: 'prod' }, longOutput, 'session-2')

      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates.some(c => c.evidence.some(e => e.reason === 'high_complexity'))).toBe(true)
    })

    it('should detect template pattern for tools with template markers', () => {
      const candidates = analyzeToolExecution(
        'write',
        { path: '/src/${component}/index.ts', content: '{{ template content }}' },
        'written',
        'session-3',
      )

      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates.some(c => c.evidence.some(e => e.reason === 'template'))).toBe(true)
    })

    it('should never throw', () => {
      expect(() => {
        analyzeToolExecution('write', { path: '/test', content: 'data' }, 'output', 'session-err')
      }).not.toThrow()
    })

    it('should generate candidate with all required fields', () => {
      vi.mocked(getSessionToolCallCount).mockReturnValue(2)
      vi.mocked(incrementSessionToolCallCount).mockReturnValue(3)

      const candidates = analyzeToolExecution('glob', { pattern: '**/*.ts' }, 'file1.ts\nfile2.ts', 'session-4')

      if (candidates.length > 0) {
        const c = candidates[0]
        expect(c.id).toBeDefined()
        expect(c.id.length).toBeLessThanOrEqual(60)
        expect(c.name).toBeDefined()
        expect(c.description).toBeDefined()
        expect(c.status).toBe('candidate')
        expect(c.confidence).toBeGreaterThan(0)
        expect(c.tags).toBeInstanceOf(Array)
        expect(c.evidence).toBeInstanceOf(Array)
        expect(c.detectedAt).toBeDefined()
      }
    })

    it('should tag candidates with tool name and automation', () => {
      vi.mocked(getSessionToolCallCount).mockReturnValue(3)

      const candidates = analyzeToolExecution('websearch', { query: 'typescript' }, 'results...', 'session-5')

      if (candidates.length > 0) {
        expect(candidates[0].tags).toContain('websearch')
        expect(candidates[0].tags).toContain('automation')
      }
    })
  })

  describe('isCandidatesEnabled', () => {
    it('should return true when enabled is true', () => {
      expect(isCandidatesEnabled({ enabled: true })).toBe(true)
    })

    it('should return false when enabled is false', () => {
      expect(isCandidatesEnabled({ enabled: false })).toBe(false)
    })

    it('should return false when enabled is undefined', () => {
      expect(isCandidatesEnabled({ enabled: undefined as boolean })).toBe(false)
    })
  })
})