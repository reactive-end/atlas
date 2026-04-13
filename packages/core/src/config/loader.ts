import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { AtlasConfig } from '@/config/schema'
import { DEFAULT_CONFIG } from '@/config/schema'

function getConfigDir(): string {
  const home = homedir()
  return join(home, '.config', 'opencode')
}

function getConfigPath(): string {
  return join(getConfigDir(), 'atlas.config.json')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeObjects(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target }

  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    const targetValue = target[key]

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = mergeObjects(targetValue, sourceValue)
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue
    }
  }

  return result
}

function parseConfigFile(filePath: string): Partial<AtlasConfig> {
  const raw = readFileSync(filePath, 'utf-8')
  const cleaned = raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  try {
    return JSON.parse(cleaned) as Partial<AtlasConfig>
  } catch {
    const stripped = cleaned
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*([\]}])/g, '$1')
    return JSON.parse(stripped) as Partial<AtlasConfig>
  }
}

function validateConfig(config: AtlasConfig): void {
  const validLevels: string[] = ['lite', 'full', 'ultra']
  if (!validLevels.includes(config.echo.defaultLevel)) {
    throw new Error(`Invalid echo level: ${config.echo.defaultLevel}. Must be one of: ${validLevels.join(', ')}`)
  }

  const validPresets: string[] = ['default', 'performance', 'economy', 'premium']
  if (!validPresets.includes(config.agents.preset)) {
    throw new Error(`Invalid preset: ${config.agents.preset}. Must be one of: ${validPresets.join(', ')}`)
  }

  const validModes: string[] = ['echo', 'verbose']
  if (!validModes.includes(config.agents.defaultMode)) {
    throw new Error(`Invalid agent mode: ${config.agents.defaultMode}. Must be one of: ${validModes.join(', ')}`)
  }

  if (config.forge.maxLines < 1) {
    throw new Error('forge.maxLines must be at least 1')
  }

  if (config.forge.dedupMin < 2) {
    throw new Error('forge.dedupMin must be at least 2')
  }
}

export function loadConfig(): AtlasConfig {
  const configPath = getConfigPath()

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG }
  }

  const userConfig = parseConfigFile(configPath)
  const merged = mergeObjects(
    DEFAULT_CONFIG as unknown as Record<string, unknown>,
    userConfig as unknown as Record<string, unknown>,
  ) as unknown as AtlasConfig

  validateConfig(merged)

  return merged
}

export function getConfigDirectory(): string {
  return getConfigDir()
}
