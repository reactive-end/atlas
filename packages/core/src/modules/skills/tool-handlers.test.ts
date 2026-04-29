// Skills tool handlers tests
// Tests for CRUD operations in skills module handlers

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { handleListSkills, handleViewSkill, handleManageSkill } from '@/modules/skills/tool-handlers'
import type { SkillsConfig } from '@/config/schema'
import type { SkillsStoragePaths, SkillManifest, SkillDefinition } from '@/modules/skills/types'

// Mock storage module with all exports
vi.mock('@/modules/skills/storage', () => ({
  loadManifest: vi.fn(),
  saveManifest: vi.fn(),
  createDefaultManifest: vi.fn(),
  getDefaultSkillsPaths: vi.fn(),
  ensureSkillsDirectory: vi.fn(),
  getAthenaConfigDefaults: vi.fn(),
  resolveSkillsPaths: vi.fn(),
  isSkillsEnabled: vi.fn(),
  findSkillById: vi.fn(),
  updateSkillInManifest: vi.fn(),
  addSkillToManifest: vi.fn(),
  removeSkillFromManifest: vi.fn(),
  getSkillContentPath: vi.fn(),
  skillContentExists: vi.fn(),
  deleteSkillContent: vi.fn(),
}))

import {
  loadManifest,
  saveManifest,
  findSkillById,
  skillContentExists,
  deleteSkillContent,
  updateSkillInManifest,
  removeSkillFromManifest,
} from '@/modules/skills/storage'

// Test fixtures
const mockConfig: SkillsConfig = {
  enabled: true,
  basePath: undefined,
}

const mockDisabledConfig: SkillsConfig = {
  enabled: false,
  basePath: undefined,
}

const mockPaths: SkillsStoragePaths = {
  base: '/home/user/.athena',
  manifest: '/home/user/.athena/manifest.json',
  skills: '/home/user/.athena/skills',
}

const mockSkills: SkillDefinition[] = [
  {
    id: 'skill-1',
    name: 'Test Skill 1',
    description: 'A test skill',
    status: 'active',
    createdAt: 1000,
    updatedAt: 2000,
    tags: ['test', 'example'],
  },
  {
    id: 'skill-2',
    name: 'Test Skill 2',
    description: 'Another test skill',
    status: 'disabled',
    createdAt: 3000,
    updatedAt: 4000,
    tags: ['test', 'disabled'],
  },
  {
    id: 'skill-3',
    name: 'Test Skill 3',
    description: 'Pending skill',
    status: 'pending',
    createdAt: 5000,
    updatedAt: 6000,
    tags: ['pending'],
  },
]

describe('handleListSkills', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return disabled error when config is disabled', () => {
    const result = handleListSkills({}, mockDisabledConfig, mockPaths)

    expect(result.success).toBe(false)
    expect(result.content).toContain('not yet enabled')
  })

  it('should return empty message when no manifest', () => {
    vi.mocked(loadManifest).mockReturnValue(null)

    const result = handleListSkills({}, mockConfig, mockPaths)

    expect(result.success).toBe(true)
    expect(result.content).toContain('No skills registered')
  })

  it('should return skills list with default filter', () => {
    const manifest: SkillManifest = { version: '1.0.0', skills: mockSkills }
    vi.mocked(loadManifest).mockReturnValue(manifest)

    const result = handleListSkills({}, mockConfig, mockPaths)

    expect(result.success).toBe(true)
    expect(result.content).toContain('skill-1')
    expect(result.content).toContain('Test Skill 1')
    expect(result.data).toHaveProperty('skills')
  })

  it('should filter by status active', () => {
    const manifest: SkillManifest = { version: '1.0.0', skills: mockSkills }
    vi.mocked(loadManifest).mockReturnValue(manifest)

    const result = handleListSkills({ filter: 'active' }, mockConfig, mockPaths)

    expect(result.success).toBe(true)
    expect(result.content).toContain('[active]')
    expect(result.content).not.toContain('[disabled]')
  })

  it('should filter by status disabled', () => {
    const manifest: SkillManifest = { version: '1.0.0', skills: mockSkills }
    vi.mocked(loadManifest).mockReturnValue(manifest)

    const result = handleListSkills({ filter: 'disabled' }, mockConfig, mockPaths)

    expect(result.success).toBe(true)
    expect(result.content).toContain('[disabled]')
  })

  it('should filter by tags', () => {
    const manifest: SkillManifest = { version: '1.0.0', skills: mockSkills }
    vi.mocked(loadManifest).mockReturnValue(manifest)

    const result = handleListSkills({ tags: ['test'] }, mockConfig, mockPaths)

    expect(result.success).toBe(true)
    // Should only show skills with 'test' tag
  })

  it('should apply limit and offset', () => {
    const manifest: SkillManifest = { version: '1.0.0', skills: mockSkills }
    vi.mocked(loadManifest).mockReturnValue(manifest)

    const result = handleListSkills({ limit: 1, offset: 0 }, mockConfig, mockPaths)

    expect(result.success).toBe(true)
    const data = result.data as { skills: SkillDefinition[]; total: number }
    expect(data.skills.length).toBeLessThanOrEqual(1)
  })
})

