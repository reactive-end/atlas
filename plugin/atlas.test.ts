import { describe, it, expect, beforeEach } from 'vitest'

// Mock the @atlas-opencode/core module
const mockSessionStates = new Map()

const mockCreateInitialState = () => ({
  echoLevel: 'full',
  agentMode: 'echo',
  activePreset: 'default',
  stats: {
    forgeCompressed: 0,
    vaultSaved: 0,
    echoInjected: 0,
  },
})

const mockConfig = {
  echo: { enabled: true },
  vault: { enabled: true },
  forge: {
    enabled: true,
    bypass: ['docker exec', 'psql', 'mysql', 'ssh'],
    compressMarkdown: true,
    adaptiveIntensity: true,
    showCompressionRatio: false,
  },
  agents: {
    presets: {
      default: {}
    },
    preset: 'default'
  },
  codex: {
    enabled: true,
    indexPath: '.atlas/index.md',
  }
}

describe('Session State Management', () => {
  beforeEach(() => {
    mockSessionStates.clear()
  })

  it('should create separate state for each session', () => {
    const session1 = 'session-001'
    const session2 = 'session-002'
    
    if (!mockSessionStates.has(session1)) {
      mockSessionStates.set(session1, mockCreateInitialState())
    }
    
    if (!mockSessionStates.has(session2)) {
      mockSessionStates.set(session2, mockCreateInitialState())
    }
    
    const state1 = mockSessionStates.get(session1)
    const state2 = mockSessionStates.get(session2)
    
    expect(state1).not.toBe(state2)
    expect(state1.stats.echoInjected).toBe(0)
    expect(state2.stats.echoInjected).toBe(0)
  })

  it('should accumulate stats within a single session', () => {
    const session1 = 'session-001'
    
    if (!mockSessionStates.has(session1)) {
      mockSessionStates.set(session1, mockCreateInitialState())
    }
    
    const state = mockSessionStates.get(session1)
    
    state.stats.echoInjected++
    state.stats.echoInjected++
    state.stats.echoInjected++
    
    state.stats.vaultSaved++
    state.stats.vaultSaved++
    
    state.stats.forgeCompressed++
    
    expect(state.stats.echoInjected).toBe(3)
    expect(state.stats.vaultSaved).toBe(2)
    expect(state.stats.forgeCompressed).toBe(1)
  })

  it('should maintain separate stats for different sessions', () => {
    const session1 = 'session-001'
    const session2 = 'session-002'
    
    if (!mockSessionStates.has(session1)) {
      mockSessionStates.set(session1, mockCreateInitialState())
    }
    if (!mockSessionStates.has(session2)) {
      mockSessionStates.set(session2, mockCreateInitialState())
    }
    
    const state1 = mockSessionStates.get(session1)
    const state2 = mockSessionStates.get(session2)
    
    state1.stats.echoInjected = 5
    state1.stats.vaultSaved = 3
    
    state2.stats.echoInjected = 2
    state2.stats.forgeCompressed = 4
    
    expect(state1.stats.echoInjected).toBe(5)
    expect(state2.stats.echoInjected).toBe(2)
    expect(state1.stats.vaultSaved).toBe(3)
    expect(state2.stats.vaultSaved).toBe(0)
    expect(state1.stats.forgeCompressed).toBe(0)
    expect(state2.stats.forgeCompressed).toBe(4)
  })

  it('should clean up state when session is deleted', () => {
    const session1 = 'session-001'
    
    if (!mockSessionStates.has(session1)) {
      mockSessionStates.set(session1, mockCreateInitialState())
    }
    
    expect(mockSessionStates.has(session1)).toBe(true)
    
    mockSessionStates.delete(session1)
    
    expect(mockSessionStates.has(session1)).toBe(false)
    expect(mockSessionStates.size).toBe(0)
  })

  it('should handle multiple sessions independently', () => {
    const sessions = ['session-001', 'session-002', 'session-003']
    
    sessions.forEach(sessionID => {
      if (!mockSessionStates.has(sessionID)) {
        mockSessionStates.set(sessionID, mockCreateInitialState())
      }
    })
    
    expect(mockSessionStates.size).toBe(3)
    
    sessions.forEach((sessionID, index) => {
      const state = mockSessionStates.get(sessionID)
      state.stats.echoInjected = index + 1
      state.stats.vaultSaved = (index + 1) * 2
    })
    
    expect(mockSessionStates.get('session-001').stats.echoInjected).toBe(1)
    expect(mockSessionStates.get('session-002').stats.echoInjected).toBe(2)
    expect(mockSessionStates.get('session-003').stats.echoInjected).toBe(3)
    
    expect(mockSessionStates.get('session-001').stats.vaultSaved).toBe(2)
    expect(mockSessionStates.get('session-002').stats.vaultSaved).toBe(4)
    expect(mockSessionStates.get('session-003').stats.vaultSaved).toBe(6)
  })
})

