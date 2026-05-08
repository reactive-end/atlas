// Atlas Plugin for OpenCode
// Registers 19 agents (Atlas orchestrator + 18 specialists) via config hook
// Place in ~/.config/opencode/plugins/ or .opencode/plugins/

import { type Plugin, type PluginInput, type PluginOptions, tool } from '@opencode-ai/plugin'
import type { AgentSdkConfig, AtlasConfig } from '@atlas-opencode/core'

import {
  loadConfig,
  createInitialState,
  getAgentConfigs,
  handleRealToolBefore,
  handleRealToolAfter,
  buildCompactionContext,
  handleRealEvent,
  handleEchoCommand,
  handleVerboseCommand,
  ensureSession,
  vaultSaveMemory,
  stripPrivateTags,
  buildEchoPrompt,
  buildDisabledPrompt,
  shouldDisableEcho,
  handleMemSearch,
  handleMemTimeline,
  handleMemGetObservation,
  handleMemSave,
  initializeVault,
  getForgeStats,
  resetRedundancyCache,
  compressDifferential,
  clearDiffCache,
  compressReadResult,
  clearReadCache,
  handleListSkills,
  handleViewSkill,
  handleManageSkill,
  resolveSkillsPaths,
  isSkillsEnabled,
  getCandidatesConfig,
  isCandidatesEnabled,
  analyzeToolExecution,
  persistCandidates,
  recordToolExecution,
  handleListCandidates,
  runSkillsCurator as runCuratorSkill,
  getSkillsCuratorStatus as getCuratorStatusSkill,
  setSkillsCuratorPaused as setCuratorPaused,
  runCuratorReview as runCuratorReviewSkill,
  buildAthenaStats,
  formatAthenaStats,
} from '@atlas-opencode/core'

type AtlasPluginState = {
  echoLevel: 'lite' | 'full' | 'ultra'
  agentMode: 'echo' | 'verbose'
  activePreset: string
  stats: {
    forgeCompressed: number
    vaultSaved: number
    echoInjected: number
  }
}

// State per session - Map<sessionID, state>
const sessionStates = new Map<string, AtlasPluginState>()

function getOrCreateSessionState(sessionID: string, config: AtlasConfig): AtlasPluginState {
  if (!sessionStates.has(sessionID)) {
    sessionStates.set(sessionID, createInitialState(config))
  }
  return sessionStates.get(sessionID)!
}

function generateStatusMessage(state: AtlasPluginState, config: AtlasConfig): string {
  const enabled = []

  if (state.agentMode === 'echo') {
    enabled.push(`Echo: ${state.echoLevel} mode`)
  } else {
    enabled.push('Echo: verbose mode')
  }

  enabled.push('Vault: active')
  const bypassList = config.forge?.bypass?.join(', ') || 'none'
  enabled.push(`Forge: compressing outputs (bypass: ${bypassList})`)

  const statusBars = [
    `Echo injections: ${state.stats.echoInjected}`,
    `Forge compressions: ${state.stats.forgeCompressed}`,
    `Vault observations: ${state.stats.vaultSaved}`,
  ]

  return [
    'Atlas Status',
    '============',
    '',
    'Active Modules:',
    ...enabled.map(e => `  [ON] ${e}`),
    '',
    'Statistics:',
    ...statusBars.map(s => `  ${s}`),
    '',
    'Available Commands:',
    '  /atlas-echo [lite|full|ultra] - Set echo compression level',
    '  /atlas-verbose - Disable echo compression',
    '  /atlas-status - Show this status',
  ].join('\n')
}

// Fun feedback messages for when modules are working
const funMessages = {
  echo: {
    critical: 'Atlas Echo detected a critical moment and whispered a gentle reminder to keep things clear!',
    normal: (level: string) => `Atlas Echo has woven its compression magic at ${level} level. Let the token savings begin!`,
  },
  forge: {
    before: 'Atlas Forge is sharpening its tools and preparing to compress some bytes!',
    after: 'Atlas Forge has successfully compressed the output. Those bytes never saw it coming!',
  },
  vault: {
    save: 'Atlas Vault has securely stored this knowledge for future generations!',
  }
}

