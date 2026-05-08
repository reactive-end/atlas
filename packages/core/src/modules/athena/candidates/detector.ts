// Candidates detector for Athena Phase 3
// Detects potential skill candidates from tool execution patterns
// Lightweight, non-blocking, safe - failures do not break the main tool flow
import type {
  SkillCandidate,
  CandidateEvidenceReason,
  CandidatesToolResult,
  ListCandidatesOptions,
} from './types'
import type { AtlasConfig, CandidatesConfig } from '@/config/schema'
import {
  getOrCreateCandidatesManifest,
  saveCandidatesManifest,
  upsertCandidate,
  removeExpiredCandidates,
  enforceMaxCandidates,
  incrementDetectedCount,
  getSessionToolCallCount,
  incrementSessionToolCallCount,
  filterCandidatesByOptions,
} from './storage'

// ---------------------------------------------------------------------------
// Heuristics configuration
// ---------------------------------------------------------------------------
const DEFAULT_MIN_TOOL_CALLS = 5
const DEFAULT_MAX_CANDIDATES = 50
const DEFAULT_EXPIRE_AFTER_DAYS = 30
const DEFAULT_MIN_CONFIDENCE = 60

// ---------------------------------------------------------------------------
// Pattern signatures that suggest skill-worthy patterns
// ---------------------------------------------------------------------------

/**
 * Tool patterns that often indicate reusable workflows.
 */
const HIGH_VALUE_TOOLS = new Set([
  'bash',
  'write',
  'edit',
  'glob',
  'grep',
  'read',
  'websearch',
  'codesearch',
])

/**
 * Tool prefixes that are typically one-off and not worth candidate detection.
 */
const LOW_VALUE_PREFIXES = [
  'cd',
  'pwd',
  'ls',
  'clear',
  'echo',
  'exit',
  'help',
  'mkdir',
]

// ---------------------------------------------------------------------------
// Core detection logic
// ---------------------------------------------------------------------------

/**
 * Analyze tool execution output for candidate patterns.
 * Returns candidate objects to add if any patterns are detected.
 * This function is pure - it never throws and never modifies filesystem directly.
 */
export function analyzeToolExecution(
  toolName: string,
  args: Record<string, unknown>,
  output: string,
  sessionId: string,
): SkillCandidate[] {
  const candidates: SkillCandidate[] = []

  // Skip low-value tools
  if (isLowValueTool(toolName)) {
    return candidates
  }

  // Pattern: repeated execution of same tool with similar args (repeated pattern)
  // This requires historical tracking which we simplify by using session count
  const repeatedEvidence = checkRepeatedPattern(
    toolName,
    args,
    output,
    sessionId,
  )
  if (repeatedEvidence) {
    candidates.push(repeatedEvidence)
  }

  // Pattern: complex output suggesting a reusable pattern (heuristic pattern)
  const complexityEvidence = checkComplexOutput(
    toolName,
    args,
    output,
    sessionId,
  )
  if (complexityEvidence) {
    candidates.push(complexityEvidence)
  }

  // Pattern: template-like argument patterns (template pattern)
  const templateEvidence = checkTemplatePattern(
    toolName,
    args,
    output,
    sessionId,
  )
  if (templateEvidence) {
    candidates.push(templateEvidence)
  }

  return candidates
}

/**
 * Skip tools that are rarely worth skill candidates.
 */
function isLowValueTool(toolName: string): boolean {
  const lower = toolName.toLowerCase()
  return LOW_VALUE_PREFIXES.some(prefix => lower === prefix || lower.startsWith(prefix + ' '))
}

/**
 * Detect repeated tool execution patterns.
 * A tool called multiple times in a session suggests a pattern.
 */
function checkRepeatedPattern(
  toolName: string,
  args: Record<string, unknown>,
  _output: string,
  sessionId: string,
): SkillCandidate | null {
  const callCount = getSessionToolCallCount(sessionId)

  // Only flag if tool has been called at least twice (count > 1 because we increment AFTER check)
  if (callCount < 2) {
    return null
  }

  const toolKey = normalizeToolKey(toolName, args)

  // Only flag if args are non-trivial
  if (toolKey.length < 3) {
    return null
  }

  const confidence = Math.min(50 + callCount * 5, 85)

  const candidate: SkillCandidate = {
    id: generateCandidateId(toolName, 'repeated'),
    name: suggestSkillName(toolName, 'repeated'),
    description: generateDescription(toolName, 'repeated', args),
    status: 'candidate',
    evidence: [
      {
        tool: toolName,
        reason: 'repeated',
        args: stringifyArgs(args),
        snippet: `called ${callCount}x in session`,
      },
    ],
    confidence,
    tags: suggestTags(toolName),
    detectedAt: Date.now(),
    updatedAt: Date.now(),
    implementationHints: generateImplementationHint(toolName, args),
    sessionId,
    occurrenceCount: callCount,
  }

  return candidate
}

/**
 * Detect high-complexity operations that might be worth automating.
 * Long outputs from specific tools often indicate complex workflows.
 */
