// Skills Curator module for Athena Phase 4
// Manages skill lifecycle: active -> stale -> archived based on inactivity
// Persisted in ~/.athena/curator-state.json and ~/.athena/usage.json

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// ---------------------------------------------------------------------------
// Internal Types
// ---------------------------------------------------------------------------

type LifecycleStatus = 'active' | 'stale' | 'archived'

interface SkillUsageRecord {
  skillId: string
  skillName: string
  lastUsedAt: number
  state: LifecycleStatus
  pinned: boolean
  useCount: number
  stateChangedAt: number
}

interface CuratorState {
  version: string
  paused: boolean
  lastRunAt: number | null
  counters: {
    totalStaled: number
    totalArchived: number
    totalReactivated: number
    runCount: number
  }
}

interface UsageData {
  version: string
  skills: SkillUsageRecord[]
  lastUpdated: number
}

interface CuratorConfig {
  enabled: boolean
  staleAfterDays: number
  archiveAfterDays: number
}

// ---------------------------------------------------------------------------
// Test override - must be set before any operations
// ---------------------------------------------------------------------------

let testOverridePath: string | null = null

export function setTestOverridePath(path: string | null): void {
  testOverridePath = path
}

export function getTestOverridePath(): string | null {
  return testOverridePath
}

// Re-export internal state loaders for stats module
export { loadCuratorState, loadUsageData }

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const CURATOR_DIR = '.athena'

function getAthenaBasePath(): string {
  if (testOverridePath) {
    return testOverridePath
  }
  return join(homedir(), CURATOR_DIR)
}

function getCuratorStatePath(): string {
  return join(getAthenaBasePath(), 'curator-state.json')
}

function getUsagePath(): string {
  return join(getAthenaBasePath(), 'usage.json')
}

// ---------------------------------------------------------------------------
// Directory initialization
// ---------------------------------------------------------------------------

function ensureAthenaDirectory(): void {
  const base = getAthenaBasePath()
  if (!existsSync(base)) {
    mkdirSync(base, { recursive: true })
  }
}

// ---------------------------------------------------------------------------
// Curator State persistence
// ---------------------------------------------------------------------------

function loadCuratorState(): CuratorState {
  const path = getCuratorStatePath()

  if (!existsSync(path)) {
    return createDefaultCuratorState()
  }

  try {
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw) as CuratorState
  } catch {
    return createDefaultCuratorState()
  }
}

function saveCuratorState(state: CuratorState): void {
  ensureAthenaDirectory()
  writeFileSync(getCuratorStatePath(), JSON.stringify(state, null, 2), 'utf-8')
}

function createDefaultCuratorState(): CuratorState {
  return {
    version: '1.0.0',
    paused: false,
    lastRunAt: null,
    counters: {
      totalStaled: 0,
      totalArchived: 0,
      totalReactivated: 0,
      runCount: 0,
    },
  }
}

// ---------------------------------------------------------------------------
// Usage persistence
// ---------------------------------------------------------------------------

function loadUsageData(): UsageData {
  const path = getUsagePath()

  if (!existsSync(path)) {
    return createDefaultUsageData()
  }

  try {
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw) as UsageData
  } catch {
    return createDefaultUsageData()
  }
}

function saveUsageData(data: UsageData): void {
  ensureAthenaDirectory()
  writeFileSync(getUsagePath(), JSON.stringify(data, null, 2), 'utf-8')
}

