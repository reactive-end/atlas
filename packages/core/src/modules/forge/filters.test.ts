import { describe, it, expect } from 'vitest'
import {
  stripAnsi,
  stripProgressBars,
  stripTimestamps,
  collapseBlankLines,
  smartFilter,
} from '@/modules/forge/filters'

describe('Forge Filters', () => {
  describe('stripAnsi', () => {
    it('removes ANSI color codes', () => {
      const input = '\x1B[32mSuccess\x1B[0m'
      expect(stripAnsi(input)).toBe('Success')
    })

    it('removes cursor control sequences', () => {
      const input = '\x1B[2AMoving up'
      expect(stripAnsi(input)).toBe('Moving up')
    })

    it('preserves plain text', () => {
      const input = 'Hello World'
      expect(stripAnsi(input)).toBe('Hello World')
    })

    it('handles multiple ANSI codes', () => {
      const input = '\x1B[1m\x1B[31mBold Red\x1B[0m Normal'
      expect(stripAnsi(input)).toBe('Bold Red Normal')
    })
  })

  describe('stripProgressBars', () => {
    it('removes lines with percentage indicators', () => {
      const input = 'Downloading... 45% =====>'
      const result = stripProgressBars(input)
      expect(result).not.toContain('45%')
    })

    it('keeps non-progress lines intact', () => {
      const input = 'Header\nProgress 45% ===>\nFooter'
      const result = stripProgressBars(input)
      expect(result).toContain('Header')
      expect(result).toContain('Footer')
      expect(result).not.toContain('45%')
    })

    it('preserves non-progress lines', () => {
      const input = 'Installing packages\nCompleted'
      expect(stripProgressBars(input)).toBe(input)
    })
  })

  describe('stripTimestamps', () => {
    it('removes ISO timestamps', () => {
      const input = '2024-01-15T10:30:00Z Starting server'
      const result = stripTimestamps(input)
      expect(result).not.toContain('2024-01-15')
      expect(result).toContain('Starting server')
    })

    it('removes datetime with space separator', () => {
      const input = '2024-01-15 10:30:00 Log entry'
      const result = stripTimestamps(input)
      expect(result).toContain('Log entry')
    })
  })

  describe('collapseBlankLines', () => {
    it('collapses 3+ blank lines to 2', () => {
      const input = 'A\n\n\n\nB'
      expect(collapseBlankLines(input)).toBe('A\n\nB')
    })

    it('preserves double blank lines', () => {
      const input = 'A\n\nB'
      expect(collapseBlankLines(input)).toBe('A\n\nB')
    })
  })

  describe('smartFilter', () => {
    it('applies all filters in sequence', () => {
      const input = '\x1B[32mColored text\x1B[0m\n2024-01-15T10:00:00Z Log entry\nClean line here'
      const result = smartFilter(input)
      expect(result).not.toContain('\x1B')
      expect(result).not.toContain('2024-01-15')
      expect(result).toContain('Colored text')
      expect(result).toContain('Clean line here')
    })

    it('trims result', () => {
      const input = '  Hello  '
      expect(smartFilter(input)).toBe('Hello')
    })

    it('handles empty input', () => {
      expect(smartFilter('')).toBe('')
    })
  })
})
