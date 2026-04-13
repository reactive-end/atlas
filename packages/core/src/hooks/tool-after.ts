import type { ToolAfterContext } from '@/types'
import type { AtlasConfig } from '@/config/schema'
import { shouldCompressResult, compressBashResult } from '@/modules/forge/bash-wrapper'
import { vaultSaveObservation } from '@/modules/vault/client'
import { stripPrivateTags } from '@/modules/vault/memory-protocol'
import { ensureSession } from '@/modules/vault/session-manager'

function extractLearnings(result: string): string | null {
  const errorPattern = /error|exception|failed|bug|fix/i
  const solutionPattern = /solved|fixed|resolved|workaround/i

  if (errorPattern.test(result) && solutionPattern.test(result)) {
    const lines = result.split('\n').filter(line =>
      errorPattern.test(line) || solutionPattern.test(line),
    )
    return lines.slice(0, 10).join('\n')
  }

  return null
}

export function compressToolResult(
  ctx: ToolAfterContext,
  config: AtlasConfig,
): string {
  if (!config.forge.enabled) {
    return ctx.result
  }

  const args = ctx.args as Record<string, string>
  if (shouldCompressResult(ctx.tool, args, config.forge)) {
    return compressBashResult(ctx.result, config.forge)
  }

  return ctx.result
}

export function handleToolAfter(
  ctx: ToolAfterContext,
  config: AtlasConfig,
): void {
  if (!config.vault.enabled) {
    return
  }

  const sessionId = ctx.session.id

  ensureSession(sessionId)

  const learning = extractLearnings(ctx.result)

  if (learning) {
    const sanitized = config.vault.stripPrivateTags
      ? stripPrivateTags(learning)
      : learning

    vaultSaveObservation(
      sessionId,
      `[Tool: ${ctx.tool}] ${sanitized}`,
      'passive-capture',
    )
  }
}

export function handleRealToolAfter(
  toolName: string,
  sessionId: string,
  outputText: string,
  args: Record<string, string>,
  config: AtlasConfig,
): { compressed: string; vaultSaved: boolean } {
  let compressed = outputText
  let vaultSaved = false

  if (config.forge.enabled && shouldCompressResult(toolName, args, config.forge)) {
    compressed = compressBashResult(outputText, config.forge)
  }

  if (config.vault.enabled) {
    const learning = extractLearnings(compressed)
    if (learning) {
      ensureSession(sessionId)
      const sanitized = config.vault.stripPrivateTags
        ? stripPrivateTags(learning)
        : learning
      vaultSaveObservation(sessionId, `[Tool: ${toolName}] ${sanitized}`, 'passive-capture')
      vaultSaved = true
    }
  }

  return { compressed, vaultSaved }
}
