// Stats module tests
// Tests for Athena telemetry stats builder

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AtlasConfig } from '@/config/schema'
import { buildAthenaStats, formatAthenaStats, getStatsSummary } from '@/modules/athena/skills/stats'

// Mock curator module
vi.mock('@/modules/athena/skills/curator', () => ({
  loadCuratorState: vi.fn(),
  loadUsageData: vi.fn(),
}))

// Mock candidates storage
vi.mock('@/modules/athena/candidates/storage', () => ({
  loadCandidatesManifest: vi.fn(),
}))

import { loadCuratorState, loadUsageData } from '@/modules/athena/skills/curator'
import { loadCandidatesManifest } from '@/modules/athena/candidates/storage'

describe('buildAthenaStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty stats when Athena not configured', () => {
    vi.mocked(loadUsageData).mockReturnValue({ version: '1.0.0', skills: [], lastUpdated: 0 })

    const config: AtlasConfig = { athena: undefined } as AtlasConfig
    const stats = buildAthenaStats(config)

    expect(stats.version).toBe('1.0.0')
    expect(stats.skills.total).toBe(0)
    expect(stats.candidates.enabled).toBe(false)
    expect(stats.curator.enabled).toBe(false)
  })

  it('should aggregate skills stats from usage data', () => {
    const mockUsage = {
      version: '1.0.0',
      skills: [
        { skillId: 's1', skillName: 'Skill 1', lastUsedAt: Date.now(), state: 'active', pinned: false, useCount: 5, stateChangedAt: 0 },
        { skillId: 's2', skillName: 'Skill 2', lastUsedAt: Date.now(), state: 'active', pinned: false, useCount: 3, stateChangedAt: 0 },
        { skillId: 's3', skillName: 'Skill 3', lastUsedAt: Date.now(), state: 'stale', pinned: false, useCount: 1, stateChangedAt: 0 },
        { skillId: 's4', skillName: 'Skill 4', lastUsedAt: Date.now(), state: 'archived', pinned: false, useCount: 0, stateChangedAt: 0 },
      ],
      lastUpdated: Date.now(),
    }
    vi.mocked(loadUsageData).mockReturnValue(mockUsage as ReturnType<typeof loadUsageData>)

    vi.mocked(loadCuratorState).mockReturnValue({
      version: '1.0.0',
      paused: false,
      lastRunAt: Date.now(),
      counters: { totalStaled: 1, totalArchived: 1, totalReactivated: 0, runCount: 5 },
    })

    const config: AtlasConfig = {
      athena: {
        enabled: true,
        skills: { enabled: true },
        candidates: { enabled: false },
        curator: { enabled: true },
      },
    } as AtlasConfig

    const stats = buildAthenaStats(config)

    expect(stats.skills.total).toBe(4)
    expect(stats.skills.active).toBe(2)
    expect(stats.skills.stale).toBe(1)
    expect(stats.skills.archived).toBe(1)
    expect(stats.skills.views).toBe(9) // 5+3+1+0
    expect(stats.curator.enabled).toBe(true)
    expect(stats.curator.runCount).toBe(5)
    expect(stats.curator.transitions.staled).toBe(1)
  })

  it('should include candidates stats when enabled', () => {
    vi.mocked(loadUsageData).mockReturnValue({ version: '1.0.0', skills: [], lastUpdated: 0 })

    vi.mocked(loadCandidatesManifest).mockReturnValue({
      version: '1.0.0',
      candidates: [],
      stats: { totalDetected: 10, totalPromoted: 3, totalRejected: 2, createdAt: Date.now() },
    })

    const config: AtlasConfig = {
      athena: {
        enabled: true,
        skills: { enabled: true },
        candidates: { enabled: true },
        curator: { enabled: false },
      },
    } as AtlasConfig

    const stats = buildAthenaStats(config)

    expect(stats.candidates.enabled).toBe(true)
    expect(stats.candidates.detected).toBe(10)
    expect(stats.candidates.promoted).toBe(3)
    expect(stats.candidates.rejected).toBe(2)
  })

  it('handles missing data gracefully', () => {
    vi.mocked(loadUsageData).mockImplementation(() => {
      throw new Error('file not found')
    })

    const config: AtlasConfig = {
      athena: { enabled: true, skills: { enabled: true } },
    } as AtlasConfig

    const stats = buildAthenaStats(config)

    // Should return defaults, not throw
    expect(stats.skills.total).toBe(0)
    expect(stats.curator.enabled).toBe(false)
  })
})

describe('formatAthenaStats', () => {
  it('returns valid JSON string', () => {
    const stats = buildAthenaStats({} as AtlasConfig)
    const formatted = formatAthenaStats(stats)

    expect(() => JSON.parse(formatted)).not.toThrow()
    expect(formatted).toContain('"skills"')
    expect(formatted).toContain('"candidates"')
    expect(formatted).toContain('"curator"')
  })
})

describe('getStatsSummary', () => {
  it('returns one-liner with key metrics', () => {
    const stats = buildAthenaStats({} as AtlasConfig)
    const summary = getStatsSummary(stats)

    expect(summary).toContain('skills:')
    expect(summary).toMatch(/skills:\d+/)
  })

  it('only shows non-zero values', () => {
    const mockUsage = {
      version: '1.0.0',
      skills: [
        { skillId: 's1', skillName: 'Skill 1', lastUsedAt: Date.now(), state: 'active', pinned: false, useCount: 5, stateChangedAt: 0 },
      ],
      lastUpdated: Date.now(),
    }
    vi.mocked(loadUsageData).mockReturnValue(mockUsage as ReturnType<typeof loadUsageData>)

    const config: AtlasConfig = {
      athena: { enabled: true, skills: { enabled: true }, candidates: { enabled: false } },
    } as AtlasConfig

    const stats = buildAthenaStats(config)
    const summary = getStatsSummary(stats)

    expect(summary).toContain('skills:1')
    expect(summary).toContain('active:1')
    expect(summary).not.toContain('stale:')
  })
})