const MEMORY_PROTOCOL_PROMPT = `Memory Protocol (Vault):

You have persistent memory via Vault. Use these tools:

1. mem_search "query" → search memories (compact results, ~100 tokens each)
2. mem_timeline → chronological context for current session
3. mem_get_observation <id> → full content of specific memory

When to SAVE (automatic):
- Key decisions made during session
- Bugs found and their solutions
- Architecture patterns discovered
- User preferences and conventions
- Important file paths and structures
- Session summaries at natural breakpoints

When to SEARCH (before acting):
- Start of new session → search for previous context
- Before major decisions → check for prior art
- When user references past work → find relevant memories
- After compaction → recover context

Session Close Protocol:
- Save session summary with key outcomes
- Tag important decisions for future retrieval
- Preserve unfinished task context

Privacy:
- Content within <private>...</private> tags is NEVER saved to memory
- Strip private tags before any memory operation`

const MEMORY_TOOLS_PROMPT = `Available memory tools:
- mem_search: Search memories by semantic query. Returns compact results.
- mem_timeline: Get chronological memory entries for session.
- mem_get_observation: Retrieve full content of a specific memory entry.
- mem_save: Save an observation to persistent memory.`

export function buildMemoryProtocolPrompt(): string {
  return MEMORY_PROTOCOL_PROMPT
}

export function buildMemoryToolsPrompt(): string {
  return MEMORY_TOOLS_PROMPT
}

export function buildFullVaultPrompt(): string {
  return `${MEMORY_PROTOCOL_PROMPT}\n\n${MEMORY_TOOLS_PROMPT}`
}

export function stripPrivateTags(content: string): string {
  return content.replace(/<private>[\s\S]*?<\/private>/g, '[REDACTED]')
}