function checkComplexOutput(
  toolName: string,
  args: Record<string, unknown>,
  output: string,
  sessionId: string,
): SkillCandidate | null {
  const toolLower = toolName.toLowerCase()

  // Only flag certain high-value tools
  if (!HIGH_VALUE_TOOLS.has(toolLower)) {
    return null
  }

  const outputLength = output.length
  const argsCount = Object.keys(args).length

  // Heuristic: complex operation = many args + substantial output
  const isComplex = outputLength > 2000 && argsCount >= 2
  const isVeryComplex = outputLength > 5000 && argsCount >= 3

  if (!isComplex) {
    return null
  }

  const confidence = isVeryComplex ? 80 : 65

  const candidate: SkillCandidate = {
    id: generateCandidateId(toolName, 'high_complexity'),
    name: suggestSkillName(toolName, 'high_complexity'),
    description: generateDescription(toolName, 'high_complexity', args),
    status: 'candidate',
    evidence: [
      {
        tool: toolName,
        reason: 'high_complexity',
        args: stringifyArgs(args),
        snippet: output.slice(0, 200),
      },
    ],
    confidence,
    tags: suggestTags(toolName),
    detectedAt: Date.now(),
    updatedAt: Date.now(),
    implementationHints: generateImplementationHint(toolName, args),
    sessionId,
    occurrenceCount: 1,
  }

  return candidate
}

/**
 * Detect template-like argument patterns.
 * Repeated tool calls with common argument structure suggest a pattern.
 */
function checkTemplatePattern(
  toolName: string,
  args: Record<string, unknown>,
  output: string,
  sessionId: string,
): SkillCandidate | null {
  const toolLower = toolName.toLowerCase()

  // Only flag for specific tools known to have template-like usage
  const templateTools = new Set([
    'write',
    'edit',
    'bash',
  ])

  if (!templateTools.has(toolLower)) {
    return null
  }

  const argKeys = Object.keys(args)
  const argValues = argKeys.map(k => String(args[k] ?? ''))

  // Heuristic: template pattern = has string interpolation patterns
  const hasTemplateMarkers = argValues.some(v =>
    v.includes('${') || v.includes('{{') || v.includes('<>'),
  )

  if (!hasTemplateMarkers) {
    return null
  }

  const candidate: SkillCandidate = {
    id: generateCandidateId(toolName, 'template'),
    name: suggestSkillName(toolName, 'template'),
    description: generateDescription(toolName, 'template', args),
    status: 'candidate',
    evidence: [
      {
        tool: toolName,
        reason: 'template',
        args: stringifyArgs(args),
        snippet: output.slice(0, 200),
      },
    ],
    confidence: 70,
    tags: suggestTags(toolName).concat('template'),
    detectedAt: Date.now(),
    updatedAt: Date.now(),
    implementationHints: generateImplementationHint(toolName, args),
    sessionId,
    occurrenceCount: 1,
  }

  return candidate
}

// ---------------------------------------------------------------------------
// Persistence and lifecycle
// ---------------------------------------------------------------------------

/**
 * Record detected candidates, applying lifecycle rules.
 * Safe: wraps all persistence in try/catch to ensure no errors propagate.
 */
export function persistCandidates(
  candidates: SkillCandidate[],
  config: CandidatesConfig,
): void {
  if (candidates.length === 0) {
    return
  }

  try {
    const minConfidence = config.minConfidence ?? DEFAULT_MIN_CONFIDENCE
    const maxCandidates = config.maxCandidates ?? DEFAULT_MAX_CANDIDATES
    const expireAfterDays = config.expireAfterDays ?? DEFAULT_EXPIRE_AFTER_DAYS

    let manifest = getOrCreateCandidatesManifest(config)

    // Filter by minimum confidence
    const qualified = candidates.filter(c => c.confidence >= minConfidence)

    if (qualified.length === 0) {
      return
    }

    // Deduplicate: merge with existing candidates that have same id
    for (const candidate of qualified) {
      manifest = upsertCandidate(manifest, candidate)
    }

    // Update stats
    manifest = incrementDetectedCount(manifest, qualified.length)

    // Apply lifecycle: expire old candidates
    manifest = removeExpiredCandidates(manifest, expireAfterDays)

    // Apply lifecycle: enforce max count
    manifest = enforceMaxCandidates(manifest, maxCandidates)

    saveCandidatesManifest(manifest, config)
  } catch {
    // Safe: detection failure does not break tool flow
  }
}

/**
 * Increment tool call count after a tool executes.
 * Called AFTER analyzeToolExecution to get the call count BEFORE increment.
 * Returns the new count.
 */
