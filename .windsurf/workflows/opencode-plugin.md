---
description: How to build OpenCode plugins — hooks, tools, agents, and deployment
---

# Building OpenCode Plugins

## Runtime Environment

OpenCode executes plugins with **Bun**:
- ESM module system (`import`/`export`)
- `bun:sqlite` built-in (no native addons)
- `node:fs`, `node:path`, `node:os`, `node:crypto` available
- No `require()` unless using CommonJS-only packages (Bun handles it)

---

## Plugin Entry Point

```typescript
// plugin/myplugin.ts
import { type Plugin, tool } from '@opencode-ai/plugin'

const myPlugin: Plugin = async (_input, _options) => {
  return {
    // hooks go here
  }
}

export default {
  id: 'my-plugin',
  server: myPlugin,
}
```

Register in `opencode.json`:
```json
{
  "plugins": ["~/.config/opencode/plugins/myplugin.ts"]
}
```

---

## Hooks

### `experimental.chat.system.transform`
Injects content into the system prompt before each chat turn.

```typescript
'experimental.chat.system.transform': async (input, output) => {
  // input.sessionID, input.agent
  // output.system — push strings to append to system prompt
  output.system.push('Always respond in bullet points.')
}
```

### `tool.execute.before`
Intercepts a tool call before execution. Modify args or cancel.

```typescript
'tool.execute.before': async (toolInput, toolOutput) => {
  // toolInput.tool — e.g. 'bash'
  // toolInput.args — tool arguments object
  // toolOutput.args — override args
  // toolOutput.skip = true — cancel the tool call
}
```

### `tool.execute.after`
Processes tool output after execution. Rewrite the result.

```typescript
'tool.execute.after': async (toolInput, toolOutput) => {
  // toolOutput.output — writable result string
  if (toolInput.tool === 'bash') {
    toolOutput.output = compress(toolOutput.output)
  }
}
```

### `experimental.session.compacting`
Runs before context compaction. Inject preserved context.

```typescript
'experimental.session.compacting': async (input, output) => {
  // input.summary — current compaction summary
  output.system.push(getSavedContext(input.sessionID))
}
```

### `chat.message`
Runs on each message. Capture for memory or analytics.

```typescript
'chat.message': async (input) => {
  // input.role — 'user' | 'assistant'
  // input.content, input.sessionID
}
```

### `config`
Runs once at startup. Register agents and UI configuration.

```typescript
'config': async (opencodeConfig) => {
  if (!opencodeConfig.agent) opencodeConfig.agent = {}

  opencodeConfig.agent['my-agent'] = {
    model: 'openai/gpt-5.4-mini',
    prompt: 'You are a specialized agent...',
    description: 'What this agent does',
    mode: 'subagent',     // 'primary' | 'subagent' | 'all'
    temperature: 0.2,
    mcps: ['websearch'],
  }
}
```

### `event`
Session lifecycle events.

```typescript
'event': async ({ event }) => {
  // event.type — e.g. 'session.deleted', 'session.created'
  // event.properties.sessionID
}
```

### `tui.command.execute`
Custom slash commands in the TUI.

```typescript
'tui.command.execute': async (input, output) => {
  if (input.command === '/my-command') {
    output.response = 'Done!'
  }
}
```

---

## Custom Tools

Tools expose new capabilities to agents. Use the `tool` helper:

```typescript
import { tool } from '@opencode-ai/plugin'

// Inside the plugin return object:
tool: {
  search_memory: tool({
    description: 'Search stored memories by query.',
    args: {
      query: tool.schema.string('Search query'),
      limit: tool.schema.optional(tool.schema.number('Max results')),
    },
    async execute(args) {
      const results = await searchDB(args.query, args.limit ?? 10)
      return results.join('\n')
    },
  }),
}
```

Conditionally register tools when a feature may not be available:
```typescript
...(dbReady ? { tool: { search_memory: tool({...}) } } : {}),
```

---

## Agents

Agents are subagents invokable with `@agentname`. The key in `opencodeConfig.agent` **must exactly match** the name used in `@mention`.

```typescript
'config': async (opencodeConfig) => {
  opencodeConfig.agent['debugger'] = {
    model: 'openai/gpt-5.4-mini',
    prompt: 'You are a debugging specialist...',
    description: 'Error diagnosis and stack trace analysis',
    mode: 'subagent',
  }
}
// Now callable as @debugger in chat
```

Agent fields:
- **`model`** — LLM string (e.g. `openai/gpt-5.4`, `anthropic/claude-opus-4.6`)
- **`prompt`** — System prompt string
- **`description`** — Shown in agent picker; used by orchestrators to decide delegation
- **`mode`** — `primary` (in UI selector) | `subagent` (invoked via `@name`) | `all`
- **`temperature`** — Optional, float 0–1
- **`mcps`** — Array of MCP server names to enable for this agent

---

## SQLite Persistence

Bun includes SQLite natively — no packages needed:

```typescript
import { Database } from 'bun:sqlite'
import { homedir } from 'node:os'
import { join } from 'node:path'

const dbPath = join(homedir(), '.config', 'opencode', 'myplugin.db')
const db = new Database(dbPath, { create: true })

db.exec(`CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)`)

const insert = db.prepare('INSERT INTO memories (content) VALUES (?)')
insert.run('important fact')

const rows = db.query('SELECT * FROM memories WHERE content LIKE ?').all('%fact%')
```

---

## Testable Architecture

Avoid importing `@opencode-ai/plugin` in your business logic — it won't be available in tests. Keep hook logic in pure functions:

```typescript
// lib/transform.ts — pure, no OpenCode dependency
export function buildSystemInjection(sessionId: string, config: Config): string {
  return `Session: ${sessionId}\n${config.prefix}`
}

// plugin/myplugin.ts — thin adapter
'experimental.chat.system.transform': async (input, output) => {
  output.system.push(buildSystemInjection(input.sessionID, config))
}
```

Test the pure function with any test runner:
```typescript
import { buildSystemInjection } from './lib/transform'
// No OpenCode import needed
```

---

## Common Patterns

**Per-session state:**
```typescript
const sessionStates = new Map<string, MyState>()

function getState(sessionId: string): MyState {
  if (!sessionStates.has(sessionId)) {
    sessionStates.set(sessionId, createInitialState())
  }
  return sessionStates.get(sessionId)!
}

// Clean up on session end:
'event': async ({ event }) => {
  if (event.type === 'session.deleted') {
    sessionStates.delete(event.properties.sessionID)
  }
}
```

**Loading user config:**
```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

function loadConfig(): UserConfig {
  const path = join(homedir(), '.config', 'opencode', 'myplugin.config.json')
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return DEFAULT_CONFIG
  }
}
```

**Conditional tool registration:**
```typescript
const feature = initFeature()

return {
  ...(feature.ready ? {
    tool: {
      my_tool: tool({ ... }),
    }
  } : {}),
}
```
