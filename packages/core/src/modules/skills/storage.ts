// Storage utilities for Skills module
// Handles path resolution and persistence in ~/.athena/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { SkillsStoragePaths, SkillManifest } from './types'
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
  const dir = manifestPath.substring(0, manifestPath.lastIndexOf('/'))

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