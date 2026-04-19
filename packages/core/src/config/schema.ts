import type { EchoLevel, AgentMode, PresetName } from '@/types'

export interface AgentPresetConfig {
  model: string
  skills: string[]
  mcps: string[]
}

export type AgentPresetsMap = Record<string, AgentPresetConfig>

export interface EchoConfig {
  enabled: boolean
  defaultLevel: EchoLevel
  autoClarityEnabled: boolean
}

export interface AgentsConfig {
  enabled: boolean
  preset: PresetName
  defaultMode: AgentMode
  forceEchoOnAll: boolean
  presets: Record<PresetName, AgentPresetsMap>
}

export interface ForgeConfig {
  enabled: boolean
  adaptiveIntensity: boolean
  maxLines: number
  dedupMin: number
  summarizeThresholdLines: number
  compactThresholdTokens: number
  bypass: string[]
  compressMarkdown: boolean
  redundancyCacheEnabled: boolean
  redundancyCacheSize: number
  showCompressionRatio: boolean
}

export interface VaultConfig {
  enabled: boolean
  injectMemoryProtocol: boolean
  stripPrivateTags: boolean
}

export interface AtlasConfig {
  echo: EchoConfig
  agents: AgentsConfig
  forge: ForgeConfig
  vault: VaultConfig
}

export const DEFAULT_CONFIG: AtlasConfig = {
  echo: {
    enabled: true,
    defaultLevel: 'full',
    autoClarityEnabled: true,
  },
  agents: {
    enabled: true,
    preset: 'default',
    defaultMode: 'echo',
    forceEchoOnAll: true,
    presets: {
      default: {
        atlas: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        pathfinder: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        archivist: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: ['websearch', 'grep_app'] },
        elder: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        artisan: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        mender: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        tribunal: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        inspector: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        scribe: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        curator: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        sentinel: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        herald: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        lorekeeper: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        alchemist: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        magistrate: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        envoy: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        quartermaster: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        tactician: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
      },
      performance: {
        atlas: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        pathfinder: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        archivist: { model: 'openai/gpt-5.4', skills: ['*'], mcps: ['websearch', 'grep_app'] },
        elder: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        artisan: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        mender: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        tribunal: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        inspector: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        scribe: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        curator: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        sentinel: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        herald: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        lorekeeper: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        alchemist: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        magistrate: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        envoy: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        quartermaster: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
        tactician: { model: 'openai/gpt-5.4', skills: ['*'], mcps: [] },
      },
      economy: {
        atlas: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        pathfinder: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        archivist: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        elder: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        artisan: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        mender: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        tribunal: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        inspector: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        scribe: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        curator: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        sentinel: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        herald: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        lorekeeper: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        alchemist: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        magistrate: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        envoy: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        quartermaster: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
        tactician: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
      },
      premium: {
        atlas: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        pathfinder: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        archivist: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: ['websearch', 'grep_app'] },
        elder: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        artisan: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        mender: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        tribunal: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        inspector: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        scribe: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        curator: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        sentinel: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        herald: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        lorekeeper: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        alchemist: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        magistrate: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        envoy: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        quartermaster: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
        tactician: { model: 'anthropic/claude-opus-4.6', skills: ['*'], mcps: [] },
      },
    },
  },
  forge: {
    enabled: true,
    adaptiveIntensity: true,
    maxLines: 200,
    dedupMin: 3,
    summarizeThresholdLines: 500,
    compactThresholdTokens: 120000,
    bypass: ['docker exec', 'psql', 'mysql', 'ssh'],
    compressMarkdown: false,
    redundancyCacheEnabled: true,
    redundancyCacheSize: 16,
    showCompressionRatio: false,
  },
  vault: {
    enabled: true,
    injectMemoryProtocol: true,
    stripPrivateTags: true,
  },
}
