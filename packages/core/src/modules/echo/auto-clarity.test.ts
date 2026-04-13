import { describe, it, expect } from 'vitest'
import { shouldDisableEcho, getDisableReason } from '@/modules/echo/auto-clarity'

describe('Auto-Clarity', () => {
  describe('shouldDisableEcho', () => {
    it('returns true for security-related content', () => {
      expect(shouldDisableEcho('Found XSS vulnerability in input')).toBe(true)
    })

    it('returns true for injection mentions', () => {
      expect(shouldDisableEcho('SQL injection detected')).toBe(true)
    })

    it('returns true for authentication bypass', () => {
      expect(shouldDisableEcho('authentication bypass possible')).toBe(true)
    })

    it('returns true for irreversible actions', () => {
      expect(shouldDisableEcho('Running rm -rf on production')).toBe(true)
    })

    it('returns true for drop table commands', () => {
      expect(shouldDisableEcho('About to drop table users')).toBe(true)
    })

    it('returns true for force push warnings', () => {
      expect(shouldDisableEcho('git force push to main branch')).toBe(true)
    })

    it('returns true for WARNING patterns', () => {
      expect(shouldDisableEcho('WARNING: this action is dangerous')).toBe(true)
    })

    it('returns true for CRITICAL patterns', () => {
      expect(shouldDisableEcho('CRITICAL security issue found')).toBe(true)
    })

    it('returns true for BREAKING CHANGE', () => {
      expect(shouldDisableEcho('BREAKING CHANGE in API v2')).toBe(true)
    })

    it('returns false for normal code content', () => {
      expect(shouldDisableEcho('Refactoring the utils module')).toBe(false)
    })

    it('returns false for regular implementation tasks', () => {
      expect(shouldDisableEcho('Add new button component')).toBe(false)
    })

    it('returns false for empty content', () => {
      expect(shouldDisableEcho('')).toBe(false)
    })
  })

  describe('getDisableReason', () => {
    it('returns security-context for security keywords', () => {
      expect(getDisableReason('XSS vulnerability')).toBe('security-context')
    })

    it('returns irreversible-action for destructive commands', () => {
      expect(getDisableReason('rm -rf /')).toBe('irreversible-action')
    })

    it('returns warning-detected for warning patterns', () => {
      expect(getDisableReason('WARNING: disk full')).toBe('warning-detected')
    })

    it('returns null for safe content', () => {
      expect(getDisableReason('Add CSS styles')).toBeNull()
    })
  })
})
