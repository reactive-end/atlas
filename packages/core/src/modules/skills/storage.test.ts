// Storage path resolution tests
// Tests for skills module storage utilities

import { describe, it, expect } from 'vitest'
import {
  getDefaultSkillsPaths,
  createDefaultManifest,
  getAthenaConfigDefaults,
  isSkillsEnabled,
} from '@/modules/skills/storage'
import type { SkillsConfig } from '@/config/schema'

describe('skills storage', () => {
  describe('getDefaultSkillsPaths', () => {
    it('should return default paths in ~/.athena/', () => {
      const paths = getDefaultSkillsPaths()

      expect(paths.base).toContain('.athena')
      expect(paths.manifest).toContain('manifest.json')
      expect(paths.skills).toContain('skills')
    })

    it('should use custom basePath when provided', () => {
      const paths = getDefaultSkillsPaths('.custom-athena')

      expect(paths.base).toContain('.custom-athena')
    })
  })

  describe('createDefaultManifest', () => {
    it('should create manifest with version 1.0.0', () => {
      const manifest = createDefaultManifest()

      expect(manifest.version).toBe('1.0.0')
      expect(manifest.skills).toEqual([])
    })
  })

  describe('getAthenaConfigDefaults', () => {
    it('should return default config with enabled true', () => {
      const config = getAthenaConfigDefaults()

      expect(config.enabled).toBe(true)
      expect(config.basePath).toBeUndefined()
    })
  })

  describe('isSkillsEnabled', () => {
    it('should return true when enabled is true', () => {
      const config: SkillsConfig = { enabled: true, basePath: undefined }
      expect(isSkillsEnabled(config)).toBe(true)
    })

    it('should return false when enabled is false', () => {
      const config: SkillsConfig = { enabled: false, basePath: undefined }
      expect(isSkillsEnabled(config)).toBe(false)
    })
  })
})