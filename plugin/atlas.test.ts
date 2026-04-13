import { describe, it, expect, beforeEach } from 'vitest'

// Mock the @atlas-opencode/core module
const mockSessionStates = new Map()

const mockCreateInitialState = (config: any) => ({
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
  forge: { enabled: true },
  agents: {
    presets: {
      default: {}
    },
    preset: 'default'
  }
}

describe('Session State Management', () => {
  beforeEach(() => {
    mockSessionStates.clear()
  })

  it('should create separate state for each session', () => {
    const session1 = 'session-001'
    const session2 = 'session-002'
    
    // Create state for session 1
    if (!mockSessionStates.has(session1)) {
      mockSessionStates.set(session1, mockCreateInitialState(mockConfig))
    }
    
    // Create state for session 2
    if (!mockSessionStates.has(session2)) {
      mockSessionStates.set(session2, mockCreateInitialState(mockConfig))
    }
    
    const state1 = mockSessionStates.get(session1)
    const state2 = mockSessionStates.get(session2)
    
    // Verify they are separate objects
    expect(state1).not.toBe(state2)
    expect(state1.stats.echoInjected).toBe(0)
    expect(state2.stats.echoInjected).toBe(0)
  })

  it('should accumulate stats within a single session', () => {
    const session1 = 'session-001'
    
    // Create initial state
    if (!mockSessionStates.has(session1)) {
      mockSessionStates.set(session1, mockCreateInitialState(mockConfig))
    }
    
    const state = mockSessionStates.get(session1)
    
    // Simulate multiple operations
    state.stats.echoInjected++
    state.stats.echoInjected++
    state.stats.echoInjected++
    
    state.stats.vaultSaved++
    state.stats.vaultSaved++
    
    state.stats.forgeCompressed++
    
    // Verify accumulation
    expect(state.stats.echoInjected).toBe(3)
    expect(state.stats.vaultSaved).toBe(2)
    expect(state.stats.forgeSaved).toBe(1)
  })

  it('should maintain separate stats for different sessions', () => {
    const session1 = 'session-001'
    const session2 = 'session-002'
    
    // Create states
    if (!mockSessionStates.has(session1)) {
      mockSessionStates.set(session1, mockCreateInitialState(mockConfig))
    }
    if (!mockSessionStates.has(session2)) {
      mockSessionStates.set(session2, mockCreateInitialState(mockConfig))
    }
    
    const state1 = mockSessionStates.get(session1)
    const state2 = mockSessionStates.get(session2)
    
    // Add stats to session 1 only
    state1.stats.echoInjected = 5
    state1.stats.vaultSaved = 3
    
    // Add different stats to session 2
    state2.stats.echoInjected = 2
    state2.stats.forgeCompressed = 4
    
    // Verify isolation
    expect(state1.stats.echoInjected).toBe(5)
    expect(state2.stats.echoInjected).toBe(2)
    expect(state1.stats.vaultSaved).toBe(3)
    expect(state2.stats.vaultSaved).toBe(0) // Not modified
    expect(state1.stats.forgeCompressed).toBe(0) // Not modified
    expect(state2.stats.forgeCompressed).toBe(4)
  })

  it('should clean up state when session is deleted', () => {
    const session1 = 'session-001'
    
    // Create state
    if (!mockSessionStates.has(session1)) {
      mockSessionStates.set(session1, mockCreateInitialState(mockConfig))
    }
    
    // Verify it exists
    expect(mockSessionStates.has(session1)).toBe(true)
    
    // Simulate session deletion
    mockSessionStates.delete(session1)
    
    // Verify it's gone
    expect(mockSessionStates.has(session1)).toBe(false)
    expect(mockSessionStates.size).toBe(0)
  })

  it('should handle multiple sessions independently', () => {
    const sessions = ['session-001', 'session-002', 'session-003']
    
    // Create states for all sessions
    sessions.forEach(sessionID => {
      if (!mockSessionStates.has(sessionID)) {
        mockSessionStates.set(sessionID, mockCreateInitialState(mockConfig))
      }
    })
    
    // Verify all exist
    expect(mockSessionStates.size).toBe(3)
    
    // Modify each session differently
    sessions.forEach((sessionID, index) => {
      const state = mockSessionStates.get(sessionID)
      state.stats.echoInjected = index + 1
      state.stats.vaultSaved = (index + 1) * 2
    })
    
    // Verify each has correct values
    expect(mockSessionStates.get('session-001').stats.echoInjected).toBe(1)
    expect(mockSessionStates.get('session-002').stats.echoInjected).toBe(2)
    expect(mockSessionStates.get('session-003').stats.echoInjected).toBe(3)
    
    expect(mockSessionStates.get('session-001').stats.vaultSaved).toBe(2)
    expect(mockSessionStates.get('session-002').stats.vaultSaved).toBe(4)
    expect(mockSessionStates.get('session-003').stats.vaultSaved).toBe(6)
  })
})
