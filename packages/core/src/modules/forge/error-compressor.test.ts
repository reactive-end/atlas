import { describe, it, expect } from 'vitest'
import { compressErrors } from '@/modules/forge/error-compressor'

describe('Error Compressor', () => {
  it('groups identical TypeScript errors by code and message', () => {
    const input = [
      'src/a.ts(10,5): error TS2304: Cannot find name \'foo\'',
      'src/a.ts(15,5): error TS2304: Cannot find name \'foo\'',
      'src/b.ts(10,5): error TS2304: Cannot find name \'foo\'',
      'src/b.ts(15,5): error TS2304: Cannot find name \'foo\'',
      'src/c.ts(5,5): error TS2304: Cannot find name \'foo\'',
      'src/c.ts(10,5): error TS2304: Cannot find name \'foo\'',
    ].join('\n')

    const result = compressErrors(input)
    expect(result).toContain('TS2304')
    expect(result).toContain('×6')
  })

  it('preserves non-error lines as header/footer', () => {
    const input = [
      'Running tsc...',
      'src/a.ts(10,5): error TS2304: Cannot find name \'x\'',
      'src/a.ts(11,5): error TS2304: Cannot find name \'y\'',
      'src/a.ts(12,5): error TS2304: Cannot find name \'z\'',
      'src/a.ts(13,5): error TS2304: Cannot find name \'w\'',
      'src/a.ts(14,5): error TS2304: Cannot find name \'v\'',
      'Found 5 errors.',
    ].join('\n')

    const result = compressErrors(input)
    expect(result).toContain('Running tsc...')
    expect(result).toContain('Found 5 errors.')
    expect(result).toContain('TS2304')
  })

  it('returns original text when error density is low', () => {
    const input = [
      'Running tests...',
      'Test 1 passed',
      'Test 2 passed',
      'Test 3 passed',
      'src/a.ts(10,5): error TS2304: Cannot find name \'foo\'',
      'All other tests passed',
    ].join('\n')

    const result = compressErrors(input)
    expect(result).toBe(input) // Not enough errors to trigger compression
  })

  it('handles empty input', () => {
    expect(compressErrors('')).toBe('')
  })

  it('groups errors from multiple files', () => {
    const input = [
      'src/a.ts(1,1): error TS2304: Cannot find name \'x\'',
      'src/b.ts(2,1): error TS2304: Cannot find name \'x\'',
      'src/c.ts(3,1): error TS2304: Cannot find name \'x\'',
      'src/d.ts(4,1): error TS2304: Cannot find name \'x\'',
      'src/e.ts(5,1): error TS2304: Cannot find name \'x\'',
    ].join('\n')

    const result = compressErrors(input)
    expect(result).toContain('×5')
    expect(result).toContain('src/a.ts')
    expect(result).toContain('src/e.ts')
  })
})
