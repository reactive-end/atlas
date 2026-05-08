import { vaultSearch, vaultTimeline, vaultGetObservation, vaultSaveMemory } from '@/modules/vault/client'
import { ensureSession } from '@/modules/vault/session-manager'
import { stripPrivateTags } from '@/modules/vault/memory-protocol'

export interface MemToolResult {
  content: string
  isError: boolean
}

export function handleMemSearch(
  query: string,
  limit: number,
  stripPrivate: boolean,
): MemToolResult {
  const result = vaultSearch(query, limit)

  if (!result.success) {
    return { content: `mem_search error: ${result.error}`, isError: true }
  }

  if (result.data.length === 0) {
    return { content: 'No memories found for query.', isError: false }
  }

  const formatted = result.data.map(r => {
    const text = stripPrivate ? stripPrivateTags(r.content) : r.content
    return `[${r.id}] (${r.createdAt}) ${text}`
  }).join('\n')

  return { content: formatted, isError: false }
}

export function handleMemTimeline(
  sessionId: string,
  limit: number,
): MemToolResult {
  const result = vaultTimeline(sessionId, limit)

  if (!result.success) {
    return { content: `mem_timeline error: ${result.error}`, isError: true }
  }

  if (result.data.length === 0) {
    return { content: 'No timeline entries for this session.', isError: false }
  }

  const formatted = result.data.map(e =>
    `[${e.timestamp}] (${e.type}) ${e.content}`,
  ).join('\n')

  return { content: formatted, isError: false }
}

export function handleMemGetObservation(
  observationId: string,
): MemToolResult {
  const result = vaultGetObservation(observationId)

  if (!result.success) {
    return { content: `mem_get_observation error: ${result.error}`, isError: true }
  }

  return {
    content: [
      `ID: ${result.data.id}`,
      `Category: ${result.data.category}`,
      `Session: ${result.data.sessionId}`,
      `Created: ${result.data.createdAt}`,
      `Content: ${result.data.content}`,
    ].join('\n'),
    isError: false,
  }
}

export function handleMemSave(
  sessionId: string,
  content: string,
  category: string,
  stripPrivate: boolean,
): MemToolResult {
  if (!ensureSession(sessionId)) {
    return { content: 'mem_save error: Failed to ensure session exists', isError: true }
  }

  const sanitized = stripPrivate ? stripPrivateTags(content) : content

  const result = vaultSaveMemory(sessionId, sanitized, category)

  if (!result.success) {
    return { content: `mem_save error: ${result.error}`, isError: true }
  }

  return {
    content: `Saved memory ${result.data.id} [${category}] "${result.data.title}"`,
    isError: false,
  }
}
