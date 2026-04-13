import type { PluginState, AgentName } from '@/types'
import type { AtlasConfig } from '@/config/schema'

// Re-exports for the plugin entry point
export type { AgentDefinition, PluginState, EchoLevel, AgentMode } from '@/types'
export type { AtlasConfig, AgentPresetConfig, AgentPresetsMap } from '@/config/schema'

// Config
export { loadConfig } from '@/config/loader'
export { DEFAULT_CONFIG } from '@/config/schema'

// System transform (echo + agents + vault injection)
export { handleSystemTransform, buildAllSystemSections } from '@/hooks/system-transform'

// Echo (prompt builders + auto-clarity)
export { buildEchoPrompt, buildDisabledPrompt } from '@/modules/echo/prompt-builder'
export { shouldDisableEcho } from '@/modules/echo/auto-clarity'

// Vault memory protocol
export { buildFullVaultPrompt } from '@/modules/vault/memory-protocol'

// Tool hooks (forge + vault)
export { handleToolBefore, handleRealToolBefore } from '@/hooks/tool-before'
export { handleToolAfter, handleRealToolAfter, compressToolResult } from '@/hooks/tool-after'

// Forge compression
export { shouldCompressResult, compressBashResult } from '@/modules/forge/bash-wrapper'

// Compacting hooks (vault)
export { handleCompacting, buildCompactionContext } from '@/hooks/compacting'

// Event hooks (vault lifecycle + atlas commands)
export { handleEvent, handleChatMessage, handleRealEvent } from '@/hooks/event-handler'

// Echo commands
export {
  handleEchoCommand,
  handleVerboseCommand,
  isAtlasCommand,
  ECHO_COMMAND,
  VERBOSE_COMMAND,
} from '@/modules/echo/commands'

// Vault utilities
export { stripPrivateTags } from '@/modules/vault/memory-protocol'
export { initializeVault, ensureSession } from '@/modules/vault/session-manager'
export { vaultSaveObservation } from '@/modules/vault/client'

// Vault tool handlers (for plugin tool registration)
export {
  handleMemSearch,
  handleMemTimeline,
  handleMemGetObservation,
  handleMemSave,
} from '@/modules/vault/tool-handlers'
export type { MemToolResult } from '@/modules/vault/tool-handlers'

// Agent factories (for building all agent prompts)
export { createAtlasAgent } from '@/modules/agents/atlas'
export { createPathfinderAgent } from '@/modules/agents/pathfinder'
export { createArchivistAgent } from '@/modules/agents/archivist'
export { createElderAgent } from '@/modules/agents/elder'
export { createArtisanAgent } from '@/modules/agents/artisan'
export { createMenderAgent } from '@/modules/agents/mender'
export { createTribunalAgent } from '@/modules/agents/tribunal'
export { createInspectorAgent } from '@/modules/agents/inspector'
export { createScribeAgent } from '@/modules/agents/scribe'
export { createCuratorAgent } from '@/modules/agents/curator'
export { createSentinelAgent } from '@/modules/agents/sentinel'
export { createHeraldAgent } from '@/modules/agents/herald'
export { createLorekeeperAgent } from '@/modules/agents/lorekeeper'
export { createAlchemistAgent } from '@/modules/agents/alchemist'
export { createMagistrateAgent } from '@/modules/agents/magistrate'
export { createEnvoyAgent } from '@/modules/agents/envoy'
export { createQuartermasterAgent } from '@/modules/agents/quartermaster'
export { createTacticianAgent } from '@/modules/agents/tactician'

// Agent registry (for OpenCode UI registration)
export { buildAgentRegistry, getAgentConfigs, AGENT_ALIASES } from '@/modules/agents/registry'
export type { AgentSdkConfig } from '@/modules/agents/registry'

export const AGENT_NAMES: AgentName[] = [
  'atlas',
  'pathfinder',
  'archivist',
  'elder',
  'artisan',
  'mender',
  'tribunal',
]

export function createInitialState(config: AtlasConfig): PluginState {
  return {
    echoLevel: config.echo.defaultLevel,
    agentMode: config.agents.defaultMode,
    activePreset: config.agents.preset,
  }
}
