# Contributing to Atlas

So you want to help make Atlas even better? Welcome aboard! This guide will walk you through how to contribute without making the maintainers cry into their coffee. I'm the only maintainer, so I know what I'm talking about

Before you start: Atlas is opinionated by design. Those 18 agents, 4 modules, and strict code rules? They are not suggestions. They are the foundation. If you are looking for a project where anything goes, this might not be it. But if you appreciate well-structured, laser-focused code, you are in the right place.

## Contribution Process

### 1. Open an Issue First

**Every contribution must start with an Issue.** Pull Requests that appear out of nowhere like uninvited party crashers will be rejected. I'm not being mean, I just like knowing what is coming.

- Describe the problem, bug, or feature you want to work on. Be specific. "It doesn't work" is not a description.
- Wait for maintainer confirmation before starting to code. Seriously. I have seen too many "But I already wrote the code!" situations.
- Reference the Issue in your PR using `Closes #N` or `Fixes #N`. This creates a beautiful paper trail that keeps me sane.

### 2. Fork and Branch

```bash
git clone https://github.com/your-username/atlas.git
cd atlas
git checkout -b feat/short-description
```

Branch conventions:
- `feat/` — New functionality
- `fix/` — Bug fix
- `docs/` — Documentation
- `refactor/` — Refactoring without functional changes
- `test/` — New or improved tests

### 3. Development

```bash
cd packages/core
npm install
npm run test:watch
```

### 4. Before Submitting PR

Run the checks locally first. Do not make CI do your dirty work:

```bash
npm run check   # typecheck + tests
```

If this fails on your machine, it will definitely fail in CI. And yes, I will notice. The build gods are always watching.

### 5. Pull Request

- Clear and descriptive title. "Fix stuff" is not a title. "Fix null pointer in Vault session manager" is.
- Reference to Issue: `Closes #N`. Context is everything.
- Description of changes made. Tell us what you did and why. Future you will thank present you.
- If there are visual changes, include screenshots. A picture is worth a thousand words, and those words are expensive tokens.

## Code Rules

I have rules. Lots of them. But they exist for a reason: to keep the codebase maintainable, readable, and free from that "what was I thinking?" feeling six months later.

| Rule | Detail |
|------|--------|
| No semicolons | Life is too short for punctuation that doesn't add meaning |
| No barrel files | Import from where things actually live. No re-export mazes. |
| Path aliases | `@/` for internal imports. Nobody wants to count `../../` levels. |
| Strict TypeScript | No `any`, no `unknown`. If you don't know the type, figure it out. |
| Single Responsibility | Max ~300 lines per file. If it is getting chunky, split it. |
| SonarQube patterns | Controlled complexity. I like my code readable, not clever. |

### Correct Imports

```typescript
// Correct
import { loadConfig } from '@/config/loader'
import { buildEchoPrompt } from '@/modules/echo/prompt-builder'

// Incorrect
import { loadConfig } from '../../config/loader'
import { buildEchoPrompt } from '../echo/prompt-builder'
```

### Tests

Yes, you have to write tests. No, "it works on my machine" is not sufficient.

- Every functional change must include tests. Every. Single. One.
- Tests next to source file: `file.ts` → `file.test.ts`. No hunting in `tests/` directories three levels deep.
- Framework: Vitest. It is fast. You will like it.
- Tests must pass with `npm run test`. If they fail, your PR is not ready. It is that simple, and that strict.

## What NOT to Do

Consider this the "do not feed the bears" section. These boundaries exist to keep Atlas focused and maintainable.

- Do not add new agents. The system has exactly 18. I have thought about this extensively.
- Do not add new modules. Echo, Agents, Forge, Vault. That is the complete set. No fifth module.
- Do not add additional TUI commands. `/atlas-echo`, `/atlas-verbose`, and `/atlas-status` are sufficient.
- Do not add runtime dependencies without explicit approval. Dependency hell is real and I am actively avoiding it.

## Bug Reporting

Found a bug? I would love to hear about it. Well, maybe "love" is too strong. I would professionally appreciate knowing about it so I can fix it.

Open an Issue with:

1. Problem description. Be specific. "Thing broke" is not helpful.
2. Steps to reproduce. If I cannot reproduce it, I cannot fix it.
3. Expected vs actual behavior. Tell us what you wanted to happen and what actually happened.
4. Node.js version and operating system. Sometimes the bug is the environment, not the code.
