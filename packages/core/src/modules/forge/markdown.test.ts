import { describe, it, expect } from 'vitest'
import { compressMarkdown } from '@/modules/forge/markdown'

describe('Markdown Compression', () => {
  it('removes filler words from prose', () => {
    const input = 'This is basically just a simple test'
    const result = compressMarkdown(input)
    expect(result).not.toContain('basically')
    expect(result).not.toContain('just')
    expect(result).not.toContain('simply')
  })

  it('removes articles', () => {
    const input = 'The function returns a value from an array'
    const result = compressMarkdown(input)
    expect(result).not.toMatch(/\bThe\b/)
    expect(result).not.toMatch(/\ba\b/i)
    expect(result).not.toMatch(/\ban\b/i)
  })

  it('preserves code blocks', () => {
    const input = '```\nconst the = "keep this"\n```'
    const result = compressMarkdown(input)
    expect(result).toContain('const the = "keep this"')
  })

  it('preserves inline code', () => {
    const input = 'Use `the_variable` in your code'
    const result = compressMarkdown(input)
    expect(result).toContain('`the_variable`')
  })

  it('preserves URLs', () => {
    const input = 'Visit https://example.com/the/path for details'
    const result = compressMarkdown(input)
    expect(result).toContain('https://example.com/the/path')
  })

  it('preserves headings', () => {
    const input = '## The Main Section\nSome text here'
    const result = compressMarkdown(input)
    expect(result).toContain('## The Main Section')
  })

  it('handles empty input', () => {
    expect(compressMarkdown('')).toBe('')
  })

  it('handles input with only code blocks', () => {
    const input = '```\ncode only\n```'
    const result = compressMarkdown(input)
    expect(result).toContain('code only')
  })
})
