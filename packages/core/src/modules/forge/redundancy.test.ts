import { describe, it, expect, beforeEach } from 'vitest'
import { RedundancyCache } from '@/modules/forge/redundancy'

describe('RedundancyCache', () => {
  let cache: RedundancyCache

  beforeEach(() => {
    cache = new RedundancyCache(16)
  })

  it('starts empty', () => {
    expect(cache.size).toBe(0)
  })

  it('detects exact duplicate after add', () => {
    const text = 'npm install completed successfully'
    cache.add(text)
    expect(cache.isDuplicate(text)).toBe(true)
  })

  it('does not detect non-duplicate', () => {
    cache.add('First output')
    expect(cache.isDuplicate('Completely different output')).toBe(false)
  })

  it('detects fuzzy similar content', () => {
    const text1 = 'Installing package foo bar baz qux quux corge grault garply'
    const text2 = 'Installing package foo bar baz qux quux corge grault garply waldo'
    cache.add(text1)
    expect(cache.isDuplicate(text2)).toBe(true)
  })

  it('respects max size', () => {
    const smallCache = new RedundancyCache(3)
    smallCache.add('output 1')
    smallCache.add('output 2')
    smallCache.add('output 3')
    smallCache.add('output 4')
    expect(smallCache.size).toBe(3)
  })

  it('evicts oldest entries when full', () => {
    const smallCache = new RedundancyCache(2)
    smallCache.add('first unique output text here for hashing')
    smallCache.add('second unique output text here for hashing')
    smallCache.add('third unique output text here for hashing')
    expect(smallCache.isDuplicate('first unique output text here for hashing')).toBe(false)
  })

  it('clears all entries', () => {
    cache.add('some output')
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.isDuplicate('some output')).toBe(false)
  })
})
