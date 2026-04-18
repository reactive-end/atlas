// Atlas Plugin for OpenCode
// Registers 18 agents (Atlas orchestrator + 17 specialists) via config hook
// Place in ~/.config/opencode/plugins/ or .opencode/plugins/

import { type Plugin, type PluginInput, type PluginOptions, tool } from '@opencode-ai/plugin'
import type { AgentSdkConfig } from '@atlas-opencode/core'

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
  vaultSaveObservation,
  stripPrivateTags,
  buildEchoPrompt,
  buildDisabledPrompt,
  shouldDisableEcho,
  handleMemSearch,
  handleMemTimeline,
  handleMemGetObservation,
  handleMemSave,
  initializeVault,
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

function getOrCreateSessionState(sessionID: string, config: any): AtlasPluginState {
  if (!sessionStates.has(sessionID)) {
    sessionStates.set(sessionID, createInitialState(config))
  }
  return sessionStates.get(sessionID)!
}

function generateStatusMessage(state: AtlasPluginState): string {
  const enabled = []

  if (state.agentMode === 'echo') {
    enabled.push(`Echo: ${state.echoLevel} mode`)
  } else {
    enabled.push('Echo: verbose mode')
  }

  enabled.push('Vault: active')
  enabled.push('Forge: compressing outputs')

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

        const { compressed, vaultSaved } = handleRealToolAfter(
          toolInput.tool,
          sessionID,
          toolOutput.output,
          args,
          config,
        )

        if (compressed !== toolOutput.output) {
          toolOutput.output = compressed
          sessionState.stats.forgeCompressed++
        }

        if (vaultSaved) {
          sessionState.stats.vaultSaved++
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
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text || '')
        .join('')
        .trim()

      const sessionState = getOrCreateSessionState(sessionID, config)

      // Check if it's a command
      if (text.startsWith('/atlas-status')) {
        // Send status as a system/assistant message
        try {
          await client.sendMessage({
            role: 'assistant',
            parts: [{ type: 'text', text: generateStatusMessage(sessionState) }],
          })
        } catch {
          // graceful
        }
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
          await client.sendMessage({
            role: 'assistant',
            parts: [{ type: 'text', text: `Atlas Echo mode set to: ${newState.echoLevel}` }],
          })
        } catch {
          // graceful
        }
        return
      }

      if (text.startsWith('/atlas-verbose')) {
        const newState = handleVerboseCommand(
          { command: '/atlas-verbose', args: [], session: { id: sessionID } },
          sessionState,
        )
        sessionStates.set(sessionID, newState)
        try {
          await client.sendMessage({
            role: 'assistant',
            parts: [{ type: 'text', text: 'Atlas Echo mode disabled (verbose mode)' }],
          })
        } catch {
          // graceful
        }
        return
      }

      // Not a command - normal message processing for Vault
      if (config.vault.enabled && text.length > 0) {
        try {
          ensureSession(sessionID)
          const content = config.vault.stripPrivateTags
            ? stripPrivateTags(text)
            : text
          vaultSaveObservation(sessionID, `[User] ${content}`, 'user-prompt')
          
          // Send fun feedback message occasionally (every 5 messages)
          if (sessionState.stats.vaultSaved % 5 === 0 && sessionState.stats.vaultSaved > 0) {
            await client.sendMessage({
              role: 'assistant',
              parts: [{ type: 'text', text: funMessages.vault.save }],
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
          const ev = event as { properties: { sessionID?: string } }
          const sessionID = ev.properties?.sessionID
          if (sessionID) {
            sessionStates.delete(sessionID)
          }
          return
        }

        const sessionID = (event as any).properties?.sessionID
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

    ...(vaultReady ? {
      tool: {
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
      },
    } : {}),
  }
}

export default {
  id: 'atlas',
  server: atlasPlugin,
}
