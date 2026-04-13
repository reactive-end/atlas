import { describe, it, expect } from 'vitest'
import { deduplicateLines } from '@/modules/forge/dedup'

describe('Forge Dedup', () => {
  it('collapses repeated lines above threshold', () => {
    const input = 'ok\nok\nok\nok\nend'
    const result = deduplicateLines(input, 3)
    expect(result.text).toContain('[×4]')
    expect(result.text).toContain('end')
  })

  it('reports correct lines removed', () => {
    const input = 'a\na\na\na\nb'
    const result = deduplicateLines(input, 3)
    expect(result.linesRemoved).toBe(3)
  })

  it('does not collapse lines below threshold', () => {
    const input = 'a\na\nb'
    const result = deduplicateLines(input, 3)
    expect(result.text).not.toContain('[×')
    expect(result.linesRemoved).toBe(0)
  })

  it('handles exactly the threshold count', () => {
    const input = 'x\nx\nx\nend'
    const result = deduplicateLines(input, 3)
    expect(result.text).toContain('[×3]')
  })

  it('handles multiple groups of repeated lines', () => {
    const input = 'a\na\na\nb\nb\nb\nc'
    const result = deduplicateLines(input, 3)
    expect(result.text).toContain('a [×3]')
    expect(result.text).toContain('b [×3]')
    expect(result.text).toContain('c')
  })

  it('skips empty lines for dedup', () => {
    const input = '\n\n\na'
    const result = deduplicateLines(input, 3)
    expect(result.text).toContain('a')
    expect(result.linesRemoved).toBe(0)
  })

  it('handles single line input', () => {
    const input = 'only line'
    const result = deduplicateLines(input, 3)
    expect(result.text).toBe('only line')
    expect(result.linesRemoved).toBe(0)
  })

  it('handles empty input', () => {
    const result = deduplicateLines('', 3)
    expect(result.linesRemoved).toBe(0)
  })
})
