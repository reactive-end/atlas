import type { ForgeConfig } from '@/config/schema'
import type { ToolBeforeContext, ToolBeforeResult } from '@/types'
import { compressBashOutput } from '@/modules/forge/compressor'
import { deduplicateLines } from '@/modules/forge/dedup'

function isBashTool(toolName: string): boolean {
  const bashTools = ['bash', 'shell', 'terminal', 'exec', 'command']
  return bashTools.some(t => toolName.toLowerCase().includes(t))
}

const HEAVY_OUTPUT_TOOLS = [
  'read', 'read_file',
  'list', 'list_directory', 'list_dir',
  'grep', 'search', 'find', 'glob',
  'cat', 'head', 'tail',
]

function isHeavyOutputTool(toolName: string): boolean {
  const lower = toolName.toLowerCase()
  return HEAVY_OUTPUT_TOOLS.some(t => lower.includes(t))
}

function shouldBypass(command: string, bypassList: string[]): boolean {
  const lowerCommand = command.toLowerCase()
  return bypassList.some(pattern => lowerCommand.includes(pattern.toLowerCase()))
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

  if (isBashTool(toolName)) {
    const command = args['command'] ?? args['cmd'] ?? ''
    if (command && shouldBypass(command, config.bypass)) {
      return false
    }
    return true
  }

  if (isHeavyOutputTool(toolName)) {
    return true
  }

  return false
}

function compressHeavyOutput(
  result: string,
  config: ForgeConfig,
): { output: string; ratio: number } {
  const originalLines = result.split('\n').length

  // Lighter pipeline for non-bash tools: dedup + truncate only
  const dedupResult = deduplicateLines(result, config.dedupMin)
  let output = dedupResult.text

  const lines = output.split('\n')
  // Apply a higher line limit for read tools (they need more context preserved)
  const readMaxLines = Math.min(config.maxLines * 2, 400)
  if (lines.length > readMaxLines) {
    const headCount = Math.ceil(readMaxLines * 0.7)
    const tailCount = readMaxLines - headCount
    const head = lines.slice(0, headCount)
    const tail = lines.slice(-tailCount)
    const skipped = lines.length - headCount - tailCount
    output = [...head, `\n... [${skipped} lines omitted] ...\n`, ...tail].join('\n')
  }

  const compressedLines = output.split('\n').length
  const ratio = originalLines > 0 ? 1 - (compressedLines / originalLines) : 0

  return { output, ratio: Math.max(0, ratio) }
}

export function compressBashResult(
  result: string,
  config: ForgeConfig,
): { output: string; ratio: number } {
  if (!config.enabled) {
    return { output: result, ratio: 0 }
  }

  const compressed = compressBashOutput(result, config)
  return { output: compressed.output, ratio: compressed.ratio }
}

export function compressToolResult(
  toolName: string,
  result: string,
  config: ForgeConfig,
): { output: string; ratio: number } {
  if (!config.enabled) {
    return { output: result, ratio: 0 }
  }

  if (isBashTool(toolName)) {
    return compressBashResult(result, config)
  }

  if (isHeavyOutputTool(toolName)) {
    return compressHeavyOutput(result, config)
  }

  return { output: result, ratio: 0 }
}
