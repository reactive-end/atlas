// Skills tool handlers
// Handlers for list, view, manage tools - functional CRUD implementations

import type {
  ListSkillsOptions,
  ViewSkillOptions,
  ManageSkillOptions,
  SkillToolResult,
  SkillListFilter,
  SkillStatus,
} from './types'
import {
  loadManifest,
  saveManifest,
  resolveSkillsPaths,
  getAthenaConfigDefaults,
  findSkillById,
  updateSkillInManifest,
  removeSkillFromManifest,
  deleteSkillContent,
  skillContentExists,
} from './storage'
import type { SkillsConfig } from '@/config/schema'

function normalizeFilter(filter?: SkillListFilter): SkillListFilter {
  return filter ?? 'all'
}

function filterSkills(
  skills: Array<{ id: string; name: string; status: SkillStatus; tags: string[] }>,
  filter: SkillListFilter,
  tags?: string[],
): Array<{ id: string; name: string; status: SkillStatus; tags: string[] }> {
  let filtered = skills

  if (filter !== 'all') {
    filtered = filtered.filter(s => s.status === filter)
  }

  if (tags && tags.length > 0) {
    const tagsLower = tags.map(t => t.toLowerCase())
    filtered = filtered.filter(s =>
      s.tags.some(t => tagsLower.includes(t.toLowerCase())),
    )
  }

  return filtered
}

function formatSkillList(
  skills: Array<{ id: string; name: string; status: SkillStatus; tags: string[] }>,
): string {
  if (skills.length === 0) {
    return 'No skills registered yet.'
  }

  return skills
    .map(s => `  - ${s.id}: ${s.name} [${s.status}]`)
    .join('\n')
}

export function handleListSkills(
  options: ListSkillsOptions,
  config: SkillsConfig,
  paths: ReturnType<typeof resolveSkillsPaths>,
): SkillToolResult {
  const enabled = config.enabled

  if (!enabled) {
    return {
      success: false,
      content: 'Athena skills module is not yet enabled.',
    }
  }

  const manifest = loadManifest(paths)

  if (!manifest || manifest.skills.length === 0) {
    return {
      success: true,
      content: 'No skills registered yet.',
    }
  }

  const filter = normalizeFilter(options.filter)
  const tags = options.tags
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  let skills = filterSkills(manifest.skills, filter, tags)

  const total = skills.length
  skills = skills.slice(offset, offset + limit)

  const skillList = formatSkillList(skills)
  const summary = `Showing ${skills.length} of ${total} skills (filter: ${filter})`

  return {
    success: true,
    content: `${summary}\n${skillList}`,
    data: {
      skills,
      total,
      filter,
      limit,
      offset,
    },
  }
}

export function handleViewSkill(
  skillId: string,
  _options: ViewSkillOptions,
  config: SkillsConfig,
  paths: ReturnType<typeof resolveSkillsPaths>,
): SkillToolResult {
  const enabled = config.enabled

  if (!enabled) {
    return {
      success: false,
      content: 'Athena skills module is not yet enabled.',
    }
  }

  const manifest = loadManifest(paths)

  if (!manifest) {
    return {
      success: false,
      content: 'No skills manifest found.',
    }
  }

  const skill = findSkillById(manifest, skillId)

  if (!skill) {
    return {
      success: false,
      content: `Skill '${skillId}' not found.`,
    }
  }

  const hasContent = skillContentExists(paths, skillId)

  return {
    success: true,
    content: [
      `Skill: ${skill.name}`,
      `ID: ${skill.id}`,
      `Status: ${skill.status}`,
      `Description: ${skill.description}`,
      `Created: ${new Date(skill.createdAt).toISOString()}`,
      `Updated: ${new Date(skill.updatedAt).toISOString()}`,
      `Tags: ${skill.tags.join(', ') || '(none)'}`,
      `Has Content: ${hasContent ? 'Yes' : 'No'}`,
      skill.metadata ? `Metadata: ${JSON.stringify(skill.metadata)}` : '',
    ].filter(Boolean).join('\n'),
    data: { ...skill, hasContent },
  }
}

function setSkillStatus(
  manifest: ReturnType<typeof loadManifest>,
  paths: ReturnType<typeof resolveSkillsPaths>,
  skillId: string,
  newStatus: SkillStatus,
): SkillToolResult {
  if (!manifest) {
    return {
      success: false,
      content: 'No skills manifest found.',
    }
  }

  const skill = findSkillById(manifest, skillId)

  if (!skill) {
    return {
      success: false,
      content: `Skill '${skillId}' not found.`,
    }
  }

  if (skill.status === newStatus) {
    return {
      success: true,
      content: `Skill '${skillId}' is already ${newStatus}.`,
    }
  }

  const updatedSkill = {
    ...skill,
    status: newStatus,
    updatedAt: Date.now(),
  }

  const updatedManifest = updateSkillInManifest(manifest, updatedSkill)
  saveManifest(updatedManifest, paths)

  return {
    success: true,
    content: `Skill '${skillId}' ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully.`,
    data: { skill: updatedSkill },
  }
}

function deleteSkill(
  manifest: ReturnType<typeof loadManifest>,
  paths: ReturnType<typeof resolveSkillsPaths>,
  skillId: string,
): SkillToolResult {
  if (!manifest) {
    return {
      success: false,
      content: 'No skills manifest found.',
    }
  }

  const skill = findSkillById(manifest, skillId)

  if (!skill) {
    return {
      success: false,
      content: `Skill '${skillId}' not found.`,
    }
  }

  deleteSkillContent(paths, skillId)

  const updatedManifest = removeSkillFromManifest(manifest, skillId)
  saveManifest(updatedManifest, paths)

  return {
    success: true,
    content: `Skill '${skillId}' deleted successfully.`,
    data: { deletedSkill: skill },
  }
}

export function handleManageSkill(
  options: ManageSkillOptions,
  config: SkillsConfig,
  paths: ReturnType<typeof resolveSkillsPaths>,
): SkillToolResult {
  const enabled = config.enabled

  if (!enabled) {
    return {
      success: false,
      content: 'Athena skills module is not yet enabled.',
    }
  }

  const manifest = loadManifest(paths)

  if (!manifest) {
    return {
      success: false,
      content: 'No skills manifest found. Please initialize the skills registry first.',
    }
  }

  const { action, skillId } = options

  switch (action) {
    case 'enable':
      return setSkillStatus(manifest, paths, skillId, 'active')
    case 'disable':
      return setSkillStatus(manifest, paths, skillId, 'disabled')
    case 'delete':
      return deleteSkill(manifest, paths, skillId)
    default:
      return {
        success: false,
        content: `Unknown action '${action}'. Valid actions: enable, disable, delete.`,
      }
  }
}

export function getDefaultSkillsConfig(): SkillsConfig {
  return getAthenaConfigDefaults()
}