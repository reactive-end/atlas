import { describe, it, expect, beforeEach } from 'vitest'
import {
  compressDifferential,
  clearDiffCache,
  getDiffCacheSize,
} from '@/modules/forge/diff-cache'

describe('Differential Compression', () => {
  beforeEach(() => {
    clearDiffCache()
  })

  it('stores first output and returns unchanged', () => {
    const output = 'line 1\nline 2\nline 3'
    const result = compressDifferential('npm test', output)

    expect(result.wasDiff).toBe(false)
    expect(result.result).toBe(output)
    expect(getDiffCacheSize()).toBe(1)
  })

  it('returns diff when same command produces similar output', () => {
    const output1 = 'line 1\nline 2\nline 3'
    compressDifferential('npm test', output1)

    const output2 = 'line 1\nline 2 changed\nline 3'
    const result = compressDifferential('npm test', output2)

    expect(result.wasDiff).toBe(true)
    expect(result.result).toContain('diff vs last run')
  })

  it('returns identical message when output is identical', () => {
    const output = 'line 1\nline 2\nline 3'
    compressDifferential('npm build', output)

    const result = compressDifferential('npm build', output)
    expect(result.wasDiff).toBe(true)
    expect(result.result).toContain('identical')
  })

  it('normalizes command whitespace', () => {
    compressDifferential('npm   run   test', 'output A')
    const result = compressDifferential('npm run test', 'output A')

    expect(result.wasDiff).toBe(true)
  })

  it('treats different commands independently', () => {
    compressDifferential('npm test', 'test output')
    const result = compressDifferential('npm build', 'build output')

    expect(result.wasDiff).toBe(false)
    expect(getDiffCacheSize()).toBe(2)
  })

  it('clears cache', () => {
    compressDifferential('cmd1', 'output')
    compressDifferential('cmd2', 'output')
    expect(getDiffCacheSize()).toBe(2)

    clearDiffCache()
    expect(getDiffCacheSize()).toBe(0)
  })
})
