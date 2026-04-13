import { describe, it, expect } from 'vitest'
import type { ToolBeforeContext, CommandContext, PluginState } from '@/types'
import { DEFAULT_CONFIG } from '@/config/schema'
import { handleToolBefore } from '@/hooks/tool-before'
import { handleEchoCommand, handleVerboseCommand } from '@/modules/echo/commands'

describe('Integration Tests', () => {
  describe('Forge + Tool Before Hook', () => {
    it('passes through non-bash tools unchanged', () => {
      const ctx: ToolBeforeContext = {
        tool: 'file_read',
        args: { path: '/some/file.ts' },
        session: { id: 'test' },
      }
      const result = handleToolBefore(ctx, DEFAULT_CONFIG)
      expect(result).toEqual({})
    })

    it('processes bash tool commands', () => {
      const ctx: ToolBeforeContext = {
        tool: 'bash',
        args: { command: 'ls -la' },
        session: { id: 'test' },
      }
      const result = handleToolBefore(ctx, DEFAULT_CONFIG)
      expect(result).toBeDefined()
    })

    it('bypasses docker exec commands', () => {
      const ctx: ToolBeforeContext = {
        tool: 'bash',
        args: { command: 'docker exec -it container bash' },
        session: { id: 'test' },
      }
      const result = handleToolBefore(ctx, DEFAULT_CONFIG)
      expect(result).toEqual({})
    })

    it('bypasses commands already using forge', () => {
      const ctx: ToolBeforeContext = {
        tool: 'bash',
        args: { command: 'ls | forge wrap' },
        session: { id: 'test' },
      }
      const result = handleToolBefore(ctx, DEFAULT_CONFIG)
      expect(result).toEqual({})
    })

    it('does nothing when forge is disabled', () => {
      const config = {
        ...DEFAULT_CONFIG,
        forge: { ...DEFAULT_CONFIG.forge, enabled: false },
      }
      const ctx: ToolBeforeContext = {
        tool: 'bash',
        args: { command: 'ls -la' },
        session: { id: 'test' },
      }
      const result = handleToolBefore(ctx, config)
      expect(result).toEqual({})
    })
  })

  describe('Command Mode Switching', () => {
    it('switches from verbose to echo and back', () => {
      let state: PluginState = {
        echoLevel: 'full',
        agentMode: 'verbose',
        activePreset: 'default',
      }

      const echoCtx: CommandContext = {
        command: '/atlas-echo',
        args: [],
        session: { id: 'test' },
      }
      state = handleEchoCommand(echoCtx, state)
      expect(state.agentMode).toBe('echo')

      const verboseCtx: CommandContext = {
        command: '/atlas-verbose',
        args: [],
        session: { id: 'test' },
      }
      state = handleVerboseCommand(verboseCtx, state)
      expect(state.agentMode).toBe('verbose')
    })

    it('echo command with level arg updates level', () => {
      let state: PluginState = {
        echoLevel: 'full',
        agentMode: 'verbose',
        activePreset: 'default',
      }

      const ctx: CommandContext = {
        command: '/atlas-echo',
        args: ['ultra'],
        session: { id: 'test' },
      }
      state = handleEchoCommand(ctx, state)
      expect(state.agentMode).toBe('echo')
      expect(state.echoLevel).toBe('ultra')
    })

    it('verbose command preserves echo level for future use', () => {
      let state: PluginState = {
        echoLevel: 'ultra',
        agentMode: 'echo',
        activePreset: 'default',
      }

      const ctx: CommandContext = {
        command: '/atlas-verbose',
        args: [],
        session: { id: 'test' },
      }
      state = handleVerboseCommand(ctx, state)
      expect(state.agentMode).toBe('verbose')
      expect(state.echoLevel).toBe('ultra')
    })
  })
})
