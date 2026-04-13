export const SCHEMA_VERSION = 1

export const VAULT_SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'active',
  message_count INTEGER NOT NULL DEFAULT 0,
  observation_count INTEGER NOT NULL DEFAULT 0,
  compaction_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS vault_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  category TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  sanitized_content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  importance_score REAL NOT NULL DEFAULT 0.5,
  token_estimate INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata_json TEXT,
  FOREIGN KEY (session_id) REFERENCES vault_sessions(session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vault_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  normalized_content TEXT NOT NULL,
  importance_score REAL NOT NULL DEFAULT 0.5,
  confidence_score REAL NOT NULL DEFAULT 1.0,
  source_session_id TEXT,
  source_observation_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed_at TEXT NOT NULL DEFAULT (datetime('now')),
  access_count INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  FOREIGN KEY (source_session_id) REFERENCES vault_sessions(session_id) ON DELETE SET NULL,
  FOREIGN KEY (source_observation_id) REFERENCES vault_observations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vault_memory_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_tokens INTEGER NOT NULL DEFAULT 0,
  chunk_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (memory_id) REFERENCES vault_memories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vault_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL UNIQUE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vault_memory_tags (
  memory_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (memory_id, tag_id),
  FOREIGN KEY (memory_id) REFERENCES vault_memories(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES vault_tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vault_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_memory_id INTEGER NOT NULL,
  to_memory_id INTEGER NOT NULL,
  relation_type TEXT NOT NULL,
  strength REAL NOT NULL DEFAULT 1.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata_json TEXT,
  FOREIGN KEY (from_memory_id) REFERENCES vault_memories(id) ON DELETE CASCADE,
  FOREIGN KEY (to_memory_id) REFERENCES vault_memories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vault_compaction_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  checkpoint_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  memory_count_snapshot INTEGER NOT NULL DEFAULT 0,
  token_budget_snapshot INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  FOREIGN KEY (session_id) REFERENCES vault_sessions(session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vault_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`

export const VAULT_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_observations_session_created
  ON vault_observations(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_observations_content_hash
  ON vault_observations(content_hash);

CREATE INDEX IF NOT EXISTS idx_memories_type_importance
  ON vault_memories(memory_type, importance_score DESC, last_accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_memories_session
  ON vault_memories(source_session_id);

CREATE INDEX IF NOT EXISTS idx_memories_archived
  ON vault_memories(is_archived, importance_score DESC);

CREATE INDEX IF NOT EXISTS idx_chunks_memory
  ON vault_memory_chunks(memory_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_tags_normalized
  ON vault_tags(normalized_name);

CREATE INDEX IF NOT EXISTS idx_memory_tags_tag
  ON vault_memory_tags(tag_id, memory_id);

CREATE INDEX IF NOT EXISTS idx_relations_from
  ON vault_relations(from_memory_id, relation_type);

CREATE INDEX IF NOT EXISTS idx_relations_to
  ON vault_relations(to_memory_id, relation_type);

CREATE INDEX IF NOT EXISTS idx_checkpoints_session
  ON vault_compaction_checkpoints(session_id, created_at);
`

export const VAULT_FTS = `
CREATE VIRTUAL TABLE IF NOT EXISTS vault_fts USING fts5(
  title,
  summary,
  chunk_text,
  content='vault_memory_chunks',
  content_rowid='id',
  tokenize='porter unicode61'
);
`

export const VAULT_TRIGGERS = `
CREATE TRIGGER IF NOT EXISTS trg_fts_insert
  AFTER INSERT ON vault_memory_chunks
BEGIN
  INSERT INTO vault_fts(rowid, title, summary, chunk_text)
  SELECT NEW.id,
    COALESCE(m.title, ''),
    COALESCE(m.summary, ''),
    NEW.chunk_text
  FROM vault_memories m WHERE m.id = NEW.memory_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_fts_delete
  BEFORE DELETE ON vault_memory_chunks
BEGIN
  INSERT INTO vault_fts(vault_fts, rowid, title, summary, chunk_text)
  SELECT 'delete', OLD.id,
    COALESCE(m.title, ''),
    COALESCE(m.summary, ''),
    OLD.chunk_text
  FROM vault_memories m WHERE m.id = OLD.memory_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_fts_update
  AFTER UPDATE OF chunk_text ON vault_memory_chunks
BEGIN
  INSERT INTO vault_fts(vault_fts, rowid, title, summary, chunk_text)
  SELECT 'delete', OLD.id,
    COALESCE(m.title, ''),
    COALESCE(m.summary, ''),
    OLD.chunk_text
  FROM vault_memories m WHERE m.id = OLD.memory_id;
  INSERT INTO vault_fts(rowid, title, summary, chunk_text)
  SELECT NEW.id,
    COALESCE(m.title, ''),
    COALESCE(m.summary, ''),
    NEW.chunk_text
  FROM vault_memories m WHERE m.id = NEW.memory_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_session_obs_count
  AFTER INSERT ON vault_observations
BEGIN
  UPDATE vault_sessions
  SET observation_count = observation_count + 1,
      updated_at = datetime('now')
  WHERE session_id = NEW.session_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_session_compaction_count
  AFTER INSERT ON vault_compaction_checkpoints
BEGIN
  UPDATE vault_sessions
  SET compaction_count = compaction_count + 1,
      updated_at = datetime('now')
  WHERE session_id = NEW.session_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_tag_usage_inc
  AFTER INSERT ON vault_memory_tags
BEGIN
  UPDATE vault_tags
  SET usage_count = usage_count + 1,
      updated_at = datetime('now')
  WHERE id = NEW.tag_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_tag_usage_dec
  AFTER DELETE ON vault_memory_tags
BEGIN
  UPDATE vault_tags
  SET usage_count = MAX(0, usage_count - 1),
      updated_at = datetime('now')
  WHERE id = OLD.tag_id;
END;
`

export const VAULT_SEED_META = `
INSERT OR IGNORE INTO vault_meta (key, value, updated_at)
VALUES ('schema_version', '${SCHEMA_VERSION}', datetime('now'));
`
