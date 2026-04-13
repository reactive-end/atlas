import { describe, it, expect } from 'vitest'
import {
  SCHEMA_VERSION,
  VAULT_SCHEMA,
  VAULT_INDEXES,
  VAULT_FTS,
  VAULT_TRIGGERS,
  VAULT_SEED_META,
} from '@/modules/vault/schema'

describe('Vault Schema', () => {
  it('exports a valid schema version', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(1)
    expect(typeof SCHEMA_VERSION).toBe('number')
  })

  it('schema contains all required tables', () => {
    const tables = [
      'vault_sessions',
      'vault_observations',
      'vault_memories',
      'vault_memory_chunks',
      'vault_tags',
      'vault_memory_tags',
      'vault_relations',
      'vault_compaction_checkpoints',
      'vault_meta',
    ]

    for (const table of tables) {
      expect(VAULT_SCHEMA).toContain(table)
    }
  })

  it('schema uses IF NOT EXISTS for all tables', () => {
    const createCount = (VAULT_SCHEMA.match(/CREATE TABLE IF NOT EXISTS/g) ?? []).length
    expect(createCount).toBe(9)
  })

  it('indexes cover critical query paths', () => {
    const indexes = [
      'idx_observations_session_created',
      'idx_observations_content_hash',
      'idx_memories_type_importance',
      'idx_memories_session',
      'idx_memories_archived',
      'idx_chunks_memory',
      'idx_tags_normalized',
      'idx_memory_tags_tag',
      'idx_relations_from',
      'idx_relations_to',
      'idx_checkpoints_session',
    ]

    for (const idx of indexes) {
      expect(VAULT_INDEXES).toContain(idx)
    }
  })

  it('FTS5 virtual table uses porter tokenizer', () => {
    expect(VAULT_FTS).toContain('fts5')
    expect(VAULT_FTS).toContain('porter')
    expect(VAULT_FTS).toContain('chunk_text')
  })

  it('triggers maintain FTS synchronization', () => {
    expect(VAULT_TRIGGERS).toContain('trg_fts_insert')
    expect(VAULT_TRIGGERS).toContain('trg_fts_delete')
    expect(VAULT_TRIGGERS).toContain('trg_fts_update')
  })

  it('triggers maintain session counters', () => {
    expect(VAULT_TRIGGERS).toContain('trg_session_obs_count')
    expect(VAULT_TRIGGERS).toContain('trg_session_compaction_count')
  })

  it('triggers maintain tag usage counts', () => {
    expect(VAULT_TRIGGERS).toContain('trg_tag_usage_inc')
    expect(VAULT_TRIGGERS).toContain('trg_tag_usage_dec')
  })

  it('seed meta inserts schema version', () => {
    expect(VAULT_SEED_META).toContain('schema_version')
    expect(VAULT_SEED_META).toContain(String(SCHEMA_VERSION))
  })

  it('vault_sessions has required columns', () => {
    const columns = ['session_id', 'created_at', 'updated_at', 'last_accessed_at', 'status', 'message_count', 'observation_count', 'compaction_count', 'summary', 'metadata_json']
    for (const col of columns) {
      expect(VAULT_SCHEMA).toContain(col)
    }
  })

  it('vault_observations has required columns', () => {
    const columns = ['session_id', 'source_type', 'category', 'raw_content', 'sanitized_content', 'content_hash', 'importance_score', 'token_estimate']
    for (const col of columns) {
      expect(VAULT_SCHEMA).toContain(col)
    }
  })

  it('vault_memories has required columns', () => {
    const columns = ['memory_type', 'title', 'content', 'summary', 'normalized_content', 'importance_score', 'confidence_score', 'source_session_id', 'source_observation_id', 'access_count', 'is_archived']
    for (const col of columns) {
      expect(VAULT_SCHEMA).toContain(col)
    }
  })

  it('vault_memory_chunks has required columns', () => {
    const columns = ['memory_id', 'chunk_index', 'chunk_text', 'chunk_tokens', 'chunk_hash']
    for (const col of columns) {
      expect(VAULT_SCHEMA).toContain(col)
    }
  })

  it('vault_relations supports relation types', () => {
    const columns = ['from_memory_id', 'to_memory_id', 'relation_type', 'strength']
    for (const col of columns) {
      expect(VAULT_SCHEMA).toContain(col)
    }
  })

  it('vault_compaction_checkpoints has required columns', () => {
    const columns = ['session_id', 'summary', 'checkpoint_hash', 'memory_count_snapshot', 'token_budget_snapshot']
    for (const col of columns) {
      expect(VAULT_SCHEMA).toContain(col)
    }
  })

  it('vault_meta uses key-value structure', () => {
    expect(VAULT_SCHEMA).toContain('key TEXT PRIMARY KEY')
    expect(VAULT_SCHEMA).toContain('value TEXT NOT NULL')
  })

  it('foreign keys reference correct parent tables', () => {
    expect(VAULT_SCHEMA).toContain('FOREIGN KEY (session_id) REFERENCES vault_sessions(session_id)')
    expect(VAULT_SCHEMA).toContain('FOREIGN KEY (memory_id) REFERENCES vault_memories(id)')
    expect(VAULT_SCHEMA).toContain('FOREIGN KEY (tag_id) REFERENCES vault_tags(id)')
    expect(VAULT_SCHEMA).toContain('FOREIGN KEY (from_memory_id) REFERENCES vault_memories(id)')
    expect(VAULT_SCHEMA).toContain('FOREIGN KEY (to_memory_id) REFERENCES vault_memories(id)')
  })
})
