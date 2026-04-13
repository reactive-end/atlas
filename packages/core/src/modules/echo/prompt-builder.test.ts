import { describe, it, expect } from 'vitest'
import {
  buildEchoPrompt,
  buildAgentEchoPrompt,
  buildDisabledPrompt,
} from '@/modules/echo/prompt-builder'

describe('Prompt Builder', () => {
  describe('buildEchoPrompt', () => {
    it('includes level name for lite', () => {
      const prompt = buildEchoPrompt('lite')
      expect(prompt).toContain('LITE')
    })

    it('includes level name for full', () => {
      const prompt = buildEchoPrompt('full')
      expect(prompt).toContain('FULL')
    })

    it('includes level name for ultra', () => {
      const prompt = buildEchoPrompt('ultra')
      expect(prompt).toContain('ULTRA')
    })

    it('includes response pattern', () => {
      const prompt = buildEchoPrompt('full')
      expect(prompt).toContain('Response pattern:')
    })

    it('includes critical instruction about output-only', () => {
      const prompt = buildEchoPrompt('full')
      expect(prompt).toContain('OUTPUT only')
    })

    it('includes technical accuracy instruction', () => {
      const prompt = buildEchoPrompt('lite')
      expect(prompt).toContain('Technical accuracy must be 100%')
    })

    it('includes abbreviations for full level', () => {
      const prompt = buildEchoPrompt('full')
      expect(prompt).toContain('Abbreviations:')
    })

    it('does not include abbreviations for lite level', () => {
      const prompt = buildEchoPrompt('lite')
      expect(prompt).not.toContain('Abbreviations:')
    })
  })

  describe('buildAgentEchoPrompt', () => {
    it('prefixes agent name', () => {
      const prompt = buildAgentEchoPrompt('full', 'Pathfinder')
      expect(prompt).toContain('[Pathfinder]')
    })

    it('includes echo mode content', () => {
      const prompt = buildAgentEchoPrompt('ultra', 'Elder')
      expect(prompt).toContain('ULTRA')
    })
  })

  describe('buildDisabledPrompt', () => {
    it('indicates echo is disabled', () => {
      const prompt = buildDisabledPrompt()
      expect(prompt).toContain('DISABLED')
    })

    it('indicates normal mode', () => {
      const prompt = buildDisabledPrompt()
      expect(prompt).toContain('normally')
    })
  })
})
