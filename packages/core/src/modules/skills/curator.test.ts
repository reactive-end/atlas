// Tests for Skills Curator module
// Covers lifecycle transitions, pinned skills, and pause functionality

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { runCurator, getCuratorStatus, setCuratorPaused, touchSkill, togglePinned, isCuratorPaused, setTestOverridePath } from './curator'
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// Test paths
const TEST_DIR = join(homedir(), '.athena-test-curator')
const CURATOR_STATE_PATH = join(TEST_DIR, 'curator-state.json')
const USAGE_PATH = join(TEST_DIR, 'usage.json')

describe('Skills Curator', () => {
  beforeEach(() => {
    // Setup test directory
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true })
    }

    // Initialize empty state files
    writeFileSync(CURATOR_STATE_PATH, JSON.stringify({
      version: '1.0.0',
      paused: false,
      lastRunAt: null,
      counters: { totalStaled: 0, totalArchived: 0, totalReactivated: 0, runCount: 0 },
    }), 'utf-8')

    writeFileSync(USAGE_PATH, JSON.stringify({
      version: '1.0.0',
      skills: [],
      lastUpdated: Date.now(),
    }), 'utf-8')

    // Set test override path
    setTestOverridePath(TEST_DIR)
  })

  afterEach(() => {
    // Clear test override
    setTestOverridePath(null)

    // Cleanup test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  describe('touchSkill', () => {
    it('should create a new skill record when touched', () => {
      touchSkill('skill-1', 'Test Skill')

      const usage = JSON.parse(readFileSync(USAGE_PATH, 'utf-8'))
      expect(usage.skills).toHaveLength(1)
      expect(usage.skills[0].skillId).toBe('skill-1')
      expect(usage.skills[0].skillName).toBe('Test Skill')
      expect(usage.skills[0].state).toBe('active')
      expect(usage.skills[0].pinned).toBe(false)
      expect(usage.skills[0].useCount).toBe(1)
    })

    it('should increment use count when touched multiple times', () => {
      touchSkill('skill-1', 'Test Skill')
      touchSkill('skill-1', 'Test Skill')

      const usage = JSON.parse(readFileSync(USAGE_PATH, 'utf-8'))
      expect(usage.skills[0].useCount).toBe(2)
    })
  })

  describe('togglePinned', () => {
    it('should toggle pinned state of existing skill', () => {
      touchSkill('skill-1', 'Test Skill')

      const isPinned = togglePinned('skill-1')
      expect(isPinned).toBe(true)

      const usage = JSON.parse(readFileSync(USAGE_PATH, 'utf-8'))
      expect(usage.skills[0].pinned).toBe(true)

      const isPinned2 = togglePinned('skill-1')
      expect(isPinned2).toBe(false)
    })

    it('should return false for non-existent skill', () => {
      const result = togglePinned('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('runCurator', () => {
    it('should return paused error when curator is paused', () => {
      setCuratorPaused(true)

      const result = runCurator({ enabled: true })

      expect(result.success).toBe(false)
      expect(result.content).toContain('paused')
    })

    it('should return not enabled error when config disabled', () => {
      const result = runCurator({ enabled: false })

      expect(result.success).toBe(false)
      expect(result.content).toContain('not enabled')
    })

    it('should not transition pinned skills', () => {
      // Create a stale skill (old lastUsedAt)
      const oldTimestamp = Date.now() - 60 * 86_400_000 // 60 days ago

      writeFileSync(USAGE_PATH, JSON.stringify({
        version: '1.0.0',
        skills: [
          {
            skillId: 'pinned-skill',
            skillName: 'Pinned Skill',
            lastUsedAt: oldTimestamp,
            state: 'active',
            pinned: true,
            useCount: 1,
            stateChangedAt: oldTimestamp,
          },
          {
            skillId: 'normal-skill',
            skillName: 'Normal Skill',
            lastUsedAt: oldTimestamp,
            state: 'active',
            pinned: false,
            useCount: 1,
            stateChangedAt: oldTimestamp,
          },
        ],
        lastUpdated: Date.now(),
      }), 'utf-8')

      const result = runCurator({
        enabled: true,
        staleAfterDays: 30,
        archiveAfterDays: 90,
      })

      expect(result.success).toBe(true)
      expect(result.data?.transitions).toBe(1)
      expect(result.data?.pinnedSkipped).toBe(1)

      const usage = JSON.parse(readFileSync(USAGE_PATH, 'utf-8'))
      const pinnedSkill = usage.skills.find((s: { skillId: string }) => s.skillId === 'pinned-skill')
      const normalSkill = usage.skills.find((s: { skillId: string }) => s.skillId === 'normal-skill')

      expect(pinnedSkill.state).toBe('active')
      expect(normalSkill.state).toBe('stale')
    })

    it('should transition active -> stale after staleAfterDays', () => {
      const oldTimestamp = Date.now() - 35 * 86_400_000 // 35 days ago

      writeFileSync(USAGE_PATH, JSON.stringify({
        version: '1.0.0',
        skills: [
          {
            skillId: 'old-skill',
            skillName: 'Old Skill',
            lastUsedAt: oldTimestamp,
            state: 'active',
            pinned: false,
            useCount: 1,
            stateChangedAt: oldTimestamp,
          },
        ],
        lastUpdated: Date.now(),
      }), 'utf-8')

      const result = runCurator({
        enabled: true,
        staleAfterDays: 30,
        archiveAfterDays: 90,
      })

      expect(result.success).toBe(true)
      expect(result.data?.transitions).toBe(1)

      const usage = JSON.parse(readFileSync(USAGE_PATH, 'utf-8'))
      expect(usage.skills[0].state).toBe('stale')
    })

    it('should transition stale -> archived after archiveAfterDays', () => {
      const oldTimestamp = Date.now() - 100 * 86_400_000 // 100 days ago

      writeFileSync(USAGE_PATH, JSON.stringify({
        version: '1.0.0',
        skills: [
          {
            skillId: 'very-old-skill',
            skillName: 'Very Old Skill',
            lastUsedAt: oldTimestamp,
            state: 'stale',
            pinned: false,
            useCount: 1,
            stateChangedAt: oldTimestamp,
          },
        ],
        lastUpdated: Date.now(),
      }), 'utf-8')

      const result = runCurator({
        enabled: true,
        staleAfterDays: 30,
        archiveAfterDays: 90,
      })

      expect(result.success).toBe(true)
      expect(result.data?.transitions).toBe(1)

      const usage = JSON.parse(readFileSync(USAGE_PATH, 'utf-8'))
      expect(usage.skills[0].state).toBe('archived')
    })
  })

  describe('getCuratorStatus', () => {
    it('should return current status with counts', () => {
      const result = getCuratorStatus()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.paused).toBe(false)
      expect(result.data?.stateCount).toEqual({ active: 0, stale: 0, archived: 0 })
    })

    it('should reflect paused state in status', () => {
      setCuratorPaused(true)

      const result = getCuratorStatus()

      expect(result.data?.paused).toBe(true)
    })
  })

  describe('setCuratorPaused', () => {
    it('should toggle paused state', () => {
      setCuratorPaused(true)
      expect(isCuratorPaused()).toBe(true)

      setCuratorPaused(false)
      expect(isCuratorPaused()).toBe(false)
    })
  })

  describe('isCuratorPaused', () => {
    it('should return false when not paused', () => {
      expect(isCuratorPaused()).toBe(false)
    })

    it('should return true when paused', () => {
      setCuratorPaused(true)
      expect(isCuratorPaused()).toBe(true)
    })
  })
})