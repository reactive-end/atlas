import { describe, it, expect } from 'vitest'
import {
  buildMemoryProtocolPrompt,
  buildMemoryToolsPrompt,
  buildFullVaultPrompt,
  stripPrivateTags,
} from '@/modules/vault/memory-protocol'

describe('Memory Protocol', () => {
  describe('buildMemoryProtocolPrompt', () => {
    it('includes memory search instruction', () => {
      const prompt = buildMemoryProtocolPrompt()
      expect(prompt).toContain('mem_search')
    })

    it('includes timeline instruction', () => {
      const prompt = buildMemoryProtocolPrompt()
      expect(prompt).toContain('mem_timeline')
    })

    it('includes observation retrieval', () => {
      const prompt = buildMemoryProtocolPrompt()
      expect(prompt).toContain('mem_get_observation')
    })

    it('includes save instructions', () => {
      const prompt = buildMemoryProtocolPrompt()
      expect(prompt).toContain('SAVE')
    })

    it('includes search instructions', () => {
      const prompt = buildMemoryProtocolPrompt()
      expect(prompt).toContain('SEARCH')
    })

    it('includes privacy instructions', () => {
      const prompt = buildMemoryProtocolPrompt()
      expect(prompt).toContain('private')
    })
  })

  describe('buildMemoryToolsPrompt', () => {
    it('lists available tools', () => {
      const prompt = buildMemoryToolsPrompt()
      expect(prompt).toContain('mem_search')
      expect(prompt).toContain('mem_timeline')
      expect(prompt).toContain('mem_get_observation')
      expect(prompt).toContain('mem_save')
    })
  })

  describe('buildFullVaultPrompt', () => {
    it('combines protocol and tools prompts', () => {
      const full = buildFullVaultPrompt()
      const protocol = buildMemoryProtocolPrompt()
      const tools = buildMemoryToolsPrompt()
      expect(full).toContain(protocol)
      expect(full).toContain(tools)
    })
  })

  describe('stripPrivateTags', () => {
    it('replaces private content with REDACTED', () => {
      const input = 'Public info <private>secret key 123</private> more public'
      const result = stripPrivateTags(input)
      expect(result).toContain('[REDACTED]')
      expect(result).not.toContain('secret key 123')
    })

    it('handles multiple private tags', () => {
      const input = '<private>a</private> text <private>b</private>'
      const result = stripPrivateTags(input)
      expect(result).toBe('[REDACTED] text [REDACTED]')
    })

    it('handles multiline private content', () => {
      const input = '<private>\nline1\nline2\n</private>'
      const result = stripPrivateTags(input)
      expect(result).toBe('[REDACTED]')
    })

    it('preserves text without private tags', () => {
      const input = 'Nothing secret here'
      expect(stripPrivateTags(input)).toBe(input)
    })

    it('handles empty input', () => {
      expect(stripPrivateTags('')).toBe('')
    })
  })
})
