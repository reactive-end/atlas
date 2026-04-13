import { describe, it, expect } from 'vitest'
import type { AgentPresetConfig } from '@/config/schema'
import { createAtlasAgent } from '@/modules/agents/atlas'
import { createPathfinderAgent } from '@/modules/agents/pathfinder'
import { createArchivistAgent } from '@/modules/agents/archivist'
import { createElderAgent } from '@/modules/agents/elder'
import { createArtisanAgent } from '@/modules/agents/artisan'
import { createMenderAgent } from '@/modules/agents/mender'
import { createTribunalAgent } from '@/modules/agents/tribunal'
import { createInspectorAgent } from '@/modules/agents/inspector'
import { createScribeAgent } from '@/modules/agents/scribe'
import { createCuratorAgent } from '@/modules/agents/curator'
import { createSentinelAgent } from '@/modules/agents/sentinel'
import { createHeraldAgent } from '@/modules/agents/herald'
import { createLorekeeperAgent } from '@/modules/agents/lorekeeper'
import { createAlchemistAgent } from '@/modules/agents/alchemist'
import { createMagistrateAgent } from '@/modules/agents/magistrate'
import { createEnvoyAgent } from '@/modules/agents/envoy'
import { createQuartermasterAgent } from '@/modules/agents/quartermaster'
import { createTacticianAgent } from '@/modules/agents/tactician'

const TEST_PRESET: AgentPresetConfig = {
  model: 'openai/gpt-5.4',
  skills: ['*'],
  mcps: [],
}

const AGENT_FACTORIES = [
  { name: 'atlas', factory: createAtlasAgent, displayContains: 'Atlas' },
  { name: 'pathfinder', factory: createPathfinderAgent, displayContains: 'Pathfinder' },
  { name: 'archivist', factory: createArchivistAgent, displayContains: 'Archivist' },
  { name: 'elder', factory: createElderAgent, displayContains: 'Elder' },
  { name: 'artisan', factory: createArtisanAgent, displayContains: 'Artisan' },
  { name: 'mender', factory: createMenderAgent, displayContains: 'Mender' },
  { name: 'tribunal', factory: createTribunalAgent, displayContains: 'Tribunal' },
  { name: 'inspector', factory: createInspectorAgent, displayContains: 'Inspector' },
  { name: 'scribe', factory: createScribeAgent, displayContains: 'Scribe' },
  { name: 'curator', factory: createCuratorAgent, displayContains: 'Curator' },
  { name: 'sentinel', factory: createSentinelAgent, displayContains: 'Sentinel' },
  { name: 'herald', factory: createHeraldAgent, displayContains: 'Herald' },
  { name: 'lorekeeper', factory: createLorekeeperAgent, displayContains: 'Lorekeeper' },
  { name: 'alchemist', factory: createAlchemistAgent, displayContains: 'Alchemist' },
  { name: 'magistrate', factory: createMagistrateAgent, displayContains: 'Magistrate' },
  { name: 'envoy', factory: createEnvoyAgent, displayContains: 'Envoy' },
  { name: 'quartermaster', factory: createQuartermasterAgent, displayContains: 'Quartermaster' },
  { name: 'tactician', factory: createTacticianAgent, displayContains: 'Tactician' },
]

