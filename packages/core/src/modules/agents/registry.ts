import type { AgentPresetsMap } from '@/config/schema'
import type { AgentName } from '@/types'

import { createAtlasAgent } from '@/modules/agents/atlas'
import { createPathfinderAgent } from '@/modules/agents/pathfinder'
import { createArchivistAgent } from '@/modules/agents/archivist'
import { createElderAgent } from '@/modules/agents/elder'
import { createArtisanAgent } from '@/modules/agents/artisan'
import { createMenderAgent } from '@/modules/agents/mender'
import { createTribunalAgent } from '@/modules/agents/tribunal'
import { createInspectorAgent } from '@/modules/agents/inspector'
import { createScribeAgent } from '@/modules/agents/scribe'
import { createCuratorAgent } from '@/modules/agents/curator'
import { createSentinelAgent } from '@/modules/agents/sentinel'
import { createHeraldAgent } from '@/modules/agents/herald'
import { createLorekeeperAgent } from '@/modules/agents/lorekeeper'
import { createAlchemistAgent } from '@/modules/agents/alchemist'
import { createMagistrateAgent } from '@/modules/agents/magistrate'
import { createEnvoyAgent } from '@/modules/agents/envoy'
import { createQuartermasterAgent } from '@/modules/agents/quartermaster'
import { createTacticianAgent } from '@/modules/agents/tactician'

export type AgentSdkConfig = {
  model?: string
  variant?: string
  temperature?: number
  top_p?: number
  prompt?: string
  description?: string
  mode?: 'primary' | 'subagent' | 'all'
  hidden?: boolean
  color?: string | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info'
  steps?: number
  tools?: Record<string, boolean>
  disable?: boolean
  options?: Record<string, unknown>
  permission?: Record<string, unknown>
  mcps?: string[]
}

type AgentRegistry = Record<string, AgentSdkConfig>

export const AGENT_FACTORIES = {
  atlas: createAtlasAgent,
  pathfinder: createPathfinderAgent,
  archivist: createArchivistAgent,
  elder: createElderAgent,
  artisan: createArtisanAgent,
  mender: createMenderAgent,
  tribunal: createTribunalAgent,
  inspector: createInspectorAgent,
  scribe: createScribeAgent,
  curator: createCuratorAgent,
  sentinel: createSentinelAgent,
  herald: createHeraldAgent,
  lorekeeper: createLorekeeperAgent,
  alchemist: createAlchemistAgent,
  magistrate: createMagistrateAgent,
  envoy: createEnvoyAgent,
  quartermaster: createQuartermasterAgent,
  tactician: createTacticianAgent,
} as const

export const ALL_AGENT_NAMES: AgentName[] = [
  'atlas',
  'pathfinder',
  'archivist',
  'elder',
  'artisan',
  'mender',
  'tribunal',
  'inspector',
  'scribe',
  'curator',
  'sentinel',
  'herald',
  'lorekeeper',
  'alchemist',
  'magistrate',
  'envoy',
  'quartermaster',
  'tactician',
]

export const AGENT_ALIASES: Record<AgentName, string> = {
  atlas: 'atlas',
  pathfinder: '@tracker',
  archivist: '@keeper',
  elder: '@sage',
  artisan: '@craftsman',
  mender: '@repairman',
  tribunal: '@assembly',
  inspector: '@debugger',
  scribe: '@writer',
  curator: '@refactor',
  sentinel: '@guard',
  herald: '@deployer',
  lorekeeper: '@analyst',
  alchemist: '@optimizer',
  magistrate: '@reviewer',
  envoy: '@contracts',
  quartermaster: '@deps',
  tactician: '@tester',
}

export function buildAgentRegistry(
  presets: AgentPresetsMap,
  echoMode: boolean,
): AgentRegistry {
  const registry: AgentRegistry = {}

  for (const name of ALL_AGENT_NAMES) {
    const preset = presets[name]
    if (!preset) continue

    const factory = AGENT_FACTORIES[name]
    const agent = factory(preset, echoMode)

    registry[name] = {
      model: agent.model,
      prompt: agent.systemPrompt,
      description: agent.displayName,
      mode: name === 'atlas' ? 'primary' : 'subagent',
      temperature: name === 'atlas' ? 0.1 : undefined,
      mcps: preset.mcps,
    }
  }

  return registry
}

export function getAgentConfigs(
  presets: AgentPresetsMap,
  echoMode: boolean,
): Record<string, AgentSdkConfig> {
  const agents = buildAgentRegistry(presets, echoMode)

  const configs: Record<string, AgentSdkConfig> = {}
  for (const [name, config] of Object.entries(agents)) {
    configs[name] = { ...config }
    if (name === 'atlas') {
      configs[name].mode = 'primary'
    } else {
      configs[name].mode = 'subagent'
    }
  }

  return configs
}
