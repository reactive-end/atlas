import type { EchoLevel, AgentMode, PresetName } from '@/types'
import type { CodexConfig } from '@/modules/codex/types'

// SkillsConfig defined locally to avoid circular dependency
export interface SkillsConfig {
  enabled: boolean
  basePath?: string
  curator?: {
    enabled: boolean
    staleAfterDays?: number
    archiveAfterDays?: number
    autoArchive?: boolean
  }
}

// CuratorConfig for Phase 4 lifecycle management
export interface CuratorConfig {
  enabled: boolean
  staleAfterDays?: number
  archiveAfterDays?: number
  autoArchive?: boolean
  reviewEnabled?: boolean
}

// CandidatesConfig for Phase 3 skill candidate detection
export interface CandidatesConfig {
  enabled: boolean
  minToolCalls?: number
  maxCandidates?: number
  expireAfterDays?: number
  minConfidence?: number
}

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

export interface AthenaConfig {
  enabled: boolean
  skills: SkillsConfig
  candidates: CandidatesConfig
  curator: CuratorConfig
}

export interface AtlasConfig {
  echo: EchoConfig
  agents: AgentsConfig
  forge: ForgeConfig
  vault: VaultConfig
  codex: CodexConfig
  athena: AthenaConfig
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
        squire: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
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
        squire: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
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
        squire: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
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
        squire: { model: 'openai/gpt-5.4-mini', skills: ['*'], mcps: [] },
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
    compressMarkdown: true,
    redundancyCacheEnabled: true,
    redundancyCacheSize: 16,
    showCompressionRatio: false,
  },
  vault: {
    enabled: true,
    injectMemoryProtocol: true,
    stripPrivateTags: true,
  },
  codex: {
    enabled: true,
    indexPath: '.atlas/index.md',
    includePatterns: ['**/src/**/*.{ts,tsx,js,jsx}', '**/lib/**/*.ts'],
    excludePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.d.ts',
      '**/.atlas/**',
    ],
    maxFileSize: 50000,
    autoIndexOnStart: true,
  },
  athena: {
    enabled: true,
    skills: {
      enabled: true,
      basePath: undefined,
    },
    candidates: {
      enabled: false,
      minToolCalls: 5,
      maxCandidates: 50,
      expireAfterDays: 30,
      minConfidence: 60,
    },
    curator: {
      enabled: false,
      staleAfterDays: 30,
      archiveAfterDays: 90,
      autoArchive: false,
      reviewEnabled: false,
    },
  },
}
