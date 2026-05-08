// Skills module types for Athena
// Persisted in ~/.athena/ (separate from Vault)

export type SkillStatus = 'active' | 'disabled' | 'pending'

export interface SkillDefinition {
  id: string
  name: string
  description: string
  status: SkillStatus
  createdAt: number
  updatedAt: number
  tags: string[]
  metadata?: Record<string, string>
}

export interface SkillManifest {
  version: string
  skills: SkillDefinition[]
}

export interface SkillsStoragePaths {
  base: string
  manifest: string
  skills: string
}

export type SkillListFilter = 'all' | 'active' | 'disabled' | 'pending'

export interface ListSkillsOptions {
  filter?: SkillListFilter
  tags?: string[]
  limit?: number
  offset?: number
}

export interface ViewSkillOptions {
  includeHistory?: boolean
}

export interface ManageSkillOptions {
  action: 'enable' | 'disable' | 'delete'
  skillId: string
}

export interface SkillToolResult {
  success: boolean
  content: string
  data?: unknown
}