describe('handleViewSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return disabled error when config is disabled', () => {
    const result = handleViewSkill('skill-1', {}, mockDisabledConfig, mockPaths)

    expect(result.success).toBe(false)
    expect(result.content).toContain('not yet enabled')
  })

  it('should return error when no manifest', () => {
    vi.mocked(loadManifest).mockReturnValue(null)

    const result = handleViewSkill('skill-1', {}, mockConfig, mockPaths)

    expect(result.success).toBe(false)
    expect(result.content).toContain('No skills manifest')
  })

  it('should return error when skill not found', () => {
    const manifest: SkillManifest = { version: '1.0.0', skills: [] }
    vi.mocked(loadManifest).mockReturnValue(manifest)
    vi.mocked(findSkillById).mockReturnValue(undefined)

    const result = handleViewSkill('non-existent', {}, mockConfig, mockPaths)

    expect(result.success).toBe(false)
    expect(result.content).toContain('not found')
  })

  it('should return skill details when found', () => {
    const manifest: SkillManifest = { version: '1.0.0', skills: mockSkills }
    vi.mocked(loadManifest).mockReturnValue(manifest)
    vi.mocked(findSkillById).mockReturnValue(mockSkills[0])
    vi.mocked(skillContentExists).mockReturnValue(false)

    const result = handleViewSkill('skill-1', {}, mockConfig, mockPaths)

    expect(result.success).toBe(true)
    expect(result.content).toContain('skill-1')
    expect(result.content).toContain('Test Skill 1')
    expect(result.content).toContain('active')
    expect(result.data).toHaveProperty('hasContent')
  })
})

describe('handleManageSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return disabled error when config is disabled', () => {
    const result = handleManageSkill(
      { action: 'enable', skillId: 'skill-1' },
      mockDisabledConfig,
      mockPaths,
    )

    expect(result.success).toBe(false)
    expect(result.content).toContain('not yet enabled')
  })

  it('should return error when no manifest', () => {
    vi.mocked(loadManifest).mockReturnValue(null)

    const result = handleManageSkill(
      { action: 'enable', skillId: 'skill-1' },
      mockConfig,
      mockPaths,
    )

    expect(result.success).toBe(false)
    expect(result.content).toContain('No skills manifest')
  })

  it('should enable a disabled skill', () => {
    const manifest: SkillManifest = {
      version: '1.0.0',
      skills: [mockSkills[1]],
    }
    vi.mocked(loadManifest).mockReturnValue(manifest)
    vi.mocked(findSkillById).mockReturnValue({
      ...mockSkills[1],
      status: 'disabled',
    })
    vi.mocked(saveManifest).mockReturnValue(undefined)

    const result = handleManageSkill(
      { action: 'enable', skillId: 'skill-2' },
      mockConfig,
      mockPaths,
    )

    expect(result.success).toBe(true)
    expect(result.content).toContain('enabled')
    expect(saveManifest).toHaveBeenCalled()
  })

  it('should disable an active skill', () => {
    const manifest: SkillManifest = {
      version: '1.0.0',
      skills: [mockSkills[0]],
    }
    vi.mocked(loadManifest).mockReturnValue(manifest)
    vi.mocked(findSkillById).mockReturnValue({
      ...mockSkills[0],
      status: 'active',
    })
    vi.mocked(saveManifest).mockReturnValue(undefined)

    const result = handleManageSkill(
      { action: 'disable', skillId: 'skill-1' },
      mockConfig,
      mockPaths,
    )

    expect(result.success).toBe(true)
    expect(result.content).toContain('disabled')
    expect(saveManifest).toHaveBeenCalled()
  })

  it('should delete a skill', () => {
    const manifest: SkillManifest = {
      version: '1.0.0',
      skills: mockSkills,
    }
    vi.mocked(loadManifest).mockReturnValue(manifest)
    vi.mocked(findSkillById).mockReturnValue(mockSkills[0])
    vi.mocked(deleteSkillContent).mockReturnValue(undefined)
    vi.mocked(saveManifest).mockReturnValue(undefined)

    const result = handleManageSkill(
      { action: 'delete', skillId: 'skill-1' },
      mockConfig,
      mockPaths,
    )

    expect(result.success).toBe(true)
    expect(result.content).toContain('deleted')
    expect(deleteSkillContent).toHaveBeenCalled()
    expect(saveManifest).toHaveBeenCalled()
  })

  it('should return error for unknown action', () => {
    const manifest: SkillManifest = { version: '1.0.0', skills: mockSkills }
    vi.mocked(loadManifest).mockReturnValue(manifest)

    const result = handleManageSkill(
      { action: 'unknown' as 'enable', skillId: 'skill-1' },
      mockConfig,
      mockPaths,
    )

    expect(result.success).toBe(false)
    expect(result.content).toContain('Unknown action')
  })

  it('should return already status message when no change needed', () => {
    const manifest: SkillManifest = { version: '1.0.0', skills: [mockSkills[0]] }
    vi.mocked(loadManifest).mockReturnValue(manifest)
    vi.mocked(findSkillById).mockReturnValue({
      ...mockSkills[0],
      status: 'active',
    })

    const result = handleManageSkill(
      { action: 'enable', skillId: 'skill-1' },
      mockConfig,
      mockPaths,
    )

    expect(result.success).toBe(true)
    expect(result.content).toContain('already')
  })
})