function createDefaultUsageData(): UsageData {
  return {
    version: '1.0.0',
    skills: [],
    lastUpdated: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000

function getDefaultConfig(): Required<CuratorConfig> {
  return {
    enabled: true,
    staleAfterDays: 30,
    archiveAfterDays: 90,
  }
}

function findSkillRecord(
  data: UsageData,
  skillId: string,
): SkillUsageRecord | undefined {
  return data.skills.find(s => s.skillId === skillId)
}

function updateSkillRecord(
  data: UsageData,
  skillId: string,
  updates: Partial<SkillUsageRecord>,
): UsageData {
  const index = data.skills.findIndex(s => s.skillId === skillId)

  if (index >= 0) {
    const updated = [...data.skills]
    updated[index] = { ...updated[index], ...updates }
    return { ...data, skills: updated, lastUpdated: Date.now() }
  }

  return data
}

function countByState(data: UsageData): Record<LifecycleStatus, number> {
  const counts: Record<LifecycleStatus, number> = {
    active: 0,
    stale: 0,
    archived: 0,
  }

  for (const record of data.skills) {
    if (record.state in counts) {
      counts[record.state]++
    }
  }

  return counts
}

// ---------------------------------------------------------------------------
// State transition logic
// ---------------------------------------------------------------------------

function evaluateTransition(
  record: SkillUsageRecord,
  config: Required<CuratorConfig>,
  now: number,
): LifecycleStatus | null {
  // Pinned skills never auto-transition
  if (record.pinned) {
    return null
  }

  const ageMs = now - record.lastUsedAt
  const ageDays = ageMs / MS_PER_DAY

  if (record.state === 'active') {
    if (config.staleAfterDays > 0 && ageDays >= config.staleAfterDays) {
      return 'stale'
    }
  } else if (record.state === 'stale') {
    if (config.archiveAfterDays > 0 && ageDays >= config.archiveAfterDays) {
      return 'archived'
    }
  }

  return null
}

function buildTransitionReason(
  from: LifecycleStatus,
  to: LifecycleStatus,
  lastUsedAt: number,
  now: number,
): string {
  const ageDays = Math.floor((now - lastUsedAt) / MS_PER_DAY)

  if (from === 'active' && to === 'stale') {
    return `Inactive for ${ageDays} days`
  }
  if (from === 'stale' && to === 'archived') {
    return `Stale for ${ageDays} days`
  }
  return `${from} -> ${to}`
}

interface TransitionChange {
  skillId: string
  skillName: string
  fromState: LifecycleStatus
  toState: LifecycleStatus
  reason: string
  timestamp: number
}

// ---------------------------------------------------------------------------
// Exported Functions
// ---------------------------------------------------------------------------

export interface CuratorRunResult {
  success: boolean
  content: string
  changes?: TransitionChange[]
  data?: {
    skillsEvaluated: number
    transitions: number
    pinnedSkipped: number
    runCount: number
  }
}

/**
 * Run curator - evaluate all skills and apply state transitions.
 */
export function runCurator(
  config?: Partial<CuratorConfig>,
  _dryRun?: boolean,
): CuratorRunResult {
  const fullConfig = { ...getDefaultConfig(), ...config }
  const now = Date.now()

  // Load state
  const curatorState = loadCuratorState()

  if (curatorState.paused) {
    return {
      success: false,
      content: 'Curator is paused. Use setCuratorPaused(false) to resume.',
    }
  }

  if (!fullConfig.enabled) {
    return {
      success: false,
      content: 'Curator is not enabled in configuration.',
    }
  }

  const usageData = loadUsageData()
  const changes: TransitionChange[] = []
  let pinnedSkipped = 0

  // Evaluate each skill
  for (const record of usageData.skills) {
    if (record.pinned) {
      pinnedSkipped++
      continue
    }

    const nextState = evaluateTransition(record, fullConfig, now)

    if (nextState && nextState !== record.state) {
      const reason = buildTransitionReason(record.state, nextState, record.lastUsedAt, now)
      changes.push({
        skillId: record.skillId,
        skillName: record.skillName,
        fromState: record.state,
        toState: nextState,
        reason,
        timestamp: now,
      })
    }
  }

  // Apply changes
  let updatedUsage = usageData
  const newCounters = { ...curatorState.counters }

  for (const change of changes) {
    const record = findSkillRecord(updatedUsage, change.skillId)

    if (record) {
      updatedUsage = updateSkillRecord(updatedUsage, change.skillId, {
        state: change.toState,
        stateChangedAt: change.timestamp,
      })

      if (change.toState === 'stale') {
        newCounters.totalStaled++
      } else if (change.toState === 'archived') {
        newCounters.totalArchived++
      } else if (change.toState === 'active' && change.fromState === 'stale') {
        newCounters.totalReactivated++
      }
    }
  }

  const newRunCount = newCounters.runCount + 1

  // Persist changes
  const updatedCuratorState: CuratorState = {
    ...curatorState,
    lastRunAt: now,
    counters: { ...newCounters, runCount: newRunCount },
  }

  saveCuratorState(updatedCuratorState)
  saveUsageData(updatedUsage)

  // Format result
  let content: string

  if (changes.length === 0) {
    content = `Curator run #${newRunCount}: no transitions needed (${usageData.skills.length} skills evaluated).`
  } else {
    content = [
      `Curator run #${newRunCount}: applied ${changes.length} transition${changes.length === 1 ? '' : 's'}`,
      ...changes.map(c => `  ${c.skillName}: ${c.fromState} -> ${c.toState} (${c.reason})`),
    ].join('\n')
  }

  return {
    success: true,
    content,
    changes,
    data: {
      skillsEvaluated: usageData.skills.length,
      transitions: changes.length,
      pinnedSkipped,
      runCount: newRunCount,
    },
  }
}

export interface CuratorStatusResult {
  success: boolean
  content: string
  data?: {
    paused: boolean
    stateCount: Record<LifecycleStatus, number>
    counters: CuratorState['counters']
    lastRunAt: number | null
  }
}

/**
 * Get curator status - returns current state and statistics.
 */
export function getCuratorStatus(): CuratorStatusResult {
  const curatorState = loadCuratorState()
  const usageData = loadUsageData()
  const counts = countByState(usageData)

  const content = [
    'Curator Status',
    '==============',
    '',
    `Paused: ${curatorState.paused ? 'Yes' : 'No'}`,
    `Skills: ${counts.active} active | ${counts.stale} stale | ${counts.archived} archived`,
    '',
    `Total transitions: staled=${curatorState.counters.totalStaled} | archived=${curatorState.counters.totalArchived} | reactivated=${curatorState.counters.totalReactivated}`,
    `Runs: ${curatorState.counters.runCount}`,
    curatorState.lastRunAt
      ? `Last run: ${new Date(curatorState.lastRunAt).toISOString()}`
      : 'No runs yet',
  ].join('\n')

  return {
    success: true,
    content,
    data: {
      paused: curatorState.paused,
      stateCount: counts,
      counters: curatorState.counters,
      lastRunAt: curatorState.lastRunAt,
    },
  }
}

/**
 * Set curator paused state.
 * @param paused - true to pause, false to resume
 */
export function setCuratorPaused(paused: boolean): CuratorStatusResult {
  const curatorState = loadCuratorState()
  const updatedState = { ...curatorState, paused }
  saveCuratorState(updatedState)

  return getCuratorStatus()
}

/**
 * Touch a skill - ensure it exists in usage tracking and update lastUsedAt.
 */
export function touchSkill(skillId: string, skillName: string): void {
  const usageData = loadUsageData()
  const now = Date.now()

  const existing = findSkillRecord(usageData, skillId)

  if (existing) {
    const updated = updateSkillRecord(usageData, skillId, {
      lastUsedAt: now,
      useCount: existing.useCount + 1,
    })
    saveUsageData(updated)
  } else {
    const newRecord: SkillUsageRecord = {
      skillId,
      skillName,
      lastUsedAt: now,
      state: 'active',
      pinned: false,
      useCount: 1,
      stateChangedAt: now,
    }

    const updated = {
      ...usageData,
      skills: [...usageData.skills, newRecord],
      lastUpdated: now,
    }
    saveUsageData(updated)
  }
}

/**
 * Toggle pinned state for a skill.
 */
export function togglePinned(skillId: string): boolean {
  const usageData = loadUsageData()
  const record = findSkillRecord(usageData, skillId)

  if (!record) {
    return false
  }

  const updated = updateSkillRecord(usageData, skillId, {
    pinned: !record.pinned,
    stateChangedAt: Date.now(),
  })

  saveUsageData(updated)
  return !record.pinned
}

/**
 * Check if curator is paused.
 */
export function isCuratorPaused(): boolean {
  return loadCuratorState().paused
}

// ---------------------------------------------------------------------------
// Review System (Phase 4 Advanced - Consolidation Analysis)
// ---------------------------------------------------------------------------

const REVIEW_FILE = 'curator-review.json'

interface SimilaritySuggestion {
  type: 'duplicate' | 'similar'
  skillId1: string
  skillName1: string
  skillId2: string
  skillName2: string
  reason: string
  similarityScore: number
}

interface ObsoleteSuggestion {
  skillId: string
  skillName: string
  reason: string
  daysSinceLastUse: number
  state: LifecycleStatus
  useCount: number
}

export interface CuratorReviewReport {
  version: string
  generatedAt: number
  totalSkills: number
  duplicates: SimilaritySuggestion[]
  similar: SimilaritySuggestion[]
  potentiallyObsolete: ObsoleteSuggestion[]
  summary: {
    duplicateCount: number
    similarCount: number
    obsoleteCount: number
  }
}

function getReviewPath(): string {
  return join(getAthenaBasePath(), REVIEW_FILE)
}

/**
 * Calculate similarity score between two skill names (0-1).
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = name1.toLowerCase().trim()
  const n2 = name2.toLowerCase().trim()

  if (n1 === n2) return 1.0
  if (n1.includes(n2) || n2.includes(n1)) return 0.8

  // Simple Levenshtein-like ratio
  const longer = n1.length > n2.length ? n1 : n2

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(n1, n2)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length
  const n = s2.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Check if skill is potentially obsolete.
 * Criteria: archived OR stale with low use count and old last use
 * Note: Pinned skills are never considered obsolete
 */
function isPotentiallyObsolete(record: SkillUsageRecord, now: number): ObsoleteSuggestion | null {
  // Pinned skills are never considered obsolete
  if (record.pinned) {
    return null
  }

  const ageMs = now - record.lastUsedAt
  const ageDays = Math.floor(ageMs / MS_PER_DAY)

  // Criteria: archived skills OR stale skills with <5 uses and >60 days old
  const isArchived = record.state === 'archived'
  const isStaleAndOld = record.state === 'stale' && record.useCount < 5 && ageDays > 60

  if (!isArchived && !isStaleAndOld) return null

  let reason = ''
  if (isArchived) {
    reason = `Archived skill with ${ageDays} days since last use`
  } else {
    reason = `Stale with only ${record.useCount} uses and ${ageDays} days inactive`
  }

  return {
    skillId: record.skillId,
    skillName: record.skillName,
    reason,
    daysSinceLastUse: ageDays,
    state: record.state,
    useCount: record.useCount,
  }
}

/**
 * Generate curator review report - analyzes skills for duplicates and obsoletes.
 */
export function generateCuratorReview(): CuratorReviewReport {
  const now = Date.now()

  try {
    const usageData = loadUsageData()
    const skills = usageData.skills

    const duplicates: SimilaritySuggestion[] = []
    const similar: SimilaritySuggestion[] = []
    const potentiallyObsolete: ObsoleteSuggestion[] = []

    // Check for duplicates/similarity
    for (let i = 0; i < skills.length; i++) {
      for (let j = i + 1; j < skills.length; j++) {
        const skill1 = skills[i]
        const skill2 = skills[j]

        const nameSim = calculateNameSimilarity(skill1.skillName, skill2.skillName)

        if (nameSim >= 0.9) {
          duplicates.push({
            type: 'duplicate',
            skillId1: skill1.skillId,
            skillName1: skill1.skillName,
            skillId2: skill2.skillId,
            skillName2: skill2.skillName,
            reason: `Names are nearly identical (${Math.round(nameSim * 100)}% similar)`,
            similarityScore: nameSim,
          })
        } else if (nameSim >= 0.6) {
          similar.push({
            type: 'similar',
            skillId1: skill1.skillId,
            skillName1: skill1.skillName,
            skillId2: skill2.skillId,
            skillName2: skill2.skillName,
            reason: `Names are similar (${Math.round(nameSim * 100)}% similar)`,
            similarityScore: nameSim,
          })
        }
      }
    }

    // Check for potentially obsolete
    for (const skill of skills) {
      const obsolete = isPotentiallyObsolete(skill, now)
      if (obsolete) {
        potentiallyObsolete.push(obsolete)
      }
    }

    const report: CuratorReviewReport = {
      version: '1.0.0',
      generatedAt: now,
      totalSkills: skills.length,
      duplicates,
      similar,
      potentiallyObsolete,
      summary: {
        duplicateCount: duplicates.length,
        similarCount: similar.length,
        obsoleteCount: potentiallyObsolete.length,
      },
    }

    return report
  } catch {
    // Return empty report on error
    return {
      version: '1.0.0',
      generatedAt: now,
      totalSkills: 0,
      duplicates: [],
      similar: [],
      potentiallyObsolete: [],
      summary: {
        duplicateCount: 0,
        similarCount: 0,
        obsoleteCount: 0,
      },
    }
  }
}

/**
 * Save curator review report to disk.
 */
function saveCuratorReview(report: CuratorReviewReport): void {
  try {
    ensureAthenaDirectory()
    writeFileSync(getReviewPath(), JSON.stringify(report, null, 2), 'utf-8')
  } catch {
    // Best-effort: ignore write failures
  }
}

/**
 * Load last saved curator review report.
 */
export function loadCuratorReview(): CuratorReviewReport | null {
  const path = getReviewPath()

  if (!existsSync(path)) {
    return null
  }

  try {
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw) as CuratorReviewReport
  } catch {
    return null
  }
}

export interface CuratorReviewResult {
  success: boolean
  content: string
  data?: CuratorReviewReport
}

/**
 * Run curator review - generates and persists analysis report.
 */
export function runCuratorReview(): CuratorReviewResult {
  try {
    const report = generateCuratorReview()
    saveCuratorReview(report)

    const lines: string[] = [
      'Curator Review Report',
      '===================',
      '',
      `Total skills analyzed: ${report.totalSkills}`,
      '',
    ]

    if (report.summary.duplicateCount > 0) {
      lines.push(`Found ${report.summary.duplicateCount} potential duplicate(s):`)
      for (const dup of report.duplicates) {
        lines.push(`  - "${dup.skillName1}" (~) "${dup.skillName2}"`)
      }
      lines.push('')
    }

    if (report.summary.similarCount > 0) {
      lines.push(`Found ${report.summary.similarCount} similar skill(s):`)
      for (const sim of report.similar) {
        lines.push(`  - "${sim.skillName1}" ~ "${sim.skillName2}": ${sim.reason}`)
      }
      lines.push('')
    }

    if (report.summary.obsoleteCount > 0) {
      lines.push(`Found ${report.summary.obsoleteCount} potentially obsolete skill(s):`)
      for (const obs of report.potentiallyObsolete) {
        lines.push(`  - "${obs.skillName}" [${obs.state}]: ${obs.reason}`)
      }
      lines.push('')
    }

    if (report.summary.duplicateCount === 0 && report.summary.similarCount === 0 && report.summary.obsoleteCount === 0) {
      lines.push('No issues found. Skills are well organized.')
    }

    lines.push(`Generated: ${new Date(report.generatedAt).toISOString()}`)

    return {
      success: true,
      content: lines.join('\n'),
      data: report,
    }
  } catch (e) {
    return {
      success: false,
      content: `Review failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
    }
  }
}