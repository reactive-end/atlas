import type { ToolBeforeContext, ToolBeforeResult } from '@/types'
import type { AtlasConfig } from '@/config/schema'
import { handleBashBefore } from '@/modules/forge/bash-wrapper'

export function handleToolBefore(
  ctx: ToolBeforeContext,
  config: AtlasConfig,
): ToolBeforeResult {
  if (!config.forge.enabled) {
    return {}
  }

  return handleBashBefore(ctx, config.forge)
}

export function handleRealToolBefore(
  toolName: string,
  args: Record<string, unknown>,
  sessionId: string,
  config: AtlasConfig,
): Record<string, unknown> | void {
  if (!config.forge.enabled) {
    return
  }

  const ctx: ToolBeforeContext = {
    tool: toolName,
    args: args as Record<string, string>,
    session: { id: sessionId },
  }

  const result = handleBashBefore(ctx, config.forge)

  if (result.args) {
    return result.args as Record<string, unknown>
  }
}
