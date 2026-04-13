import { describe, it, expect, beforeEach } from 'vitest'
import type { ForgeConfig } from '@/config/schema'
import { compressBashOutput, resetRedundancyCache } from '@/modules/forge/compressor'

function createForgeConfig(overrides: Partial<ForgeConfig> = {}): ForgeConfig {
  return {
    enabled: true,
    adaptiveIntensity: true,
    maxLines: 200,
    dedupMin: 3,
    summarizeThresholdLines: 500,
    compactThresholdTokens: 120000,
    bypass: [],
    compressMarkdown: false,
    redundancyCacheEnabled: false,
    redundancyCacheSize: 16,
    ...overrides,
  }
}

describe('Forge Compressor', () => {
  beforeEach(() => {
    resetRedundancyCache()
  })

  it('compresses output and returns metrics', () => {
    const input = Array(50).fill('repeated line').join('\n')
    const config = createForgeConfig()
    const result = compressBashOutput(input, config)

    expect(result.originalLines).toBe(50)
    expect(result.compressedLines).toBeLessThan(50)
    expect(result.ratio).toBeGreaterThan(0)
  })

  it('deduplicates repeated lines', () => {
    const input = Array(10).fill('same output').join('\n')
    const config = createForgeConfig()
    const result = compressBashOutput(input, config)

    expect(result.output).toContain('[×')
  })

  it('truncates output exceeding maxLines', () => {
    const lines = Array.from({ length: 300 }, (_, i) => `line ${i}`)
    const input = lines.join('\n')
    const config = createForgeConfig({ maxLines: 50 })
    const result = compressBashOutput(input, config)

    expect(result.compressedLines).toBeLessThanOrEqual(55)
  })

  it('summarizes very large output', () => {
    const lines = Array.from({ length: 600 }, (_, i) => `line ${i}`)
    const input = lines.join('\n')
    const config = createForgeConfig({ summarizeThresholdLines: 500 })
    const result = compressBashOutput(input, config)

    expect(result.output).toContain('[Summary of')
  })

  it('strips ANSI codes from output', () => {
    const input = '\x1B[32mcolored\x1B[0m text'
    const config = createForgeConfig()
    const result = compressBashOutput(input, config)

    expect(result.output).not.toContain('\x1B')
  })

  it('detects redundant output with cache enabled', () => {
    const config = createForgeConfig({ redundancyCacheEnabled: true })
    const input = 'npm install completed with 0 vulnerabilities'

    compressBashOutput(input, config)
    const second = compressBashOutput(input, config)

    expect(second.output).toContain('omitted')
  })

  it('handles empty input', () => {
    const config = createForgeConfig()
    const result = compressBashOutput('', config)

    expect(result.originalLines).toBe(1)
  })
})
