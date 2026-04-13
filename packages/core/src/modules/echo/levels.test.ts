import { describe, it, expect } from 'vitest'
import { getLevelDefinition, getAllLevels } from '@/modules/echo/levels'

describe('Echo Levels', () => {
  describe('getLevelDefinition', () => {
    it('returns lite level with correct name', () => {
      const level = getLevelDefinition('lite')
      expect(level.name).toBe('lite')
    })

    it('returns full level with correct name', () => {
      const level = getLevelDefinition('full')
      expect(level.name).toBe('full')
    })

    it('returns ultra level with correct name', () => {
      const level = getLevelDefinition('ultra')
      expect(level.name).toBe('ultra')
    })

    it('lite level has no abbreviations', () => {
      const level = getLevelDefinition('lite')
      expect(level.abbreviations).toHaveLength(0)
    })

    it('full level has abbreviations', () => {
      const level = getLevelDefinition('full')
      expect(level.abbreviations.length).toBeGreaterThan(0)
    })

    it('ultra level has more abbreviations than full', () => {
      const full = getLevelDefinition('full')
      const ultra = getLevelDefinition('ultra')
      expect(ultra.abbreviations.length).toBeGreaterThan(full.abbreviations.length)
    })

    it('each level has compression rules', () => {
      const levels = getAllLevels()
      for (const level of levels) {
        expect(level.compressionRules.length).toBeGreaterThan(0)
      }
    })

    it('each level has a response pattern', () => {
      const levels = getAllLevels()
      for (const level of levels) {
        expect(level.responsePattern).toBeTruthy()
      }
    })
  })

  describe('getAllLevels', () => {
    it('returns exactly 3 levels', () => {
      expect(getAllLevels()).toHaveLength(3)
    })

    it('returns levels in order: lite, full, ultra', () => {
      const levels = getAllLevels()
      expect(levels[0].name).toBe('lite')
      expect(levels[1].name).toBe('full')
      expect(levels[2].name).toBe('ultra')
    })
  })
})
