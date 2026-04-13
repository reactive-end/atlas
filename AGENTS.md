# Atlas — Context for Coding Agents

*A field guide for the AI assistants who will actually build this thing.*

This file provides context to coding agents (Cursor, Windsurf, Copilot, etc.) to work effectively on this project.

## What is Atlas

Atlas is a plugin for OpenCode CLI that optimizes token consumption in interactions with LLMs through four coordinated modules:

- **Echo** — Model output compression (3 levels: lite, full, ultra)
- **Agents** — 18 specialized agents with dual echo/verbose prompts
- **Forge** — Compression pipeline for bash command output
- **Vault** — Persistent memory between sessions via embedded SQLite

## Project Structure

```
packages/core/
├── src/
│   ├── types.ts                          # Central plugin types (AgentName union, hooks interfaces)
│   ├── index.ts                          # Public exports for @atlas-opencode/core
│   ├── config/
│   │   ├── schema.ts                     # Configuration schema, defaults, and 4 agent presets
│   │   └── loader.ts                     # Load and deep-merge atlas.config.json
│   ├── modules/
│   │   ├── echo/
│   │   │   ├── levels.ts                 # lite/full/ultra level definitions
│   │   │   ├── prompt-builder.ts         # Prompt constructor per level
│   │   │   ├── auto-clarity.ts           # Critical context detection (disables compression)
│   │   │   └── commands.ts               # Handlers for /atlas-echo and /atlas-verbose
│   │   ├── agents/
│   │   │   ├── registry.ts               # AGENT_FACTORIES + ALL_AGENT_NAMES + AGENT_ALIASES
│   │   │   ├── agents.test.ts            # Consolidated tests for all 18 agents
│   │   │   ├── atlas.ts                  # Orchestrator — mandatory delegation to specialists
│   │   │   ├── pathfinder.ts             # @tracker — codebase search and file discovery
│   │   │   ├── archivist.ts              # @keeper — external docs and API research
│   │   │   ├── elder.ts                  # @sage — architecture, strategy, complex decisions
│   │   │   ├── artisan.ts                # @craftsman — UI/UX and visual design
│   │   │   ├── mender.ts                 # @repairman — implementation and tests
│   │   │   ├── tribunal.ts               # @assembly — multi-LLM consensus
│   │   │   ├── inspector.ts              # @debugger — error diagnosis and targeted fixes
│   │   │   ├── scribe.ts                 # @writer — JSDoc, README, PR descriptions
│   │   │   ├── curator.ts                # @refactor — refactoring without behavior change
│   │   │   ├── sentinel.ts               # @guard — security audit and OWASP analysis
│   │   │   ├── herald.ts                 # @deployer — CI/CD, Dockerfiles, infrastructure
│   │   │   ├── lorekeeper.ts             # @analyst — schema design and query optimization
│   │   │   ├── alchemist.ts              # @optimizer — performance profiling and bottlenecks
│   │   │   ├── magistrate.ts             # @reviewer — code review and PR diff analysis
│   │   │   ├── envoy.ts                  # @contracts — REST/GraphQL/gRPC API design
│   │   │   ├── quartermaster.ts          # @deps — dependency management and upgrades
│   │   │   └── tactician.ts              # @tester — test strategy and coverage architecture
│   │   ├── forge/
│   │   │   ├── filters.ts                # ANSI, timestamps, progress bar cleanup
│   │   │   ├── dedup.ts                  # Deduplication of repeated lines
│   │   │   ├── redundancy.ts             # Similarity cache (Jaccard + FNV1a)
│   │   │   ├── markdown.ts               # Prose compression in markdown
│   │   │   ├── compressor.ts             # Complete compression pipeline
│   │   │   └── bash-wrapper.ts           # Hook to intercept bash tools
│   │   └── vault/
│   │       ├── schema.ts                 # SQLite DDL: tables, indexes, FTS5, triggers
│   │       ├── database.ts               # Embedded bun:sqlite adapter
│   │       ├── client.ts                 # SQLite operations (search, save, timeline)
│   │       ├── session-manager.ts        # Session lifecycle management
│   │       ├── memory-protocol.ts        # Vault protocol prompts injected to all agents
│   │       └── compaction.ts             # Context preservation across compaction events
│   └── hooks/
│       ├── system-transform.ts           # Injects echo + agent prompt + vault per agent call
│       ├── tool-before.ts                # Tool pre-processing (Forge intercept)
│       ├── tool-after.ts                 # Passive post-tool capture (Vault)
│       ├── compacting.ts                 # Vault checkpoint on context compaction
│       ├── event-handler.ts              # Session lifecycle events
│       └── integration.test.ts           # Inter-module integration tests
├── plugin/
│   └── atlas.ts                          # OpenCode plugin entry point
├── scripts/
│   ├── install.sh                        # Linux/macOS installer
│   └── install.ps1                       # Windows installer
└── vitest.config.ts                      # Test configuration
```

## Strict Code Rules

