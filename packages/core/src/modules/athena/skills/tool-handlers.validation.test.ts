// Validation tests for tool-handlers hardening
// Tests for limit/offset/skillId/action validation functions

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validateLimit,
  validateOffset,
  validateSkillId,
  validateAction,
} from '@/modules/athena/skills/tool-handlers'

describe('validateLimit', () => {
  it('returns default for invalid input', () => {
    expect(validateLimit(undefined)).toBe(1)
    expect(validateLimit(null)).toBe(1)
    expect(validateLimit('invalid')).toBe(1)
    expect(validateLimit(0)).toBe(1)
    expect(validateLimit(-5)).toBe(1)
  })

  it('returns value when within bounds', () => {
    expect(validateLimit(10)).toBe(10)
    expect(validateLimit(1)).toBe(1)
    expect(validateLimit(50)).toBe(50)
  })

  it('caps at MAX_LIMIT', () => {
    expect(validateLimit(200)).toBe(100)
    expect(validateLimit(101)).toBe(100)
    expect(validateLimit(100)).toBe(100)
  })

  it('parses string input', () => {
    expect(validateLimit('25')).toBe(25)
    expect(validateLimit('  30  ')).toBe(30)
  })
})

describe('validateOffset', () => {
  it('returns 0 for invalid input', () => {
    expect(validateOffset(undefined)).toBe(0)
    expect(validateOffset(null)).toBe(0)
    expect(validateOffset('invalid')).toBe(0)
    expect(validateOffset(-5)).toBe(0)
  })

  it('returns value when non-negative', () => {
    expect(validateOffset(0)).toBe(0)
    expect(validateOffset(10)).toBe(10)
    expect(validateOffset(1000)).toBe(1000)
  })

  it('parses string input', () => {
    expect(validateOffset('50')).toBe(50)
    expect(validateOffset('  100  ')).toBe(100)
  })
})

describe('validateSkillId', () => {
  it('returns null for invalid input', () => {
    expect(validateSkillId(undefined)).toBe(null)
    expect(validateSkillId(null)).toBe(null)
    expect(validateSkillId('')).toBe(null)
    expect(validateSkillId('   ')).toBe(null)
    expect(validateSkillId(123)).toBe(null)
  })

  it('returns trimmed string for valid input', () => {
    expect(validateSkillId('skill-123')).toBe('skill-123')
    expect(validateSkillId('  my-skill  ')).toBe('my-skill')
  })
})

describe('validateAction', () => {
  it('returns null for invalid input', () => {
    expect(validateAction(undefined)).toBe(null)
    expect(validateAction(null)).toBe(null)
    expect(validateAction('')).toBe(null)
    expect(validateAction('UNKNOWN')).toBe(null)
    expect(validateAction('deletee')).toBe(null)
  })

  it('returns normalized action for valid input', () => {
    expect(validateAction('enable')).toBe('enable')
    expect(validateAction('ENABLE')).toBe('enable')
    expect(validateAction('  enable  ')).toBe('enable')
    expect(validateAction('disable')).toBe('disable')
    expect(validateAction('delete')).toBe('delete')
  })
})