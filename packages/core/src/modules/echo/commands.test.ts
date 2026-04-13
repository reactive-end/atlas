import { describe, it, expect } from 'vitest'
import type { CommandContext, PluginState } from '@/types'
import {
  handleEchoCommand,
  handleVerboseCommand,
  isAtlasCommand,
} from '@/modules/echo/commands'

function createCommandCtx(command: string, args: string[] = []): CommandContext {
  return {
    command,
    args,
    session: { id: 'test-session' },
  }
}

function createState(overrides: Partial<PluginState> = {}): PluginState {
  return {
    echoLevel: 'full',
    agentMode: 'echo',
    activePreset: 'default',
    ...overrides,
  }
}

describe('Echo Commands', () => {
  describe('handleEchoCommand', () => {
    it('sets agentMode to echo', () => {
      const state = createState({ agentMode: 'verbose' })
      const result = handleEchoCommand(createCommandCtx('/atlas-echo'), state)
      expect(result.agentMode).toBe('echo')
    })

    it('preserves current echo level when no arg', () => {
      const state = createState({ echoLevel: 'ultra' })
      const result = handleEchoCommand(createCommandCtx('/atlas-echo'), state)
      expect(result.echoLevel).toBe('ultra')
    })

    it('changes level when valid arg provided', () => {
      const state = createState({ echoLevel: 'full' })
      const result = handleEchoCommand(createCommandCtx('/atlas-echo', ['lite']), state)
      expect(result.echoLevel).toBe('lite')
    })

    it('accepts ultra as level arg', () => {
      const state = createState()
      const result = handleEchoCommand(createCommandCtx('/atlas-echo', ['ultra']), state)
      expect(result.echoLevel).toBe('ultra')
    })

    it('ignores invalid level arg and keeps current', () => {
      const state = createState({ echoLevel: 'full' })
      const result = handleEchoCommand(createCommandCtx('/atlas-echo', ['invalid']), state)
      expect(result.echoLevel).toBe('full')
    })

    it('preserves activePreset', () => {
      const state = createState({ activePreset: 'premium' })
      const result = handleEchoCommand(createCommandCtx('/atlas-echo'), state)
      expect(result.activePreset).toBe('premium')
    })
  })

  describe('handleVerboseCommand', () => {
    it('sets agentMode to verbose', () => {
      const state = createState({ agentMode: 'echo' })
      const result = handleVerboseCommand(createCommandCtx('/atlas-verbose'), state)
      expect(result.agentMode).toBe('verbose')
    })

    it('preserves echo level', () => {
      const state = createState({ echoLevel: 'ultra' })
      const result = handleVerboseCommand(createCommandCtx('/atlas-verbose'), state)
      expect(result.echoLevel).toBe('ultra')
    })
  })

  describe('isAtlasCommand', () => {
    it('recognizes /atlas-echo', () => {
      expect(isAtlasCommand('/atlas-echo')).toBe(true)
    })

    it('recognizes /atlas-verbose', () => {
      expect(isAtlasCommand('/atlas-verbose')).toBe(true)
    })

    it('rejects unknown commands', () => {
      expect(isAtlasCommand('/unknown')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isAtlasCommand('')).toBe(false)
    })
  })
})