1. **No semicolons** — Never use `;`.
2. **No barrel files** — No `index.ts` with re-exports. Import directly from the source file.
3. **Path aliases** — Always `@/` for project imports, never `../../`.
4. **Strict TypeScript** — No `any`, no `unknown`, no unnecessary type assertions.
5. **Single Responsibility** — Max ~300 lines per file. Split large files into focused sub-modules.
6. **SonarQube patterns** — Controlled cyclomatic complexity. Readable over clever.
7. **Tests co-located** — `file.ts` has its test at `file.test.ts` in the same directory.

## Agent Architecture

### How Context Reaches Subagents

`experimental.chat.system.transform` runs for **every agent invocation**, not just Atlas. The `input.agent` field identifies the active agent. This means:

1. OpenCode sets the agent's base `prompt` (from `opencodeConfig.agent[name].prompt`)
2. `system.transform` fires → pushes Echo compression section + Vault memory protocol
3. The agent sees: its own focused system prompt + Echo rules + full Vault protocol

All 18 agents automatically receive the Vault memory protocol and know to use `mem_search` before acting and `mem_save` for key findings.

### Agent Factory Pattern

Each agent exports a `createXxxAgent(preset, echoMode)` function returning an `AgentDefinition`:

```typescript
export function createNameAgent(
  preset: AgentPresetConfig,
  echoMode: boolean,
): AgentDefinition {
  return {
    name: 'name',
    displayName: 'Name (@alias)',
    systemPrompt: echoMode ? ECHO_PROMPT : VERBOSE_PROMPT,
    model: preset.model,
    skills: preset.skills,
    mcps: preset.mcps,
  }
}
```

- Echo prompt: terse, directive, structured output format
- Verbose prompt: full context, methodology, boundaries, Vault usage note
- Both prompts define what the agent handles and what it delegates

### Registry

`registry.ts` is the single source of truth for agent registration:
- `AGENT_FACTORIES` — map of name → factory function (exported, used by `system-transform.ts`)
- `ALL_AGENT_NAMES` — ordered list of all agent names (exported)
- `AGENT_ALIASES` — map of name → `@alias` string
- `buildAgentRegistry()` — builds the full registry for a given preset and echo mode
- `getAgentConfigs()` — returns the SDK config map for OpenCode's `config` hook

### Agent Roster

| Agent | Alias | Group | Specialty |
|-------|-------|-------|-----------|
| `atlas` | — | Orchestration | Routes tasks, never implements |
| `pathfinder` | `@tracker` | Exploration | File search, symbol lookup |
| `archivist` | `@keeper` | Exploration | External docs, API research |
| `elder` | `@sage` | Design | Architecture, strategy |
| `artisan` | `@craftsman` | Design | UI/UX, visual changes |
| `envoy` | `@contracts` | Design | API design, OpenAPI specs |
| `mender` | `@repairman` | Implementation | Code writing, tests |
| `inspector` | `@debugger` | Implementation | Error diagnosis, targeted fixes |
| `curator` | `@refactor` | Implementation | Refactoring, no behavior change |
| `sentinel` | `@guard` | Quality | Security audit, OWASP |
| `magistrate` | `@reviewer` | Quality | Code review, PR diffs |
| `tactician` | `@tester` | Quality | Test strategy, coverage |
| `alchemist` | `@optimizer` | Quality | Performance profiling |
| `herald` | `@deployer` | Infrastructure | CI/CD, Dockerfiles |
| `lorekeeper` | `@analyst` | Infrastructure | Schema, migrations, queries |
| `quartermaster` | `@deps` | Infrastructure | Package upgrades |
| `scribe` | `@writer` | Communication | Docs, JSDoc, changelogs |
| `tribunal` | `@assembly` | Communication | Multi-LLM consensus |

## OpenCode Hooks

| Hook | Purpose |
|------|---------|
| `experimental.chat.system.transform` | Injects Echo + agent prompt + Vault protocol for every agent call |
| `tool.execute.before` | Forge intercepts bash tools before execution |
| `tool.execute.after` | Vault passively captures learnings from tool results |
| `experimental.session.compacting` | Vault preserves context when compacting |
| `event` | Session lifecycle — clean up state on session deletion |
| `chat.message` | Vault records user messages, handles TUI commands |
| `config` | Registers all 18 agents in OpenCode's agent config |

## Configuration

- File: `~/.config/opencode/atlas.config.json`
- Defaults in `src/config/schema.ts` → `DEFAULT_CONFIG`
- Loader in `src/config/loader.ts` does deep merge with defaults
- 4 presets: `default`, `performance`, `economy`, `premium`
- Adding a new agent requires updating: `types.ts`, `schema.ts` (all 4 presets), `registry.ts`, `index.ts`

## Tests

```bash
cd packages/core
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run typecheck     # Check types
npm run check         # typecheck + tests (CI)
```

16 test files, 320 tests covering:
- Echo levels and prompt builder
- Auto-clarity (critical context detection)
- TUI commands
- All Forge filters (ANSI, dedup, redundancy, markdown, compressor)
- Vault schema DDL (tables, indexes, FTS5, triggers)
- Vault database path and initialization
- Memory protocol and private tags
- Config loader and defaults
- System transform hook
- All 18 agent definitions, dual prompts, and specializations
- Inter-module integration
