// Candidates storage module for Athena Phase 3
// Handles persistence of skill candidates in ~/.athena/manifest.json

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { CandidatesConfig } from '@/config/schema'
import type {
  CandidatesManifest,
  SkillCandidate,
  ListCandidatesOptions,
  CandidatesStats,
} from './types'

const DEFAULT_ATHENA_QUALNAME = '.athena'
const CANDIDATES_FILE = 'candidates.json'

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

export function getCandidatesBasePath(_config?: CandidatesConfig): string {
  const home = homedir()
  return join(home, DEFAULT_ATHENA_QUALNAME)
}

export function getCandidatesFilePath(_config?: CandidatesConfig): string {
  return join(getCandidatesBasePath(_config), CANDIDATES_FILE)
}

// ---------------------------------------------------------------------------
// Directory initialization
// ---------------------------------------------------------------------------

export function ensureCandidatesDirectory(config?: CandidatesConfig): string {
  const base = getCandidatesBasePath(config)

  if (!existsSync(base)) {
    mkdirSync(base, { recursive: true })
  }

  return base
}

// ---------------------------------------------------------------------------
// Manifest CRUD
// ---------------------------------------------------------------------------

export function loadCandidatesManifest(
  config?: CandidatesConfig,
): CandidatesManifest | null {
  const path = getCandidatesFilePath(config)

  if (!existsSync(path)) {
    return null
  }

  try {
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw) as CandidatesManifest
  } catch {
    return null
  }
}

