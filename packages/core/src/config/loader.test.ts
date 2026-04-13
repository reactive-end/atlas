import { describe, it, expect } from 'vitest'
import { loadConfig } from '@/config/loader'
import { DEFAULT_CONFIG } from '@/config/schema'

describe('Config Loader', () => {
  it('returns default config when no file exists', () => {
    const config = loadConfig()
    expect(config.echo.enabled).toBe(DEFAULT_CONFIG.echo.enabled)
    expect(config.echo.defaultLevel).toBe(DEFAULT_CONFIG.echo.defaultLevel)
  })

  it('returns correct default echo config', () => {
    const config = loadConfig()
    expect(config.echo.enabled).toBe(true)
    expect(config.echo.defaultLevel).toBe('full')
    expect(config.echo.autoClarityEnabled).toBe(true)
  })

  it('returns correct default agents config', () => {
    const config = loadConfig()
    expect(config.agents.enabled).toBe(true)
    expect(config.agents.preset).toBe('default')
    expect(config.agents.defaultMode).toBe('echo')
    expect(config.agents.forceEchoOnAll).toBe(true)
  })

  it('returns correct default forge config', () => {
    const config = loadConfig()
    expect(config.forge.enabled).toBe(true)
    expect(config.forge.maxLines).toBe(200)
    expect(config.forge.dedupMin).toBe(3)
  })

  it('returns correct default vault config', () => {
    const config = loadConfig()
    expect(config.vault.enabled).toBe(true)
    expect(config.vault.injectMemoryProtocol).toBe(true)
    expect(config.vault.stripPrivateTags).toBe(true)
  })

  it('default config has all four presets', () => {
    const config = loadConfig()
    expect(config.agents.presets).toHaveProperty('default')
    expect(config.agents.presets).toHaveProperty('performance')
    expect(config.agents.presets).toHaveProperty('economy')
    expect(config.agents.presets).toHaveProperty('premium')
  })

  it('each preset has all 7 agents', () => {
    const config = loadConfig()
    const agentNames = ['atlas', 'pathfinder', 'archivist', 'elder', 'artisan', 'mender', 'tribunal']

    for (const presetName of Object.keys(config.agents.presets)) {
      const preset = config.agents.presets[presetName as keyof typeof config.agents.presets]
      for (const agentName of agentNames) {
        expect(preset).toHaveProperty(agentName)
      }
    }
  })

  it('default preset has models defined', () => {
    const config = loadConfig()
    const defaultPreset = config.agents.presets.default
    expect(defaultPreset['atlas'].model).toBeDefined()
    expect(defaultPreset['atlas'].model.length).toBeGreaterThan(0)
    expect(defaultPreset['pathfinder'].model).toBeDefined()
    expect(defaultPreset['pathfinder'].model.length).toBeGreaterThan(0)
  })

  it('premium preset uses claude opus for all agents', () => {
    const config = loadConfig()
    const premiumPreset = config.agents.presets.premium
    for (const agent of Object.values(premiumPreset)) {
      expect(agent.model).toContain('claude-opus')
    }
  })
})