export function recordToolExecution(sessionId: string): number {
  return incrementSessionToolCallCount(sessionId)
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

/**
 * List candidates with filtering and sorting.
 */
export function handleListCandidates(
  options: ListCandidatesOptions,
  config: CandidatesConfig,
): CandidatesToolResult {
  try {
    const manifest = getOrCreateCandidatesManifest(config)
    const filtered = filterCandidatesByOptions(manifest, options)

    if (filtered.length === 0) {
      return {
        success: true,
        content: 'No skill candidates detected yet.',
        data: { candidates: [], total: 0, stats: manifest.stats },
      }
    }

    const total = filtered.length
    const limit = options.limit ?? 20
    const shown = filtered.slice(0, limit)

    const lines = shown.map(c => {
      const age = getAgeString(c.detectedAt)
      return `  [${c.status}] ${c.id} (${c.confidence}%) ${c.name} - ${c.description} (${age})`
    })

    return {
      success: true,
      content: [
        `Skill Candidates (${total} total, showing ${Math.min(limit, shown.length)})`,
        ...lines,
        '',
        `Stats: ${manifest.stats.totalDetected} detected | ${manifest.stats.totalPromoted} promoted | ${manifest.stats.totalRejected} rejected`,
      ].join('\n'),
      data: { candidates: shown, total, stats: manifest.stats },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      content: `Failed to list candidates: ${msg}`,
    }
  }
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Normalize tool key for deduplication.
 * Strips specific values to group similar patterns.
 */
function normalizeToolKey(toolName: string, args: Record<string, unknown>): string {
  const parts = [toolName]
  const entries = Object.entries(args)

  for (const [key, value] of entries) {
    // Include key names as-is
    parts.push(key)

    // Include truncated value to detect pattern similarity
    const str = String(value)
    if (str.length <= 50) {
      parts.push(str)
    }
  }

  return parts.join('|')
}

function generateCandidateId(
  toolName: string,
  reason: CandidateEvidenceReason,
): string {
  const ts = Date.now().toString(36)
  const hash = simpleHash(toolName + reason + ts).toString(36)
  return `${toolName.replace(/[^a-z0-9]/gi, '_')}_${reason}_${hash}`.slice(0, 60)
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function suggestSkillName(
  toolName: string,
  reason: CandidateEvidenceReason,
): string {
  const mapping: Record<CandidateEvidenceReason, string> = {
    repeated: `repeated_${toolName}`,
    pattern: `pattern_${toolName}`,
    template: `template_${toolName}`,
    heuristic: `auto_${toolName}`,
    high_complexity: `complex_${toolName}`,
    low_reuse: `unused_${toolName}`,
  }

  return mapping[reason] ?? `skill_${toolName}`
}

function generateDescription(
  _toolName: string,
  reason: CandidateEvidenceReason,
  args: Record<string, unknown>,
): string {
  const reasonLabels: Record<CandidateEvidenceReason, string> = {
    repeated: 'Detected repeated execution of this tool, suggesting a reusable pattern',
    pattern: 'Tool execution matches a known skill pattern',
    template: 'Detected template-like arguments suggesting a pattern for bulk operations',
    heuristic: 'High complexity operation detected that could be worth automating',
    high_complexity: 'Complex multi-argument tool execution detected',
    low_reuse: 'Tool rarely reused - candidate for potential automation',
  }

  const base = reasonLabels[reason] ?? 'Tool execution pattern detected'

  const argsKeys = Object.keys(args)
  if (argsKeys.length > 0) {
    return `${base}. Args: ${argsKeys.slice(0, 3).join(', ')}`
  }

  return base
}

function generateImplementationHint(
  toolName: string,
  args: Record<string, unknown>,
): string {
  const argsKeys = Object.keys(args)
  const hints = [
    `Tool: ${toolName}`,
    `Parameters: ${argsKeys.map(k => `${k}: ${typeof args[k]}`).join(', ')}`,
  ]

  return hints.join('\n')
}

function suggestTags(toolName: string): string[] {
  const lower = toolName.toLowerCase()

  if (HIGH_VALUE_TOOLS.has(lower)) {
    return [lower, 'automation']
  }

  return [lower]
}

function stringifyArgs(
  args: Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(args)) {
    result[key] = String(value).slice(0, 200)
  }

  return result
}

function getAgeString(detectedAt: number): string {
  const ageMs = Date.now() - detectedAt
  const ageHours = Math.floor(ageMs / 3_600_000)

  if (ageHours < 1) {
    return 'just now'
  }
  if (ageHours < 24) {
    return `${ageHours}h ago`
  }

  const ageDays = Math.floor(ageHours / 24)
  return `${ageDays}d ago`
}

/**
 * Get candidates config from AtlasConfig.
 */
export function getCandidatesConfig(config: AtlasConfig): CandidatesConfig {
  const raw = config.athena?.candidates

  if (!raw) {
    return { enabled: false }
  }

  return {
    enabled: raw.enabled ?? false,
    minToolCalls: raw.minToolCalls ?? DEFAULT_MIN_TOOL_CALLS,
    maxCandidates: raw.maxCandidates ?? DEFAULT_MAX_CANDIDATES,
    expireAfterDays: raw.expireAfterDays ?? DEFAULT_EXPIRE_AFTER_DAYS,
    minConfidence: raw.minConfidence ?? DEFAULT_MIN_CONFIDENCE,
  }
}

/**
 * Check if candidates detection is enabled.
 */
export function isCandidatesEnabled(config: CandidatesConfig): boolean {
  return config.enabled === true
}