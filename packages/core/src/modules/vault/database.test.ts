import { describe, it, expect } from 'vitest'
import { getDatabasePath } from '@/modules/vault/database'
import { homedir } from 'node:os'
import { join } from 'node:path'

describe('Vault Database', () => {
  it('database path points to user home .vault directory', () => {
    const dbPath = getDatabasePath()
    const expected = join(homedir(), '.vault', 'vault.db')
    expect(dbPath).toBe(expected)
  })

  it('database path contains vault.db filename', () => {
    const dbPath = getDatabasePath()
    expect(dbPath).toContain('vault.db')
  })

  it('database path contains .vault directory', () => {
    const dbPath = getDatabasePath()
    expect(dbPath).toContain('.vault')
  })
})
