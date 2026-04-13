import { describe, it, expect } from 'vitest'
import type { SystemTransformContext, PluginState } from '@/types'
import type { AtlasConfig } from '@/config/schema'
import { DEFAULT_CONFIG } from '@/config/schema'
import { handleSystemTransform } from '@/hooks/system-transform'

function createCtx(overrides: Partial<SystemTransformContext> = {}): SystemTransformContext {
  return {
    system: 'Base system prompt.',
    agent: 'atlas',
    session: { id: 'test-session' },
    ...overrides,
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

function createConfig(overrides: Partial<AtlasConfig> = {}): AtlasConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
  }
}

describe('System Transform Hook', () => {
  it('preserves original system prompt', () => {
    const ctx = createCtx({ system: 'Original prompt.' })
    const result = handleSystemTransform(ctx, createConfig(), createState())
    expect(result).toContain('Original prompt.')
  })

  it('injects echo mode prompt when enabled', () => {
    const result = handleSystemTransform(
      createCtx(),
      createConfig(),
      createState({ agentMode: 'echo', echoLevel: 'full' }),
    )
    expect(result).toContain('FULL')
  })

  it('injects disabled prompt in verbose mode', () => {
    const result = handleSystemTransform(
      createCtx(),
      createConfig(),
      createState({ agentMode: 'verbose' }),
    )
    expect(result).toContain('DISABLED')
  })

  it('disables echo via auto-clarity for security content', () => {
    const ctx = createCtx({ system: 'WARNING: XSS vulnerability detected' })
    const result = handleSystemTransform(ctx, createConfig(), createState())
    expect(result).toContain('DISABLED')
  })

  it('injects agent prompt for known agents', () => {
    const ctx = createCtx({ agent: 'atlas' })
    const result = handleSystemTransform(ctx, createConfig(), createState())
    expect(result).toContain('Atlas')
  })

  it('injects vault memory protocol when enabled', () => {
    const config = createConfig({
      vault: { ...DEFAULT_CONFIG.vault, enabled: true, injectMemoryProtocol: true },
    })
    const result = handleSystemTransform(createCtx(), config, createState())
    expect(result).toContain('mem_search')
  })

  it('does not inject vault when disabled', () => {
    const config = createConfig({
      vault: { ...DEFAULT_CONFIG.vault, enabled: false },
    })
    const result = handleSystemTransform(createCtx(), config, createState())
    expect(result).not.toContain('mem_search')
  })

  it('does not inject echo when echo disabled in config', () => {
    const config = createConfig({
      echo: { ...DEFAULT_CONFIG.echo, enabled: false },
    })
    const result = handleSystemTransform(createCtx(), config, createState())
    expect(result).not.toContain('FULL')
    expect(result).not.toContain('DISABLED')
  })

  it('does not inject agent prompt for unknown agent names', () => {
    const ctx = createCtx({ agent: 'unknown-agent' })
    const result = handleSystemTransform(ctx, createConfig(), createState())
    expect(result).toContain('Base system prompt.')
  })

  it('separates sections with dividers', () => {
    const result = handleSystemTransform(createCtx(), createConfig(), createState())
    expect(result).toContain('---')
  })
})
