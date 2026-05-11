import type { EchoLevel, AgentMode, PresetName, AgentName } from '@/types'
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

export type AgentPresetsMap = Partial<Record<AgentName, AgentPresetConfig>>

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

const MCP_AGENTS: ReadonlySet<string> = new Set(['archivist'])
const MCP_LIST: string[] = ['websearch', 'grep_app']

function buildPreset(
  defaultModel: string,
  overrides?: Partial<Record<AgentName, string>>,
): AgentPresetsMap {
  const agentNames: AgentName[] = [
    'atlas', 'pathfinder', 'archivist', 'elder', 'artisan',
    'mender', 'tribunal', 'inspector', 'scribe', 'curator',
    'sentinel', 'herald', 'lorekeeper', 'alchemist', 'magistrate',
    'envoy', 'quartermaster', 'tactician', 'squire',
  ]
  const preset: AgentPresetsMap = {}
  for (const name of agentNames) {
    preset[name] = {
      model: overrides?.[name] ?? defaultModel,
      skills: ['*'],
      mcps: MCP_AGENTS.has(name) ? MCP_LIST : [],
    }
  }
  return preset
}

const MINI = 'openai/gpt-5.4-mini'
const FULL = 'openai/gpt-5.4'
const OPUS = 'anthropic/claude-opus-4.6'

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
      default: buildPreset(FULL, {
        pathfinder: MINI, archivist: MINI, artisan: MINI,
        mender: MINI, inspector: MINI, scribe: MINI,
        herald: MINI, quartermaster: MINI, squire: MINI,
      }),
      performance: buildPreset(FULL, { squire: MINI }),
      economy: buildPreset(MINI),
      premium: buildPreset(OPUS, { squire: MINI }),
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