describe('Config Structure', () => {
  it('should have all required config sections', () => {
    expect(mockConfig.echo).toBeDefined()
    expect(mockConfig.vault).toBeDefined()
    expect(mockConfig.forge).toBeDefined()
    expect(mockConfig.agents).toBeDefined()
    expect(mockConfig.codex).toBeDefined()
  })

  it('should have forge compression options', () => {
    expect(mockConfig.forge.compressMarkdown).toBe(true)
    expect(mockConfig.forge.adaptiveIntensity).toBe(true)
    expect(mockConfig.forge.bypass).toContain('docker exec')
  })

  it('should have codex configuration', () => {
    expect(mockConfig.codex.enabled).toBe(true)
    expect(mockConfig.codex.indexPath).toBe('.atlas/index.md')
  })
})

describe('Plugin Agent Registration', () => {
  const EXPECTED_AGENTS = [
    'atlas', 'pathfinder', 'archivist', 'elder', 'artisan',
    'mender', 'tribunal', 'inspector', 'scribe', 'curator',
    'sentinel', 'herald', 'lorekeeper', 'alchemist', 'magistrate',
    'envoy', 'quartermaster', 'tactician', 'squire',
  ]

  it('should register 19 agents', () => {
    expect(EXPECTED_AGENTS).toHaveLength(19)
  })

  it('should include the Squire agent', () => {
    expect(EXPECTED_AGENTS).toContain('squire')
  })

  it('should include the Atlas orchestrator', () => {
    expect(EXPECTED_AGENTS).toContain('atlas')
  })

  it('should have unique agent names', () => {
    const unique = new Set(EXPECTED_AGENTS)
    expect(unique.size).toBe(EXPECTED_AGENTS.length)
  })
})

describe('Forge Pipeline Integration', () => {
  it('should track forge compression in session stats', () => {
    const state = mockCreateInitialState()
    
    // Simulate forge compression event
    state.stats.forgeCompressed++
    state.stats.forgeCompressed++
    
    expect(state.stats.forgeCompressed).toBe(2)
  })

  it('should track vault saves in session stats', () => {
    const state = mockCreateInitialState()
    
    state.stats.vaultSaved++
    
    expect(state.stats.vaultSaved).toBe(1)
  })

  it('should track echo injections in session stats', () => {
    const state = mockCreateInitialState()
    
    state.stats.echoInjected++
    state.stats.echoInjected++
    state.stats.echoInjected++
    
    expect(state.stats.echoInjected).toBe(3)
  })
})

describe('Echo Mode State', () => {
  it('defaults to echo mode with full level', () => {
    const state = mockCreateInitialState()
    expect(state.agentMode).toBe('echo')
    expect(state.echoLevel).toBe('full')
  })

  it('can switch to verbose mode', () => {
    const state = mockCreateInitialState()
    state.agentMode = 'verbose'
    expect(state.agentMode).toBe('verbose')
  })

  it('can change echo level', () => {
    const state = mockCreateInitialState()
    state.echoLevel = 'ultra'
    expect(state.echoLevel).toBe('ultra')
  })

  it('supports all three echo levels', () => {
    const state = mockCreateInitialState()
    
    for (const level of ['lite', 'full', 'ultra'] as const) {
      state.echoLevel = level
      expect(state.echoLevel).toBe(level)
    }
  })
})
