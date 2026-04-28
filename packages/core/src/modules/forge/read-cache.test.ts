import { describe, it, expect, beforeEach } from 'vitest'
import {
  compressReadResult,
  clearReadCache,
  getReadCacheSize,
} from '@/modules/forge/read-cache'

describe('Read Cache', () => {
  beforeEach(() => {
    clearReadCache()
  })

  it('returns full content on first read', () => {
    const content = 'export const foo = 1\nexport function bar() {}'
    const result = compressReadResult('/src/utils.ts', content)

    expect(result.wasCached).toBe(false)
    expect(result.result).toBe(content)
    expect(getReadCacheSize()).toBe(1)
  })

  it('returns compact summary on second read of same content', () => {
    const content = 'export const foo = 1\nexport function bar() {}'
    compressReadResult('/src/utils.ts', content)

    const result = compressReadResult('/src/utils.ts', content)
    expect(result.wasCached).toBe(true)
    expect(result.result).toContain('[File:')
    expect(result.result).toContain('unchanged')
    expect(result.result).toContain('foo')
    expect(result.result).toContain('bar')
  })

  it('returns full content when content changes', () => {
    const content1 = 'export const foo = 1'
    compressReadResult('/src/utils.ts', content1)

    const content2 = 'export const foo = 2\nexport function baz() {}'
    const result = compressReadResult('/src/utils.ts', content2)
    expect(result.wasCached).toBe(false)
    expect(result.result).toBe(content2)
  })

  it('tracks different files independently', () => {
    compressReadResult('/src/a.ts', 'export const a = 1')
    compressReadResult('/src/b.ts', 'export const b = 2')

    expect(getReadCacheSize()).toBe(2)

    const resultA = compressReadResult('/src/a.ts', 'export const a = 1')
    expect(resultA.wasCached).toBe(true)

    const resultB = compressReadResult('/src/b.ts', 'export const b = 2')
    expect(resultB.wasCached).toBe(true)
  })

  it('extracts exports correctly', () => {
    const content = [
      'export function myFunc() {}',
      'export const MY_CONST = 42',
      'export class MyClass {}',
      'export interface MyInterface {}',
      'export type MyType = string',
      'export enum MyEnum { A, B }',
    ].join('\n')

    compressReadResult('/src/module.ts', content)
    const result = compressReadResult('/src/module.ts', content)

    expect(result.result).toContain('myFunc')
    expect(result.result).toContain('MY_CONST')
    expect(result.result).toContain('MyClass')
    expect(result.result).toContain('MyInterface')
    expect(result.result).toContain('MyType')
    expect(result.result).toContain('MyEnum')
  })

  it('clears cache', () => {
    compressReadResult('/a.ts', 'a')
    compressReadResult('/b.ts', 'b')
    expect(getReadCacheSize()).toBe(2)

    clearReadCache()
    expect(getReadCacheSize()).toBe(0)
  })
})
