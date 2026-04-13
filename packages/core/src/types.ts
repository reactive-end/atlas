// OpenCode Plugin API Types
// Contract between Atlas and OpenCode runtime

export type EchoLevel = 'lite' | 'full' | 'ultra'

export type AgentMode = 'echo' | 'verbose'

export type AgentName =
  | 'atlas'
  | 'pathfinder'
  | 'archivist'
  | 'elder'
  | 'artisan'
  | 'mender'
  | 'tribunal'
  | 'inspector'
  | 'scribe'
  | 'curator'
  | 'sentinel'
  | 'herald'
  | 'lorekeeper'
  | 'alchemist'
  | 'magistrate'
  | 'envoy'
  | 'quartermaster'
  | 'tactician'

export type PresetName = 'default' | 'performance' | 'economy' | 'premium'

export interface SessionInfo {
  id: string
  metadata?: Record<string, string>
}

export interface SystemTransformContext {
  system: string
  agent: string
  session: SessionInfo
}

export interface ToolBeforeContext {
  tool: string
  args: Record<string, string>
  session: SessionInfo
}

export interface ToolBeforeResult {
  args?: Record<string, string>
  skip?: boolean
}

export interface ToolAfterContext {
  tool: string
  args: Record<string, string>
  result: string
  session: SessionInfo
}

export interface CompactingContext {
  summary: string
  session: SessionInfo
}

export interface EventContext {
  event: string
  session: SessionInfo
}

export interface MessageContext {
  role: string
  content: string
  session: SessionInfo
}

export interface CommandContext {
  command: string
  args: string[]
  session: SessionInfo
}

export interface AgentDefinition {
  name: string
  displayName: string
  systemPrompt: string
  model: string
  skills: string[]
  mcps: string[]
}

// Plugin hooks and plugin interfaces are defined by @opencode-ai/plugin
// Internal handlers use their own context types (above) and are adapted
// to the real API in plugin/atlas.ts

export interface PluginState {
  echoLevel: EchoLevel
  agentMode: AgentMode
  activePreset: PresetName
}
