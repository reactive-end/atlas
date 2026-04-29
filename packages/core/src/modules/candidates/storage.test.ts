// Candidates storage tests
// Tests for Phase 3 candidates persistence
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createDefaultCandidatesManifest,
  getCandidatesBasePath,
  getCandidatesFilePath,
  findCandidateById,
  findCandidatesByStatus,
  upsertCandidate,
  removeExpiredCandidates,
  enforceMaxCandidates,
  sortCandidates,
} from '@/modules/candidates/storage'
import type { CandidatesManifest, SkillCandidate } from '@/modules/candidates/types'

const makeCandidate = (overrides: Partial<SkillCandidate> = {}): SkillCandidate => ({
  id: 'test-cand-1',
  name: 'test_candidate',
  description: 'A test candidate',
  status: 'candidate',
  evidence: [{ tool: 'bash', reason: 'repeated' }],
  confidence: 75,
  tags: ['test'],
  detectedAt: Date.now(),
  updatedAt: Date.now(),
  occurrenceCount: 1,
  ...overrides,
})

describe('candidates storage', () => {
  describe('getCandidatesBasePath', () => {
    it('should resolve to ~/.athena/', () => {
      const base = getCandidatesBasePath()
      expect(base).toContain('.athena')
    })
  })

  describe('getCandidatesFilePath', () => {
    it('should resolve to candidates.json', () => {
      const path = getCandidatesFilePath()
      expect(path).toContain('candidates.json')
    })
  })

  describe('createDefaultCandidatesManifest', () => {
    it('should create manifest with version 1.0.0', () => {
      const manifest = createDefaultCandidatesManifest()
      expect(manifest.version).toBe('1.0.0')
      expect(manifest.candidates).toEqual([])
      expect(manifest.stats.totalDetected).toBe(0)
      expect(manifest.stats.totalPromoted).toBe(0)
      expect(manifest.stats.totalRejected).toBe(0)
    })

    it('should set createdAt to now', () => {
      const before = Date.now()
      const manifest = createDefaultCandidatesManifest()
      const after = Date.now()
      expect(manifest.stats.createdAt).toBeGreaterThanOrEqual(before)
      expect(manifest.stats.createdAt).toBeLessThanOrEqual(after)
    })
  })

  describe('findCandidateById', () => {
    it('should return candidate when found', () => {
      const manifest = createDefaultCandidatesManifest()
      const candidate = makeCandidate({ id: 'test-1' })
      const updated = upsertCandidate(manifest, candidate)
      expect(findCandidateById(updated, 'test-1')).toBeDefined()
    })

    it('should return undefined when not found', () => {
      const manifest = createDefaultCandidatesManifest()
      expect(findCandidateById(manifest, 'non-existent')).toBeUndefined()
    })
  })

  describe('findCandidatesByStatus', () => {
    it('should return candidates with matching status', () => {
      let manifest = createDefaultCandidatesManifest()
      manifest = upsertCandidate(manifest, makeCandidate({ id: 'c1', status: 'candidate' }))
      manifest = upsertCandidate(manifest, makeCandidate({ id: 'c2', status: 'pending' }))
      manifest = upsertCandidate(manifest, makeCandidate({ id: 'c3', status: 'candidate' }))

      const results = findCandidatesByStatus(manifest, 'candidate')
      expect(results.length).toBe(2)
      expect(results.every(c => c.status === 'candidate')).toBe(true)
    })
  })

  describe('upsertCandidate', () => {
    it('should add new candidate', () => {
      const manifest = createDefaultCandidatesManifest()
      const candidate = makeCandidate({ id: 'new-candidate' })
      const updated = upsertCandidate(manifest, candidate)

      expect(updated.candidates.length).toBe(1)
      expect(updated.candidates[0].id).toBe('new-candidate')
    })

    it('should update existing candidate', () => {
      let manifest = createDefaultCandidatesManifest()
      manifest = upsertCandidate(
        manifest,
        makeCandidate({ id: 'existing', confidence: 50 }),
      )

      manifest = upsertCandidate(
        manifest,
        makeCandidate({ id: 'existing', confidence: 90 }),
      )

      expect(manifest.candidates.length).toBe(1)
      expect(manifest.candidates[0].confidence).toBe(90)
      expect(manifest.candidates[0].updatedAt).toBeGreaterThanOrEqual(
        manifest.candidates[0].detectedAt,
      )
    })
  })

  describe('removeExpiredCandidates', () => {
    it('should return unchanged when expireAfterDays is 0', () => {
      const manifest = createDefaultCandidatesManifest()
      const updated = removeExpiredCandidates(manifest, 0)
      expect(updated.candidates.length).toBe(0)
    })

    it('should remove candidates older than threshold', () => {
      const oldDate = Date.now() - 31 * 86_400_000
      let manifest = createDefaultCandidatesManifest()
      manifest = upsertCandidate(manifest, makeCandidate({ id: 'old', detectedAt: oldDate }))
      manifest = upsertCandidate(manifest, makeCandidate({ id: 'new', detectedAt: Date.now() }))

      const updated = removeExpiredCandidates(manifest, 30)
      expect(updated.candidates.length).toBe(1)
      expect(updated.candidates[0].id).toBe('new')
    })

    it('should keep candidates newer than threshold', () => {
      let manifest = createDefaultCandidatesManifest()
      manifest = upsertCandidate(manifest, makeCandidate({ id: 'recent', detectedAt: Date.now() - 10 * 86_400_000 }))

      const updated = removeExpiredCandidates(manifest, 30)
      expect(updated.candidates.length).toBe(1)
    })
  })

  describe('enforceMaxCandidates', () => {
    it('should return unchanged when under limit', () => {
      let manifest = createDefaultCandidatesManifest()
      manifest = upsertCandidate(manifest, makeCandidate({ id: 'c1' }))
      manifest = upsertCandidate(manifest, makeCandidate({ id: 'c2' }))

      const updated = enforceMaxCandidates(manifest, 5)
      expect(updated.candidates.length).toBe(2)
    })

    it('should trim to max when over limit', () => {
      let manifest = createDefaultCandidatesManifest()
      for (let i = 0; i < 10; i++) {
        manifest = upsertCandidate(
          manifest,
          makeCandidate({ id: `c${i}`, confidence: i * 10 }),
        )
      }

      const updated = enforceMaxCandidates(manifest, 5)
      expect(updated.candidates.length).toBe(5)
      // Should keep highest confidence
      expect(updated.candidates[0].confidence).toBeGreaterThanOrEqual(50)
    })
  })

  describe('sortCandidates', () => {
    it('should sort by confidence desc by default', () => {
      const candidates = [
        makeCandidate({ id: 'low', confidence: 30 }),
        makeCandidate({ id: 'mid', confidence: 70 }),
        makeCandidate({ id: 'high', confidence: 90 }),
      ]

      const sorted = sortCandidates(candidates, 'confidence', 'desc')
      expect(sorted[0].id).toBe('high')
      expect(sorted[1].id).toBe('mid')
      expect(sorted[2].id).toBe('low')
    })

    it('should sort by detectedAt asc', () => {
      const now = Date.now()
      const candidates = [
        makeCandidate({ id: 'new', detectedAt: now }),
        makeCandidate({ id: 'old', detectedAt: now - 10_000 }),
        makeCandidate({ id: 'mid', detectedAt: now - 5_000 }),
      ]

      const sorted = sortCandidates(candidates, 'detectedAt', 'asc')
      expect(sorted[0].id).toBe('old')
      expect(sorted[2].id).toBe('new')
    })
  })
})