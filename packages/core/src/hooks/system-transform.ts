import type { SystemTransformContext, PluginState, AgentName } from '@/types'
import type { AtlasConfig, AgentPresetsMap } from '@/config/schema'
import { buildEchoPrompt, buildDisabledPrompt } from '@/modules/echo/prompt-builder'
import { shouldDisableEcho } from '@/modules/echo/auto-clarity'
import { buildFullVaultPrompt } from '@/modules/vault/memory-protocol'
import { AGENT_FACTORIES, ALL_AGENT_NAMES } from '@/modules/agents/registry'

function getActivePresets(config: AtlasConfig): AgentPresetsMap {
  return config.agents.presets[config.agents.preset]
}

function isRegisteredAgent(name: string): name is AgentName {
  return name in AGENT_FACTORIES
}

function buildEchoSection(
  config: AtlasConfig,
  state: PluginState,
  content: string,
): string {
  if (!config.echo.enabled) {
    return ''
  }

  if (state.agentMode === 'verbose') {
    return buildDisabledPrompt()
  }

  if (config.echo.autoClarityEnabled && shouldDisableEcho(content)) {
    return buildDisabledPrompt()
  }

  return buildEchoPrompt(state.echoLevel)
}

function buildVaultSection(config: AtlasConfig): string {
  if (!config.vault.enabled || !config.vault.injectMemoryProtocol) {
    return ''
  }

  return buildFullVaultPrompt()
}

export function handleSystemTransform(
  ctx: SystemTransformContext,
  config: AtlasConfig,
  state: PluginState,
): string {
  const sections: string[] = [ctx.system]

  const echoSection = buildEchoSection(config, state, ctx.system)
  if (echoSection) {
    sections.push(echoSection)
  }

  if (config.agents.enabled && isRegisteredAgent(ctx.agent)) {
    const presets = getActivePresets(config)
    const agentPreset = presets[ctx.agent]
    if (agentPreset) {
      const echoMode = config.agents.forceEchoOnAll || state.agentMode === 'echo'
      const factory = AGENT_FACTORIES[ctx.agent]
      const agentDef = factory(agentPreset, echoMode)
      sections.push(agentDef.systemPrompt)
    }
  }

  const vaultSection = buildVaultSection(config)
  if (vaultSection) {
    sections.push(vaultSection)
  }

  return sections.filter(s => s.length > 0).join('\n\n---\n\n')
}

export function buildAllSystemSections(
  baseSystemPrompt: string,
  config: AtlasConfig,
  state: PluginState,
): string[] {
  const sections: string[] = [baseSystemPrompt]

  const echoSection = buildEchoSection(config, state, baseSystemPrompt)
  if (echoSection) {
    sections.push(echoSection)
  }

  if (config.agents.enabled) {
    const presets = getActivePresets(config)
    const echoMode = config.agents.forceEchoOnAll || state.agentMode === 'echo'
    const agentSections: string[] = []

    for (const name of ALL_AGENT_NAMES) {
      const preset = presets[name]
      if (!preset) continue
      const factory = AGENT_FACTORIES[name]
      const agentDef = factory(preset, echoMode)
      agentSections.push(`### ${agentDef.displayName}\n${agentDef.systemPrompt}`)
    }

    if (agentSections.length > 0) {
      sections.push(`## Available Agent Roles\n\n${agentSections.join('\n\n')}`)
    }
  }

  const vaultSection = buildVaultSection(config)
  if (vaultSection) {
    sections.push(vaultSection)
  }

  return sections.filter(s => s.length > 0)
}
