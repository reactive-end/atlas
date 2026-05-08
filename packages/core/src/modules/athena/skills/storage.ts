// Storage utilities for Skills module
// Handles path resolution and persistence in ~/.athena/

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import type { SkillsStoragePaths, SkillManifest, SkillDefinition } from './types'
import type { SkillsConfig } from '@/config/schema'

const DEFAULT_BASE_PATH = '.athena'

export function getDefaultSkillsPaths(basePath?: string): SkillsStoragePaths {
  const home = homedir()
  const base = basePath
    ? join(home, basePath)
    : join(home, DEFAULT_BASE_PATH)

  return {
    base,
    manifest: join(base, 'manifest.json'),
    skills: join(base, 'skills'),
  }
}

export function ensureSkillsDirectory(config: SkillsConfig): SkillsStoragePaths {
  const paths = getDefaultSkillsPaths(config.basePath)

  if (!existsSync(paths.base)) {
    mkdirSync(paths.base, { recursive: true })
  }

  if (!existsSync(paths.skills)) {
    mkdirSync(paths.skills, { recursive: true })
  }

  return paths
}

export function loadManifest(paths: SkillsStoragePaths): SkillManifest | null {
  const { manifest } = paths

  if (!existsSync(manifest)) {
    return null
  }

  try {
    const raw = readFileSync(manifest, 'utf-8')
    return JSON.parse(raw) as SkillManifest
  } catch {
    return null
  }
}

export function saveManifest(
  manifest: SkillManifest,
  paths: SkillsStoragePaths,
): void {
  const { manifest: manifestPath } = paths
  const dir = dirname(manifestPath)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

export function createDefaultManifest(): SkillManifest {
  return {
    version: '1.0.0',
    skills: [],
  }
}

export function getAthenaConfigDefaults(): SkillsConfig {
  return {
    enabled: true,
    basePath: undefined,
  }
}

export function resolveSkillsPaths(config: SkillsConfig): SkillsStoragePaths {
  const paths = getDefaultSkillsPaths(config.basePath)
  ensureSkillsDirectory(config)
  return paths
}

export function isSkillsEnabled(config: SkillsConfig): boolean {
  return config.enabled === true
}

// CRUD utilities

export function findSkillById(
  manifest: SkillManifest,
  skillId: string,
): SkillDefinition | undefined {
  return manifest.skills.find(s => s.id === skillId)
}

export function updateSkillInManifest(
  manifest: SkillManifest,
  updatedSkill: SkillDefinition,
): SkillManifest {
  const index = manifest.skills.findIndex(s => s.id === updatedSkill.id)

  if (index >= 0) {
    const newManifest = { ...manifest }
    newManifest.skills = [...manifest.skills]
    newManifest.skills[index] = updatedSkill
    return newManifest
  }

  return manifest
}

export function addSkillToManifest(
  manifest: SkillManifest,
  newSkill: SkillDefinition,
): SkillManifest {
  return {
    ...manifest,
    skills: [...manifest.skills, newSkill],
  }
}

export function removeSkillFromManifest(
  manifest: SkillManifest,
  skillId: string,
): SkillManifest {
  return {
    ...manifest,
    skills: manifest.skills.filter(s => s.id !== skillId),
  }
}

export function getSkillContentPath(
  paths: SkillsStoragePaths,
  skillId: string,
): string {
  return join(paths.skills, skillId, 'skill.ts')
}

export function skillContentExists(
  paths: SkillsStoragePaths,
  skillId: string,
): boolean {
  const contentPath = getSkillContentPath(paths, skillId)
  return existsSync(contentPath)
}

export function deleteSkillContent(
  paths: SkillsStoragePaths,
  skillId: string,
): void {
  const contentDir = join(paths.skills, skillId)
  if (existsSync(contentDir)) {
    rmSync(contentDir, { recursive: true, force: true })
  }
}