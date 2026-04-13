import type { ForgeConfig } from '@/config/schema'
import type { ToolBeforeContext, ToolBeforeResult } from '@/types'
import { compressBashOutput } from '@/modules/forge/compressor'

function isBashTool(toolName: string): boolean {
  const bashTools = ['bash', 'shell', 'terminal', 'exec', 'command']
  return bashTools.some(t => toolName.toLowerCase().includes(t))
}

function shouldBypass(command: string, bypassList: string[]): boolean {
  return bypassList.some(pattern => command.includes(pattern))
}

export function handleBashBefore(
  ctx: ToolBeforeContext,
  config: ForgeConfig,
): ToolBeforeResult {
  if (!config.enabled) {
    return {}
  }

  if (!isBashTool(ctx.tool)) {
    return {}
  }

  return {}
}

export function shouldCompressResult(
  toolName: string,
  args: Record<string, string>,
  config: ForgeConfig,
): boolean {
  if (!config.enabled) {
    return false
  }

  if (!isBashTool(toolName)) {
    return false
  }

  const command = args['command'] ?? args['cmd'] ?? ''

  if (command && shouldBypass(command, config.bypass)) {
    return false
  }

  return true
}

export function compressBashResult(
  result: string,
  config: ForgeConfig,
): string {
  if (!config.enabled) {
    return result
  }

  const compressed = compressBashOutput(result, config)
  return compressed.output
}
