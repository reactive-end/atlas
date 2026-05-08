// Athena Stats module for Phase 5
// Aggregates telemetry from skills, candidates, and curator modules
// Provides unified stats API for observability

import type { AtlasConfig } from '@/config/schema'
import {
  loadCuratorState,
  loadUsageData,
} from './curator'
import { loadCandidatesManifest } from '../candidates/storage'

// ---------------------------------------------------------------------------
// Stats Types
// ---------------------------------------------------------------------------

export interface AthenaStats {
  version: string
  generatedAt: number
  skills: SkillsStats
  candidates: CandidatesStatsSummary
  curator: CuratorStats
}

export interface SkillsStats {
  total: number
  active: number
  stale: number
  archived: number
  // Tracking stats (from usage data)
  views: number
  updates: number
}

export interface CandidatesStatsSummary {
  enabled: boolean
  detected: number
  promoted: number
  rejected: number
}

export interface CuratorStats {
  enabled: boolean
  paused: boolean
  runCount: number
  transitions: {
    staled: number
    archived: number
    reactivated: number
  }
  lastRunAt: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countSkillsByState(
  usageData: ReturnType<typeof loadUsageData>,
): Record<string, number> {
  const counts: Record<string, number> = {
    active: 0,
    stale: 0,
    archived: 0,
  }

  for (const record of usageData.skills) {
    if (record.state in counts) {
      counts[record.state]++
    }
  }

  return counts
}

// ---------------------------------------------------------------------------
// Candidates Stats
// ---------------------------------------------------------------------------

function getCandidatesStats(config: AtlasConfig): CandidatesStatsSummary {
  const raw = config.athena?.candidates

  if (!raw?.enabled) {
    return {
      enabled: false,
      detected: 0,
      promoted: 0,
      rejected: 0,
    }
  }

  // Load from candidates storage
  const manifest = loadCandidatesManifest(raw)

  if (!manifest) {
    return {
      enabled: true,
      detected: 0,
      promoted: 0,
      rejected: 0,
    }
  }

  return {
    enabled: true,
    detected: manifest.stats.totalDetected,
    promoted: manifest.stats.totalPromoted,
    rejected: manifest.stats.totalRejected,
  }
}

// ---------------------------------------------------------------------------
// Stats Builder
// ---------------------------------------------------------------------------

/**
 * Build complete Athena stats JSON.
 * Safe: never throws, always returns valid JSON.
 */
export function buildAthenaStats(config: AtlasConfig): AthenaStats {
  const now = Date.now()

  // Skills stats from usage data
  let skillsStats: SkillsStats = {
    total: 0,
    active: 0,
    stale: 0,
    archived: 0,
    views: 0,
    updates: 0,
  }

  let curatorStats: CuratorStats = {
    enabled: false,
    paused: true,
    runCount: 0,
    transitions: {
      staled: 0,
      archived: 0,
      reactivated: 0,
    },
    lastRunAt: null,
  }

  // Only load if skills are enabled
  if (config.athena?.skills?.enabled) {
    try {
      const usageData = loadUsageData()
      const stateCounts = countSkillsByState(usageData)

      let totalViews = 0
      let totalUpdates = 0
      for (const record of usageData.skills) {
        totalViews += record.useCount
        totalUpdates += record.stateChangedAt > 0 ? 1 : 0
      }

      skillsStats = {
        total: usageData.skills.length,
        active: stateCounts.active,
        stale: stateCounts.stale,
        archived: stateCounts.archived,
        views: totalViews,
        updates: totalUpdates,
      }

      // Curator stats
      try {
        const curatorState = loadCuratorState()
        curatorStats = {
          enabled: true,
          paused: curatorState.paused,
          runCount: curatorState.counters.runCount,
          transitions: {
            staled: curatorState.counters.totalStaled,
            archived: curatorState.counters.totalArchived,
            reactivated: curatorState.counters.totalReactivated,
          },
          lastRunAt: curatorState.lastRunAt,
        }
      } catch {
        // Curator data unavailable - use defaults
      }
    } catch {
      // Skills data unavailable - use defaults
    }
  }

  // Candidates stats
  const candidatesStats = getCandidatesStats(config)

  return {
    version: '1.0.0',
    generatedAt: now,
    skills: skillsStats,
    candidates: candidatesStats,
    curator: curatorStats,
  }
}

/**
 * Format stats as human-readable JSON string.
 */
export function formatAthenaStats(stats: AthenaStats): string {
  return JSON.stringify(stats, null, 2)
}

/**
 * Get stats summary as one-liner for quick status.
 */
export function getStatsSummary(stats: AthenaStats): string {
  const parts: string[] = []

  parts.push(`skills:${stats.skills.total}`)
  if (stats.skills.active > 0) parts.push(`active:${stats.skills.active}`)
  if (stats.skills.stale > 0) parts.push(`stale:${stats.skills.stale}`)

  if (stats.candidates.enabled) {
    parts.push(`candidates:${stats.candidates.detected}`)
    if (stats.candidates.promoted > 0) {
      parts.push(`promoted:${stats.candidates.promoted}`)
    }
  }

  if (stats.curator.enabled) {
    parts.push(`curatorRuns:${stats.curator.runCount}`)
  }

  return parts.join(' ')
}