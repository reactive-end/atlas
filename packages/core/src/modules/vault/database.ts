import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import {
  VAULT_SCHEMA,
  VAULT_INDEXES,
  VAULT_FTS,
  VAULT_TRIGGERS,
  VAULT_SEED_META,
  SCHEMA_VERSION,
} from '@/modules/vault/schema'

const VAULT_DIR_NAME = '.vault'
const VAULT_DB_NAME = 'vault.db'

export interface VaultDatabase {
  exec(sql: string): void
  prepare<T>(sql: string): VaultStatement<T>
  close(): void
}

export interface VaultStatement<T> {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number }
  get(...params: unknown[]): T | undefined
  all(...params: unknown[]): T[]
}

let cachedDb: VaultDatabase | null = null

function getVaultDir(): string {
  return join(homedir(), VAULT_DIR_NAME)
}

function getVaultDbPath(): string {
  return join(getVaultDir(), VAULT_DB_NAME)
}

function ensureVaultDir(): void {
  const dir = getVaultDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function createBunDatabase(dbPath: string): VaultDatabase {
  // OpenCode plugins run in Bun — use built-in bun:sqlite (zero dependencies)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Database } = require('bun:sqlite') as { Database: new (path: string) => BunSqliteDb }
  const raw = new Database(dbPath)

  return {
    exec(sql: string) {
      raw.exec(sql)
    },
    prepare<T>(sql: string): VaultStatement<T> {
      const stmt = raw.prepare(sql)
      return {
        run(...params: unknown[]) {
          return stmt.run(...params) as { changes: number; lastInsertRowid: number }
        },
        get(...params: unknown[]): T | undefined {
          return stmt.get(...params) as T | undefined
        },
        all(...params: unknown[]): T[] {
          return stmt.all(...params) as T[]
        },
      }
    },
    close() {
      raw.close()
    },
  }
}

interface BunSqliteDb {
  exec(sql: string): void
  prepare(sql: string): BunStatement
  close(): void
}

interface BunStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number }
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown[]
}

function applyPragmas(db: VaultDatabase): void {
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA busy_timeout = 5000')
  db.exec('PRAGMA synchronous = NORMAL')
  db.exec('PRAGMA cache_size = -8000')
}

function applySchema(db: VaultDatabase): void {
  db.exec(VAULT_SCHEMA)
  db.exec(VAULT_INDEXES)
  db.exec(VAULT_FTS)
  db.exec(VAULT_TRIGGERS)
  db.exec(VAULT_SEED_META)
}

function checkMigration(db: VaultDatabase): void {
  const row = db.prepare<{ value: string }>(
    "SELECT value FROM vault_meta WHERE key = 'schema_version'"
  ).get()

  const currentVersion = row ? parseInt(row.value, 10) : 0

  if (currentVersion < SCHEMA_VERSION) {
    applySchema(db)
    db.prepare(
      "UPDATE vault_meta SET value = ?, updated_at = datetime('now') WHERE key = 'schema_version'"
    ).run(String(SCHEMA_VERSION))
  }
}

export function openDatabase(): VaultDatabase {
  if (cachedDb) {
    return cachedDb
  }

  ensureVaultDir()

  const dbPath = getVaultDbPath()
  const db = createBunDatabase(dbPath)

  applyPragmas(db)
  applySchema(db)
  checkMigration(db)

  cachedDb = db
  return db
}

export function closeDatabase(): void {
  if (cachedDb) {
    cachedDb.close()
    cachedDb = null
  }
}

export function getDatabasePath(): string {
  return getVaultDbPath()
}
