import type { ToolAfterContext } from '@/types'
import type { AtlasConfig } from '@/config/schema'
import { compressToolResult as compressToolOutput } from '@/modules/forge/bash-wrapper'
import { vaultSaveMemory } from '@/modules/vault/client'
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

  const result = compressToolOutput(ctx.tool, ctx.result, config.forge)
  return result.output
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

    vaultSaveMemory(
      sessionId,
      `[Tool: ${ctx.tool}] ${sanitized}`,
      'passive-capture',
      0.3,
    )
  }
}

export function handleRealToolAfter(
  toolName: string,
  sessionId: string,
  outputText: string,
  _args: Record<string, string>,
  config: AtlasConfig,
): { compressed: string; vaultSaved: boolean; ratio: number } {
  let compressed = outputText
  let vaultSaved = false
  let ratio = 0

  if (config.forge.enabled) {
    const result = compressToolOutput(toolName, outputText, config.forge)
    compressed = result.output
    ratio = result.ratio
  }

  if (config.vault.enabled) {
    const learning = extractLearnings(compressed)
    if (learning) {
      ensureSession(sessionId)
      const sanitized = config.vault.stripPrivateTags
        ? stripPrivateTags(learning)
        : learning
      vaultSaveMemory(sessionId, `[Tool: ${toolName}] ${sanitized}`, 'passive-capture', 0.3)
      vaultSaved = true
    }
  }

  return { compressed, vaultSaved, ratio }
}