describe('Agent Definitions', () => {
  for (const { name, factory, displayContains } of AGENT_FACTORIES) {
    describe(name, () => {
      it('returns correct agent name', () => {
        const agent = factory(TEST_PRESET, true)
        expect(agent.name).toBe(name)
      })

      it('includes display name', () => {
        const agent = factory(TEST_PRESET, true)
        expect(agent.displayName).toContain(displayContains)
      })

      it('uses model from preset', () => {
        const agent = factory(TEST_PRESET, true)
        expect(agent.model).toBe('openai/gpt-5.4')
      })

      it('uses skills from preset', () => {
        const agent = factory(TEST_PRESET, true)
        expect(agent.skills).toEqual(['*'])
      })

      it('uses mcps from preset', () => {
        const preset: AgentPresetConfig = { ...TEST_PRESET, mcps: ['websearch'] }
        const agent = factory(preset, true)
        expect(agent.mcps).toEqual(['websearch'])
      })

      it('returns terse prompt in echo mode', () => {
        const agent = factory(TEST_PRESET, true)
        expect(agent.systemPrompt).toBeTruthy()
        expect(agent.systemPrompt.length).toBeGreaterThan(0)
      })

      it('returns verbose prompt when echo disabled', () => {
        const agent = factory(TEST_PRESET, false)
        expect(agent.systemPrompt).toBeTruthy()
        expect(agent.systemPrompt.length).toBeGreaterThan(0)
      })

      it('echo prompt differs from verbose prompt', () => {
        const echoAgent = factory(TEST_PRESET, true)
        const verboseAgent = factory(TEST_PRESET, false)
        expect(echoAgent.systemPrompt).not.toBe(verboseAgent.systemPrompt)
      })
    })
  }

  describe('inspector specialization', () => {
    it('echo prompt mentions ROOT CAUSE format', () => {
      const agent = createInspectorAgent(TEST_PRESET, true)
      expect(agent.systemPrompt).toContain('ROOT CAUSE')
    })

    it('verbose prompt covers stack trace diagnosis', () => {
      const agent = createInspectorAgent(TEST_PRESET, false)
      expect(agent.systemPrompt).toContain('stack trace')
    })
  })

  describe('scribe specialization', () => {
    it('echo prompt mentions JSDoc', () => {
      const agent = createScribeAgent(TEST_PRESET, true)
      expect(agent.systemPrompt).toContain('JSDoc')
    })

    it('verbose prompt mentions PR description format', () => {
      const agent = createScribeAgent(TEST_PRESET, false)
      expect(agent.systemPrompt).toContain('Pull request')
    })
  })

  describe('curator specialization', () => {
    it('echo prompt enforces no behavior change rule', () => {
      const agent = createCuratorAgent(TEST_PRESET, true)
      expect(agent.systemPrompt).toContain('Zero behavior change')
    })

    it('verbose prompt mentions Single Responsibility', () => {
      const agent = createCuratorAgent(TEST_PRESET, false)
      expect(agent.systemPrompt).toContain('Single Responsibility')
    })
  })

  describe('sentinel specialization', () => {
    it('echo prompt mentions OWASP', () => {
      const agent = createSentinelAgent(TEST_PRESET, true)
      expect(agent.systemPrompt).toContain('OWASP')
    })

    it('verbose prompt covers severity levels', () => {
      const agent = createSentinelAgent(TEST_PRESET, false)
      expect(agent.systemPrompt).toContain('CRITICAL')
      expect(agent.systemPrompt).toContain('HIGH')
    })
  })

  describe('herald specialization', () => {
    it('echo prompt mentions Dockerfile', () => {
      const agent = createHeraldAgent(TEST_PRESET, true)
      expect(agent.systemPrompt).toContain('Docker')
    })

    it('verbose prompt covers CI/CD pipelines', () => {
      const agent = createHeraldAgent(TEST_PRESET, false)
      expect(agent.systemPrompt).toContain('GitHub Actions')
    })
  })

  describe('lorekeeper specialization', () => {
    it('echo prompt mentions migrations', () => {
      const agent = createLorekeeperAgent(TEST_PRESET, true)
      expect(agent.systemPrompt).toContain('migration')
    })

    it('verbose prompt covers N+1 and index design', () => {
      const agent = createLorekeeperAgent(TEST_PRESET, false)
      expect(agent.systemPrompt).toContain('N+1')
      expect(agent.systemPrompt).toContain('index')
    })
  })

  describe('alchemist specialization', () => {
    it('echo prompt includes structured output format', () => {
      const agent = createAlchemistAgent(TEST_PRESET, true)
      expect(agent.systemPrompt).toContain('BOTTLENECK')
    })

    it('verbose prompt covers BigO analysis', () => {
      const agent = createAlchemistAgent(TEST_PRESET, false)
      expect(agent.systemPrompt).toContain('BigO')
    })
  })

  describe('magistrate specialization', () => {
    it('echo prompt includes verdict format', () => {
      const agent = createMagistrateAgent(TEST_PRESET, true)
      expect(agent.systemPrompt).toContain('VERDICT')
    })

    it('verbose prompt covers severity levels', () => {
      const agent = createMagistrateAgent(TEST_PRESET, false)
      expect(agent.systemPrompt).toContain('BLOCKER')
      expect(agent.systemPrompt).toContain('WARNING')
    })
  })

  describe('envoy specialization', () => {
    it('echo prompt mentions OpenAPI', () => {
      const agent = createEnvoyAgent(TEST_PRESET, true)
      expect(agent.systemPrompt).toContain('OpenAPI')
    })

    it('verbose prompt covers breaking changes', () => {
      const agent = createEnvoyAgent(TEST_PRESET, false)
      expect(agent.systemPrompt).toContain('breaking')
    })
  })

  describe('quartermaster specialization', () => {
    it('echo prompt includes structured package format', () => {
      const agent = createQuartermasterAgent(TEST_PRESET, true)
      expect(agent.systemPrompt).toContain('PACKAGE')
    })

    it('verbose prompt covers upgrade paths', () => {
      const agent = createQuartermasterAgent(TEST_PRESET, false)
      expect(agent.systemPrompt).toContain('upgrade')
    })
  })

  describe('tactician specialization', () => {
    it('echo prompt includes test plan format', () => {
      const agent = createTacticianAgent(TEST_PRESET, true)
      expect(agent.systemPrompt).toContain('TEST PLAN')
    })

    it('verbose prompt distinguishes unit vs integration vs e2e', () => {
      const agent = createTacticianAgent(TEST_PRESET, false)
      expect(agent.systemPrompt).toContain('unit')
      expect(agent.systemPrompt).toContain('integration')
      expect(agent.systemPrompt).toContain('e2e')
    })
  })
})
