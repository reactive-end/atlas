import type { ToolAfterContext } from '@/types'
import type { AtlasConfig } from '@/config/schema'
import { compressToolResult as compressToolOutput } from '@/modules/forge/bash-wrapper'
import { vaultSaveMemory } from '@/modules/vault/client'
import { stripPrivateTags } from '@/modules/vault/memory-protocol'
import { ensureSession } from '@/modules/vault/session-manager'

function extractLearnings(result: string): string | null {
  const errorPattern = /error|exception|failed|bug|fix/i
  const solutionPattern = /solved|fixed|resolved|workaround|solution|corrected/i
  const insightPattern = /found|discovered|learned|noticed|important|cause|root cause/i

  const lines = result.split('\n')
  let score = 0

  const relevantLines: string[] = []

  for (const line of lines) {
    if (errorPattern.test(line)) {
      score += 2
      relevantLines.push(line)
    } else if (solutionPattern.test(line)) {
      score += 3
      relevantLines.push(line)
    } else if (insightPattern.test(line)) {
      score += 1
      relevantLines.push(line)
    }
  }

  // Require minimum signal to avoid noise
  if (score >= 3 && relevantLines.length > 0) {
    return relevantLines.slice(0, 10).join('\n')
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
