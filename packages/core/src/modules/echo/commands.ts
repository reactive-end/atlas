import type { CommandContext, PluginState, EchoLevel } from '@/types'

export const ECHO_COMMAND = '/atlas-echo'
export const VERBOSE_COMMAND = '/atlas-verbose'

export function handleEchoCommand(
  ctx: CommandContext,
  state: PluginState,
): PluginState {
  const levelArg = ctx.args[0] as EchoLevel | undefined
  const validLevels: EchoLevel[] = ['lite', 'full', 'ultra']

  const newLevel: EchoLevel = levelArg && validLevels.includes(levelArg)
    ? levelArg
    : state.echoLevel

  return {
    ...state,
    agentMode: 'echo',
    echoLevel: newLevel,
  }
}

export function handleVerboseCommand(
  _ctx: CommandContext,
  state: PluginState,
): PluginState {
  return {
    ...state,
    agentMode: 'verbose',
  }
}

export function isAtlasCommand(command: string): boolean {
  return command === ECHO_COMMAND || command === VERBOSE_COMMAND
}
