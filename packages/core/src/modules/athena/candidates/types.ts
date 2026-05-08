// Candidates module types for Athena Phase 3
// Types for skill candidate detection from tool execution patterns

/**
 * Candidate status reflects the lifecycle:
 * - candidate: detected but not yet reviewed
 * - pending: reviewed, awaiting implementation
 * - promoted: converted to an active skill
 * - rejected: dismissed as not useful
 * - expired: too old, auto-removed
 */
export type CandidateStatus = 'candidate' | 'pending' | 'promoted' | 'rejected' | 'expired'

/**
 * Evidence of a potential skill pattern detected from tool execution.
 * Captures the context that led to the candidate detection.
 */
export interface CandidateEvidence {
  /** The tool that generated this evidence */
  tool: string
  /** Why this pattern was flagged (e.g., 'pattern', 'repeated', 'template') */
  reason: CandidateEvidenceReason
  /** Tool arguments at time of detection */
  args?: Record<string, string>
  /** Snippet of output that triggered detection */
  snippet?: string
}

export type CandidateEvidenceReason =
  | 'pattern'
  | 'repeated'
  | 'template'
  | 'heuristic'
  | 'high_complexity'
  | 'low_reuse'

/**
 * A detected skill candidate ready for review.
 */
export interface SkillCandidate {
  /** Unique identifier for this candidate */
  id: string
  /** Human-readable suggested name */
  name: string
  /** Brief description of what this skill would do */
  description: string
  /** Current status in the candidate lifecycle */
  status: CandidateStatus
  /** Evidence that triggered this detection */
  evidence: CandidateEvidence[]
  /** Estimated confidence: 0-100 */
  confidence: number
  /** Suggested tags for categorization */
  tags: string[]
  /** When this candidate was first detected */
  detectedAt: number
  /** Last time this candidate was updated */
  updatedAt: number
  /** Optional proposed implementation hints */
  implementationHints?: string
  /** Session ID where first detected (for context) */
  sessionId?: string
  /** Count of times this pattern appeared */
  occurrenceCount: number
}

/**
 * Candidates manifest - persisted in ~/.athena/candidates.json
 */
export interface CandidatesManifest {
  /** Schema version for migration support */
  version: string
  /** All detected candidates */
  candidates: SkillCandidate[]
  /** Global detection statistics */
  stats: CandidatesStats
}

/**
 * Global statistics for candidates detection.
 */
export interface CandidatesStats {
  /** Total candidates ever detected */
  totalDetected: number
  /** Total promoted to skills */
  totalPromoted: number
  /** Total rejected */
  totalRejected: number
  /** When the candidates.json was first created */
  createdAt: number
  /** Last detection run timestamp */
  lastDetectionAt?: number
}

// CandidatesConfig is defined in @/config/schema to avoid duplication

/**
 * Options for listing candidates.
 */
export interface ListCandidatesOptions {
  /** Filter by status */
  status?: CandidateStatus | 'all'
  /** Filter by tags */
  tags?: string[]
  /** Limit results */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Sort by field */
  sortBy?: 'confidence' | 'detectedAt' | 'occurrenceCount'
  /** Sort direction */
  sortDir?: 'asc' | 'desc'
}

/**
 * Result of a candidates tool operation.
 */
export interface CandidatesToolResult {
  success: boolean
  content: string
  data?: unknown
}