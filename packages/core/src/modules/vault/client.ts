import { createHash } from 'node:crypto'
import { openDatabase } from '@/modules/vault/database'

export interface VaultResponse<T> {
  success: boolean
  data: T
  error?: string
}

export interface SearchResult {
  id: string
  content: string
  score: number
  createdAt: string
}

export interface Observation {
  id: string
  content: string
  category: string
  createdAt: string
  sessionId: string
}

export interface TimelineEntry {
  id: string
  content: string
  timestamp: string
  type: string
}

function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function wrapResult<T>(fn: () => T): VaultResponse<T> {
  try {
    const data = fn()
    return { success: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, data: null as T, error: message }
  }
}

export function vaultSearch(
  query: string,
  limit = 10,
): VaultResponse<SearchResult[]> {
  return wrapResult(() => {
    const db = openDatabase()

    interface FtsRow {
      id: number
      chunk_text: string
      rank: number
      created_at: string
    }

    const rows = db.prepare<FtsRow>(`
      SELECT mc.id, mc.chunk_text, f.rank, mc.created_at
      FROM vault_fts f
      JOIN vault_memory_chunks mc ON mc.id = f.rowid
      JOIN vault_memories m ON m.id = mc.memory_id
      WHERE vault_fts MATCH ?
        AND m.is_archived = 0
      ORDER BY f.rank
      LIMIT ?
    `).all(query, limit)

    return rows.map(r => ({
      id: String(r.id),
      content: r.chunk_text,
      score: Math.abs(r.rank),
      createdAt: r.created_at,
    }))
  })
}

export function vaultTimeline(
  sessionId: string,
  limit = 20,
): VaultResponse<TimelineEntry[]> {
  return wrapResult(() => {
    const db = openDatabase()

    interface ObsRow {
      id: number
      sanitized_content: string
      created_at: string
      source_type: string
    }

    const rows = db.prepare<ObsRow>(`
      SELECT id, sanitized_content, created_at, source_type
      FROM vault_observations
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(sessionId, limit)

    return rows.map(r => ({
      id: String(r.id),
      content: r.sanitized_content,
      timestamp: r.created_at,
      type: r.source_type,
    }))
  })
}

export function vaultGetObservation(
  observationId: string,
): VaultResponse<Observation> {
  return wrapResult(() => {
    const db = openDatabase()

    interface ObsRow {
      id: number
      sanitized_content: string
      category: string
      created_at: string
      session_id: string
    }

    const row = db.prepare<ObsRow>(`
      SELECT id, sanitized_content, category, created_at, session_id
      FROM vault_observations
      WHERE id = ?
    `).get(Number(observationId))

    if (!row) {
      throw new Error(`Observation ${observationId} not found`)
    }

    return {
      id: String(row.id),
      content: row.sanitized_content,
      category: row.category,
      createdAt: row.created_at,
      sessionId: row.session_id,
    }
  })
}

export function vaultSaveObservation(
  sessionId: string,
  content: string,
  category: string,
): VaultResponse<Observation> {
  return wrapResult(() => {
    const db = openDatabase()
    const hash = contentHash(content)
    const tokens = estimateTokens(content)

    const result = db.prepare(`
      INSERT INTO vault_observations
        (session_id, source_type, category, raw_content, sanitized_content, content_hash, token_estimate)
      VALUES (?, 'plugin', ?, ?, ?, ?, ?)
    `).run(sessionId, category, content, content, hash, tokens)

    return {
      id: String(result.lastInsertRowid),
      content,
      category,
      createdAt: new Date().toISOString(),
      sessionId,
    }
  })
}

export function vaultCreateSession(
  sessionId: string,
): VaultResponse<{ id: string }> {
  return wrapResult(() => {
    const db = openDatabase()

    db.prepare(`
      INSERT OR IGNORE INTO vault_sessions (session_id)
      VALUES (?)
    `).run(sessionId)

    db.prepare(`
      UPDATE vault_sessions
      SET last_accessed_at = datetime('now'), status = 'active'
      WHERE session_id = ?
    `).run(sessionId)

    return { id: sessionId }
  })
}

export function vaultDeleteSession(
  sessionId: string,
): VaultResponse<{ deleted: boolean }> {
  return wrapResult(() => {
    const db = openDatabase()

    const result = db.prepare(`
      UPDATE vault_sessions
      SET status = 'closed', updated_at = datetime('now')
      WHERE session_id = ?
    `).run(sessionId)

    return { deleted: result.changes > 0 }
  })
}

export function vaultHealthCheck(): boolean {
  try {
    openDatabase()
    return true
  } catch {
    return false
  }
}
