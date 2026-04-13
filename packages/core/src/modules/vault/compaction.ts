import type { VaultConfig } from '@/config/schema'
import type { CompactingContext } from '@/types'
import { vaultSaveObservation, vaultSearch } from '@/modules/vault/client'
import { stripPrivateTags } from '@/modules/vault/memory-protocol'
import { ensureSession } from '@/modules/vault/session-manager'

const COMPACTION_INSTRUCTION = `\n\n[Vault Compaction Note]
Previous context has been saved to persistent memory.
After compaction, use mem_search to recover relevant context.
Key decisions and progress from this session are preserved.`

function saveCompactionCheckpoint(
  config: VaultConfig,
  sessionId: string,
  summary: string,
): void {
  const sanitized = config.stripPrivateTags
    ? stripPrivateTags(summary)
    : summary

  ensureSession(sessionId)
  vaultSaveObservation(sessionId, sanitized, 'compaction-checkpoint')
}

function fetchPreviousContext(
  sessionId: string,
): string {
  const results = vaultSearch(`session:${sessionId}`, 5)

  if (!results.success || results.data.length === 0) {
    return ''
  }

  const contextLines = results.data.map(r => `- ${r.content}`)
  return `\n[Previous Context from Vault]\n${contextLines.join('\n')}`
}

export function handleCompaction(
  ctx: CompactingContext,
  config: VaultConfig,
): string {
  if (!config.enabled) {
    return ctx.summary
  }

  const sessionId = ctx.session.id

  saveCompactionCheckpoint(config, sessionId, ctx.summary)

  const previousContext = fetchPreviousContext(sessionId)

  return `${ctx.summary}${previousContext}${COMPACTION_INSTRUCTION}`
}

export function buildCompactionContextParts(
  sessionId: string,
  config: VaultConfig,
): string[] {
  if (!config.enabled) {
    return []
  }

  const parts: string[] = []
  const previousContext = fetchPreviousContext(sessionId)

  if (previousContext) {
    parts.push(previousContext)
  }

  parts.push(COMPACTION_INSTRUCTION)

  return parts
}
