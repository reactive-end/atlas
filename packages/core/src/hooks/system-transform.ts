import type { SystemTransformContext, PluginState, AgentName, EchoLevel } from '@/types'
import type { AtlasConfig, AgentPresetsMap } from '@/config/schema'
import { buildEchoPrompt, buildDisabledPrompt } from '@/modules/echo/prompt-builder'
import { shouldDisableEcho } from '@/modules/echo/auto-clarity'
import { buildFullVaultPrompt, buildMemoryToolsPrompt } from '@/modules/vault/memory-protocol'
import { AGENT_FACTORIES, ALL_AGENT_NAMES } from '@/modules/agents/registry'
import { buildCodexPrompt } from '@/modules/codex/prompt'

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
  contextUsagePercent: number = 0,
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

  // Adaptive intensity: escalate echo level based on context usage
  const adaptiveLevel = getAdaptiveLevel(state.echoLevel, contextUsagePercent, config)
  return buildEchoPrompt(adaptiveLevel)
}

function getAdaptiveLevel(
  baseLevel: EchoLevel,
  contextUsagePercent: number,
  config: AtlasConfig,
): EchoLevel {
  if (!config.forge.adaptiveIntensity) {
    return baseLevel
  }

  // Escalate compression as context fills up
  if (contextUsagePercent > 60) {
    return 'ultra'
  }
  if (contextUsagePercent > 30) {
    // At least 'full' when context is getting substantial
    return baseLevel === 'lite' ? 'full' : baseLevel
  }

  return baseLevel
}

// Agents that benefit from full Vault memory protocol
const VAULT_FULL_AGENTS: ReadonlySet<string> = new Set([
  'atlas', 'elder', 'mender', 'inspector', 'scribe', 'curator', 'lorekeeper',
])

function buildVaultSection(config: AtlasConfig, agentName?: string): string {
  if (!config.vault.enabled || !config.vault.injectMemoryProtocol) {
    return ''
  }

  // Full protocol for agents that actively use memory
  if (!agentName || VAULT_FULL_AGENTS.has(agentName)) {
    return buildFullVaultPrompt()
  }

  // Lightweight tools-only prompt for other agents
  return buildMemoryToolsPrompt()
}

function buildForgeSection(config: AtlasConfig): string {
  if (!config.forge.enabled) {
    return ''
  }

  return `Forge: Bash output auto-compressed (max ${config.forge.maxLines} lines). Tools: forge_stats, forge_reset_cache.`
}

function buildCodexSection(config: AtlasConfig): string {
  if (!config.codex.enabled) {
    return ''
  }

  return buildCodexPrompt()
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

  const vaultSection = buildVaultSection(config, isRegisteredAgent(ctx.agent) ? ctx.agent : undefined)
  if (vaultSection) {
    sections.push(vaultSection)
  }

  const forgeSection = buildForgeSection(config)
  if (forgeSection) {
    sections.push(forgeSection)
  }

  const codexSection = buildCodexSection(config)
  if (codexSection) {
    sections.push(codexSection)
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

  const forgeSection = buildForgeSection(config)
  if (forgeSection) {
    sections.push(forgeSection)
  }

  const codexSection = buildCodexSection(config)
  if (codexSection) {
    sections.push(codexSection)
  }

  return sections.filter(s => s.length > 0)
}
