// Skills tool handlers
// Handlers for list, view, manage tools - placeholder implementations

import type {
  ListSkillsOptions,
  ViewSkillOptions,
  ManageSkillOptions,
  SkillToolResult,
} from './types'
import { loadManifest, resolveSkillsPaths, getAthenaConfigDefaults } from './storage'
import type { SkillsConfig } from '@/config/schema'

export function handleListSkills(
  _options: ListSkillsOptions,
  config: SkillsConfig,
  _paths: ReturnType<typeof resolveSkillsPaths>,
): SkillToolResult {
  const enabled = config.enabled

  if (!enabled) {
    return {
      success: false,
      content: 'Athena skills module is not yet enabled.',
    }
  }

  const manifest = loadManifest(_paths)

  if (!manifest || manifest.skills.length === 0) {
    return {
      success: true,
      content: 'No skills registered yet. Skills management not yet implemented.',
    }
  }

  const skillList = manifest.skills
    .map(s => `  - ${s.id}: ${s.name} (${s.status})`)
    .join('\n')

  return {
    success: true,
    content: `Registered skills:\n${skillList}`,
    data: manifest.skills,
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

  const skill = manifest.skills.find(s => s.id === skillId)

  if (!skill) {
    return {
      success: false,
      content: `Skill '${skillId}' not found.`,
    }
  }

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
    ].join('\n'),
    data: skill,
  }
}

export function handleManageSkill(
  options: ManageSkillOptions,
  config: SkillsConfig,
  _paths: ReturnType<typeof resolveSkillsPaths>,
): SkillToolResult {
  const enabled = config.enabled

  if (!enabled) {
    return {
      success: false,
      content: 'Athena skills module is not yet enabled.',
    }
  }

  return {
    success: false,
    content: `Skill management not yet implemented. Action '${options.action}' on '${options.skillId}' cannot be performed.`,
  }
}

export function getDefaultSkillsConfig(): SkillsConfig {
  return getAthenaConfigDefaults()
}