const atlasPlugin: Plugin = async (input: PluginInput, _options?: PluginOptions) => {
  const config = loadConfig()

  const presets = config.agents.presets[config.agents.preset]
  const agentConfigs: Record<string, AgentSdkConfig> = getAgentConfigs(presets, true)

  const client = input.client

  let vaultReady = false
  if (config.vault.enabled) {
    vaultReady = initializeVault()
  }

  return {
    'experimental.chat.system.transform': async (input, output) => {
      try {
        const sessionID = input.sessionID
        if (!sessionID) return

        const sessionState = getOrCreateSessionState(sessionID, config)
        const baseSystem = output.system.join('\n')

        if (config.echo.enabled) {
          const isCritical = shouldDisableEcho(baseSystem)
          if (isCritical) {
            output.system.push(buildDisabledPrompt())
          } else if (sessionState.agentMode === 'echo') {
            output.system.push(buildEchoPrompt(sessionState.echoLevel))
            sessionState.stats.echoInjected++
          }
        }

        if (config.vault.enabled && config.vault.injectMemoryProtocol) {
          const { buildFullVaultPrompt } = await import('@atlas-opencode/core')
          output.system.push(buildFullVaultPrompt())
        }
      } catch {
        // graceful
      }
    },

    'tool.execute.before': async (toolInput, output) => {
      try {
        const result = handleRealToolBefore(
          toolInput.tool,
          output.args as Record<string, unknown>,
          toolInput.sessionID,
          config,
        )
        if (result) {
          output.args = result
        }
      } catch {
        // graceful
      }
    },

    'tool.execute.after': async (toolInput, toolOutput) => {
      try {
        const sessionID = toolInput.sessionID
        if (!sessionID) return

        const sessionState = getOrCreateSessionState(sessionID, config)
        const args = (toolInput as Record<string, unknown>).args as Record<string, string> ?? {}

        const { compressed, vaultSaved, ratio } = handleRealToolAfter(
          toolInput.tool,
          sessionID,
          toolOutput.output,
          args,
          config,
        )

        let finalOutput = compressed

        // Apply differential compression for bash commands
        if (config.forge.enabled && compressed !== toolOutput.output) {
          const command = args['command'] ?? args['cmd'] ?? ''
          if (command) {
            const diffResult = compressDifferential(command, compressed)
            if (diffResult.wasDiff) {
              finalOutput = diffResult.result
            }
          }
        }

        // Apply read cache for file reads
        if (config.forge.enabled) {
          const toolLower = toolInput.tool.toLowerCase()
          if (toolLower.includes('read') || toolLower.includes('cat')) {
            const filePath = args['path'] ?? args['file'] ?? args['file_path'] ?? ''
            if (filePath) {
              const readResult = compressReadResult(filePath, finalOutput)
              if (readResult.wasCached) {
                finalOutput = readResult.result
              }
            }
          }
        }

        if (finalOutput !== toolOutput.output) {
          if (config.forge.showCompressionRatio && ratio > 0) {
            toolOutput.output = `[Forge: -${Math.round(ratio * 100)}%]\n${finalOutput}`
          } else {
            toolOutput.output = finalOutput
          }
          sessionState.stats.forgeCompressed++
        }

        if (vaultSaved) {
          sessionState.stats.vaultSaved++
        }

        // ── Athena Phase 3: candidates detection ──────────────────────────────
        // Safe: wrapped in own try/catch, non-blocking, non-intrusive
        try {
          const candidatesConfig = getCandidatesConfig(config)
          if (isCandidatesEnabled(candidatesConfig)) {
            const toolName = toolInput.tool
            const toolArgs = (toolInput as Record<string, unknown>).args as Record<string, unknown> ?? {}
            const toolOutputStr = toolOutput.output ?? ''

            // Record call count for repeated-pattern detection
            recordToolExecution(sessionID)

            // Analyze for candidates
            const detected = analyzeToolExecution(toolName, toolArgs, toolOutputStr, sessionID)

            // Persist to candidates.json if any found
            if (detected.length > 0) {
              persistCandidates(detected, candidatesConfig)
            }
          }
        } catch {
          // Safe: candidates detection failure does not affect tool output
        }
      } catch {
        // graceful
      }
    },

    'experimental.session.compacting': async (input, output) => {
      try {
        if (config.vault.enabled) {
          const parts = buildCompactionContext(input.sessionID, config)
          output.context.push(...parts)
        }
      } catch {
        // vault graceful
      }
    },

    // Handle commands as chat messages instead of registered commands
    // This avoids the "template empty" error and OpenCode trying to execute them
    'chat.message': async (input, output) => {
      const sessionID = input.sessionID
      if (!sessionID) return

      // Extract text from parts
      const text = output.parts
        .filter((p): p is { type: 'text'; text: string; [key: string]: unknown } => {
          const part = p as Record<string, unknown>
          return part.type === 'text' && typeof part.text === 'string'
        })
        .map(p => p.text)
        .join('')
        .trim()

      const sessionState = getOrCreateSessionState(sessionID, config)

      // Check if it's a command
      if (text.startsWith('/atlas-status')) {
        // Send status as a system/assistant message
        try {
          await client.tui.showToast({
            body: {
              title: 'Atlas Status',
              message: generateStatusMessage(sessionState, config),
              variant: 'info',
              duration: 10000,
            },
          })
        } catch {
          // graceful
        }
        output.parts.length = 0
        return
      }

      if (text.startsWith('/atlas-echo')) {
        const args = text.split(' ').slice(1)
        const newState = handleEchoCommand(
          { command: '/atlas-echo', args, session: { id: sessionID } },
          sessionState,
        )
        sessionStates.set(sessionID, newState)
        try {
          await client.tui.showToast({
            body: {
              title: 'Atlas Echo',
              message: `Echo mode set to: ${newState.echoLevel}`,
              variant: 'success',
              duration: 3000,
            },
          })
        } catch {
          // graceful
        }
        output.parts.length = 0
        return
      }

      if (text.startsWith('/atlas-verbose')) {
        const newState = handleVerboseCommand(
          { command: '/atlas-verbose', args: [], session: { id: sessionID } },
          sessionState,
        )
        sessionStates.set(sessionID, newState)
        try {
          await client.tui.showToast({
            body: {
              title: 'Atlas Echo',
              message: 'Echo compression disabled (verbose mode)',
              variant: 'success',
              duration: 3000,
            },
          })
        } catch {
          // graceful
        }
        output.parts.length = 0
        return
      }

      // Not a command - normal message processing for Vault
      if (config.vault.enabled && text.length > 0) {
        try {
          ensureSession(sessionID)
          const content = config.vault.stripPrivateTags
            ? stripPrivateTags(text)
            : text
          vaultSaveMemory(sessionID, `[User] ${content}`, 'user-prompt', 0.4)
          sessionState.stats.vaultSaved++
          
          // Send fun feedback message occasionally (every 5 messages)
          if (sessionState.stats.vaultSaved % 5 === 0 && sessionState.stats.vaultSaved > 0) {
            await client.tui.showToast({
              body: {
                message: funMessages.vault.save,
                variant: 'info',
                duration: 3000,
              },
            })
          }
        } catch {
          // vault graceful
        }
      }
    },

    config: async (opencodeConfig) => {
      // Note: default_agent is not a Config field in OpenCode 1.4.x
      // Users should set their default agent in opencode.json manually

      // Register agents
      if (!opencodeConfig.agent) {
        opencodeConfig.agent = { ...agentConfigs }
      } else {
        for (const [name, cfg] of Object.entries(agentConfigs)) {
          if (!opencodeConfig.agent[name]) {
            opencodeConfig.agent[name] = cfg
          }
        }
      }

      // DO NOT register slash commands - we handle them via chat.message
      // to avoid the "template empty" error
    },

    event: async ({ event }) => {
      try {
        // Clean up state when session is deleted
        if (event.type === 'session.deleted') {
          const ev = event as { properties: { info?: { id: string } } }
          const sessionID = ev.properties?.info?.id
          if (sessionID) {
            sessionStates.delete(sessionID)
          }
          return
        }

        const props = event as { type: string; properties: Record<string, unknown> }
        const info = props.properties?.info as { id?: string; sessionID?: string } | undefined
        const sessionID = info?.sessionID ?? info?.id
        if (!sessionID) return

        const sessionState = getOrCreateSessionState(sessionID, config)
        const result = handleRealEvent(
          event as { type: string; properties: Record<string, unknown> },
          config,
          sessionState,
        )
        if (result) {
          sessionStates.set(sessionID, result as AtlasPluginState)
        }
      } catch {
        // vault graceful
      }
    },

    ...((vaultReady || config.forge.enabled || config.athena?.enabled) ? {
      tool: {
        ...(vaultReady ? {
          mem_search: tool({
            description: 'Search persistent memories by semantic query. Returns compact results.',
            args: {
              query: tool.schema.string().describe('Search query for memories'),
              limit: tool.schema.number().describe('Max results (default 10)').optional(),
            },
            async execute(args) {
              const result = handleMemSearch(
                args.query,
                args.limit ?? 10,
                config.vault.stripPrivateTags,
              )
              return result.content
            },
          }),
          mem_timeline: tool({
            description: 'Get chronological memory entries for the current session.',
            args: {
              session_id: tool.schema.string().describe('Session ID'),
              limit: tool.schema.number().describe('Max entries (default 20)').optional(),
            },
            async execute(args) {
              const result = handleMemTimeline(args.session_id, args.limit ?? 20)
              return result.content
            },
          }),
          mem_get_observation: tool({
            description: 'Retrieve full content of a specific memory entry by ID.',
            args: {
              id: tool.schema.string().describe('Observation ID'),
            },
            async execute(args) {
              const result = handleMemGetObservation(args.id)
              return result.content
            },
          }),
          mem_save: tool({
            description: 'Save an observation to persistent memory.',
            args: {
              session_id: tool.schema.string().describe('Session ID'),
              content: tool.schema.string().describe('Content to save'),
              category: tool.schema.string().describe('Category (default: manual)').optional(),
            },
            async execute(args) {
              const result = handleMemSave(
                args.session_id,
                args.content,
                args.category ?? 'manual',
                config.vault.stripPrivateTags,
              )
              return result.content
            },
          }),
        } : {}),
        ...(config.forge.enabled ? {
          forge_stats: tool({
            description: 'Get Forge compression statistics and cache status',
            args: {},
            async execute() {
              const stats = getForgeStats(config.forge)
              return JSON.stringify(stats, null, 2)
            },
          }),
          forge_reset_cache: tool({
            description: 'Clear the Forge redundancy cache to free memory',
            args: {},
            async execute() {
              resetRedundancyCache()
              clearDiffCache()
              clearReadCache()
              return 'All Forge caches cleared (redundancy, diff, read)'
            },
          }),
        } : {}),
        ...(config.athena?.enabled ? {
          athena_list_skills: tool({
            description: 'List registered skills in Athena. Returns list of available skills.',
            args: {
              filter: tool.schema.string().describe('Filter: all, active, disabled, pending').optional(),
              tags: tool.schema.string().describe('Comma-separated tags to filter').optional(),
              limit: tool.schema.number().describe('Max results (default 20)').optional(),
              offset: tool.schema.number().describe('Results offset (default 0)').optional(),
            },
            async execute(args) {
              const athenaConfig = config.athena || { enabled: true, skills: { enabled: true } }
              if (!isSkillsEnabled(athenaConfig)) {
                return 'Athena skills module is not yet enabled.'
              }
              const paths = resolveSkillsPaths(athenaConfig.skills)
              const tags = args.tags ? args.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined
              const result = handleListSkills(
                {
                  filter: (args.filter as 'all') || 'all',
                  tags,
                  limit: args.limit ?? 20,
                  offset: args.offset ?? 0,
                },
                athenaConfig.skills,
                paths,
              )
              return result.content
            },
          }),
          athena_view_skill: tool({
            description: 'View details of a specific skill by ID.',
            args: {
              skill_id: tool.schema.string().describe('Skill ID'),
            },
            async execute(args) {
              const athenaConfig = config.athena || { enabled: true, skills: { enabled: true } }
              if (!isSkillsEnabled(athenaConfig)) {
                return 'Athena skills module is not yet enabled.'
              }
              const paths = resolveSkillsPaths(athenaConfig.skills)
              const result = handleViewSkill(args.skill_id, {}, athenaConfig.skills, paths)
              return result.content
            },
          }),
          athena_manage_skill: tool({
            description: 'Manage a skill (enable, disable, delete).',
            args: {
              action: tool.schema.string().describe('Action: enable, disable, delete'),
              skill_id: tool.schema.string().describe('Skill ID'),
            },
            async execute(args) {
              const athenaConfig = config.athena || { enabled: true, skills: { enabled: true } }
              if (!isSkillsEnabled(athenaConfig)) {
                return 'Athena skills module is not yet enabled.'
              }
              const paths = resolveSkillsPaths(athenaConfig.skills)
              const result = handleManageSkill(
                { action: args.action as 'enable', skillId: args.skill_id },
                athenaConfig.skills,
                paths,
              )
              return result.content
            },
          }),
          athena_curator_status: tool({
            description: 'Get curator status including paused state, skill counts, and statistics.',
            args: {},
            async execute() {
              const result = getCuratorStatusSkill()
              return result.content
            },
          }),
          athena_curator_run: tool({
            description: 'Run curator to evaluate skills and apply lifecycle transitions.',
            args: {
              dry_run: tool.schema.boolean().describe('Run without applying changes').optional(),
            },
            async execute(args) {
              const result = runCuratorSkill(
                config.athena?.curator,
                args.dry_run,
              )
              return result.content
            },
          }),
          athena_curator_review: tool({
            description: 'Run heuristic curator consolidation review and return summary/report.',
            args: {
              verbose: tool.schema.boolean().describe('Return full JSON report').optional(),
            },
            async execute(args) {
              const result = runCuratorReviewSkill()
              if (args.verbose && result.data) {
                return JSON.stringify(result.data, null, 2)
              }
              return result.content
            },
          }),
          athena_curator_pause: tool({
            description: 'Toggle curator pause state. Use true to pause, false to resume.',
            args: {
              paused: tool.schema.boolean().describe('Pause state: true to pause, false to resume'),
            },
            async execute(args) {
              const result = setCuratorPaused(args.paused)
              return result.content
            },
          }),
          athena_stats: tool({
            description: 'Get unified Athena telemetry stats as JSON. Returns metrics for skills, candidates, and curator.',
            args: {},
            async execute() {
              const stats = buildAthenaStats(config)
              return formatAthenaStats(stats)
            },
          }),
        } : {}),
      },
    } : {}),
  }
}

export default {
  id: 'atlas',
  server: atlasPlugin,
}