export function saveCandidatesManifest(
  manifest: CandidatesManifest,
  config?: CandidatesConfig,
): void {
  const path = getCandidatesFilePath(config)
  const dir = getCandidatesBasePath(config)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(path, JSON.stringify(manifest, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// Default manifest factory
// ---------------------------------------------------------------------------

export function createDefaultCandidatesManifest(): CandidatesManifest {
  return {
    version: '1.0.0',
    candidates: [],
    stats: createDefaultStats(),
  }
}

function createDefaultStats(): CandidatesStats {
  return {
    totalDetected: 0,
    totalPromoted: 0,
    totalRejected: 0,
    createdAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Get or create manifest with lazy initialization
// ---------------------------------------------------------------------------

export function getOrCreateCandidatesManifest(
  config?: CandidatesConfig,
): CandidatesManifest {
  const manifest = loadCandidatesManifest(config)

  if (manifest) {
    return manifest
  }

  const newManifest = createDefaultCandidatesManifest()
  saveCandidatesManifest(newManifest, config)
  return newManifest
}

// ---------------------------------------------------------------------------
// Candidate CRUD utilities
// ---------------------------------------------------------------------------

/** Find a candidate by ID. */
export function findCandidateById(
  manifest: CandidatesManifest,
  candidateId: string,
): SkillCandidate | undefined {
  return manifest.candidates.find(c => c.id === candidateId)
}

/** Find candidates by status. */
export function findCandidatesByStatus(
  manifest: CandidatesManifest,
  status: SkillCandidate['status'],
): SkillCandidate[] {
  return manifest.candidates.filter(c => c.status === status)
}

/** Find candidates by tag (case-insensitive). */
export function findCandidatesByTag(
  manifest: CandidatesManifest,
  tag: string,
): SkillCandidate[] {
  const tagLower = tag.toLowerCase()
  return manifest.candidates.filter(c =>
    c.tags.some(t => t.toLowerCase() === tagLower),
  )
}

/** Upsert a candidate. If existing, merge updatedAt. */
export function upsertCandidate(
  manifest: CandidatesManifest,
  candidate: SkillCandidate,
): CandidatesManifest {
  const existingIndex = manifest.candidates.findIndex(c => c.id === candidate.id)

  if (existingIndex >= 0) {
    const updated = [...manifest.candidates]
    updated[existingIndex] = { ...candidate, updatedAt: Date.now() }
    return { ...manifest, candidates: updated }
  }

  return {
    ...manifest,
    candidates: [...manifest.candidates, candidate],
  }
}

/** Update candidate status, update stats accordingly. */
export function updateCandidateStatus(
  manifest: CandidatesManifest,
  candidateId: string,
  newStatus: SkillCandidate['status'],
): CandidatesManifest {
  const candidate = findCandidateById(manifest, candidateId)

  if (!candidate) {
    return manifest
  }

  const updatedCandidate: SkillCandidate = {
    ...candidate,
    status: newStatus,
    updatedAt: Date.now(),
  }

  const updatedCandidates = manifest.candidates.map(c =>
    c.id === candidateId ? updatedCandidate : c,
  )

  const newStats = { ...manifest.stats }

  if (newStatus === 'promoted') {
    newStats.totalPromoted++
  } else if (newStatus === 'rejected') {
    newStats.totalRejected++
  }

  return {
    ...manifest,
    candidates: updatedCandidates,
    stats: newStats,
  }
}

/** Remove candidates older than threshold. */
export function removeExpiredCandidates(
  manifest: CandidatesManifest,
  expireAfterDays: number,
): CandidatesManifest {
  if (expireAfterDays <= 0) {
    return manifest
  }

  const now = Date.now()
  const msPerDay = 86_400_000
  const cutoff = now - expireAfterDays * msPerDay

  return {
    ...manifest,
    candidates: manifest.candidates.filter(c => c.detectedAt >= cutoff),
  }
}

/** Trim to maxCandidates, keeping highest confidence. */
export function enforceMaxCandidates(
  manifest: CandidatesManifest,
  maxCandidates: number,
): CandidatesManifest {
  if (manifest.candidates.length <= maxCandidates) {
    return manifest
  }

  const sorted = [...manifest.candidates].sort(
    (a, b) => b.confidence - a.confidence,
  )

  return {
    ...manifest,
    candidates: sorted.slice(0, maxCandidates),
  }
}

/** Increment totalDetected in stats. */
export function incrementDetectedCount(
  manifest: CandidatesManifest,
  count?: number,
): CandidatesManifest {
  const delta = count ?? 1

  return {
    ...manifest,
    stats: {
      ...manifest.stats,
      totalDetected: manifest.stats.totalDetected + delta,
      lastDetectionAt: Date.now(),
    },
  }
}

// ---------------------------------------------------------------------------
// List filtering and sorting
// ---------------------------------------------------------------------------

export type SortField = 'confidence' | 'detectedAt' | 'occurrenceCount'
export type SortDir = 'asc' | 'desc'

export function sortCandidates(
  candidates: SkillCandidate[],
  field: SortField,
  dir: SortDir,
): SkillCandidate[] {
  return [...candidates].sort((a, b) => {
    let cmp = 0

    switch (field) {
      case 'confidence':
        cmp = a.confidence - b.confidence
        break
      case 'detectedAt':
        cmp = a.detectedAt - b.detectedAt
        break
      case 'occurrenceCount':
        cmp = a.occurrenceCount - b.occurrenceCount
        break
    }

    return dir === 'asc' ? cmp : -cmp
  })
}

export function filterCandidatesByOptions(
  manifest: CandidatesManifest,
  options: ListCandidatesOptions,
): SkillCandidate[] {
  let candidates = [...manifest.candidates]

  if (options.status && options.status !== 'all') {
    candidates = candidates.filter(c => c.status === options.status)
  }

  if (options.tags && options.tags.length > 0) {
    const tagsLower = options.tags.map(t => t.toLowerCase())
    candidates = candidates.filter(c =>
      c.tags.some(t => tagsLower.includes(t.toLowerCase())),
    )
  }

  const field = options.sortBy ?? 'confidence'
  const dir = options.sortDir ?? 'desc'
  candidates = sortCandidates(candidates, field, dir)

  if (options.offset) {
    candidates = candidates.slice(options.offset)
  }

  if (options.limit) {
    candidates = candidates.slice(0, options.limit)
  }

  return candidates
}

// ---------------------------------------------------------------------------
// Session tool-call tracking (in-memory)
// ---------------------------------------------------------------------------

/** Lightweight per-session tool call counter for detection triggering. */
const sessionToolCallCounts = new Map<string, number>()

export function getSessionToolCallCount(sessionId: string): number {
  return sessionToolCallCounts.get(sessionId) ?? 0
}

export function incrementSessionToolCallCount(sessionId: string): number {
  const current = getSessionToolCallCount(sessionId)
  const next = current + 1
  sessionToolCallCounts.set(sessionId, next)
  return next
}

export function resetSessionToolCallCount(sessionId: string): void {
  sessionToolCallCounts.delete(sessionId)
}