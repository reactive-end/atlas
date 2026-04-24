import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleMemSave,
  handleMemSearch,
  handleMemTimeline,
  handleMemGetObservation,
  MemToolResult,
} from '@/modules/vault/tool-handlers'

vi.mock('@/modules/vault/client', () => ({
  vaultSearch: vi.fn(),
  vaultTimeline: vi.fn(),
  vaultGetObservation: vi.fn(),
  vaultSaveObservation: vi.fn(),
}))

vi.mock('@/modules/vault/session-manager', () => ({
  ensureSession: vi.fn(),
}))

vi.mock('@/modules/vault/memory-protocol', () => ({
  stripPrivateTags: vi.fn((text: string) => text),
}))

import { vaultSearch, vaultTimeline, vaultGetObservation, vaultSaveObservation } from '@/modules/vault/client'
import { ensureSession } from '@/modules/vault/session-manager'
import { stripPrivateTags } from '@/modules/vault/memory-protocol'

describe('Tool Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleMemSave', () => {
    it('llama a ensureSession antes de vaultSaveObservation', async () => {
      const mockEnsure = ensureSession as ReturnType<typeof vi.fn>
      const mockSave = vaultSaveObservation as ReturnType<typeof vi.fn>

      mockEnsure.mockReturnValue(true)
      mockSave.mockReturnValue({
        success: true,
        data: { id: '1', content: 'test', category: 'test', createdAt: '2024-01-01', sessionId: 'session-1' },
      })

      const result = handleMemSave('session-1', 'content', 'test', false)

      expect(mockEnsure).toHaveBeenCalledWith('session-1')
      expect(mockEnsure).toHaveBeenCalledBefore(mockSave)
      expect(result.isError).toBe(false)
    })

    it('retorna error si ensureSession falla', async () => {
      const mockEnsure = ensureSession as ReturnType<typeof vi.fn>

      mockEnsure.mockReturnValue(false)

      const result = handleMemSave('session-1', 'content', 'test', false)

      expect(result.isError).toBe(true)
      expect(result.content).toContain('Failed to ensure session exists')
    })

    it('retorna éxito si ensureSession y vaultSaveObservation funcionan', async () => {
      const mockEnsure = ensureSession as ReturnType<typeof vi.fn>
      const mockSave = vaultSaveObservation as ReturnType<typeof vi.fn>

      mockEnsure.mockReturnValue(true)
      mockSave.mockReturnValue({
        success: true,
        data: { id: '42', content: 'test', category: 'decision', createdAt: '2024-01-01', sessionId: 'session-1' },
      })

      const result = handleMemSave('session-1', 'content', 'decision', false)

      expect(result.isError).toBe(false)
      expect(result.content).toContain('42')
      expect(result.content).toContain('decision')
    })

    it('aplica stripPrivateTags cuando stripPrivate es true', async () => {
      const mockEnsure = ensureSession as ReturnType<typeof vi.fn>
      const mockSave = vaultSaveObservation as ReturnType<typeof vi.fn>
      const mockStrip = stripPrivateTags as ReturnType<typeof vi.fn>

      mockEnsure.mockReturnValue(true)
      mockSave.mockReturnValue({
        success: true,
        data: { id: '1', content: 'sanitized', category: 'test', createdAt: '2024-01-01', sessionId: 'session-1' },
      })
      mockStrip.mockImplementation((text: string) => `sanitized:${text}`)

      handleMemSave('session-1', '<private>secret</private>', 'test', true)

      expect(mockStrip).toHaveBeenCalledWith('<private>secret</private>')
    })
  })

  describe('handleMemSearch', () => {
    it('retorna resultados formateados', async () => {
      const mockSearch = vaultSearch as ReturnType<typeof vi.fn>

      mockSearch.mockReturnValue({
        success: true,
        data: [
          { id: '1', content: 'result 1', score: 1, createdAt: '2024-01-01' },
          { id: '2', content: 'result 2', score: 2, createdAt: '2024-01-02' },
        ],
      })

      const result = handleMemSearch('query', 10, false)

      expect(result.isError).toBe(false)
      expect(result.content).toContain('[1] (2024-01-01) result 1')
      expect(result.content).toContain('[2] (2024-01-02) result 2')
    })

    it('retorna error si vaultSearch falla', async () => {
      const mockSearch = vaultSearch as ReturnType<typeof vi.fn>

      mockSearch.mockReturnValue({
        success: false,
        data: [],
        error: 'Search failed',
      })

      const result = handleMemSearch('query', 10, false)

      expect(result.isError).toBe(true)
      expect(result.content).toContain('mem_search error')
    })

    it('retorna mensaje cuando no hay resultados', async () => {
      const mockSearch = vaultSearch as ReturnType<typeof vi.fn>

      mockSearch.mockReturnValue({
        success: true,
        data: [],
      })

      const result = handleMemSearch('query', 10, false)

      expect(result.isError).toBe(false)
      expect(result.content).toContain('No memories found')
    })
  })

  describe('handleMemTimeline', () => {
    it('retorna timeline formateado', async () => {
      const mockTimeline = vaultTimeline as ReturnType<typeof vi.fn>

      mockTimeline.mockReturnValue({
        success: true,
        data: [
          { id: '1', content: 'entry 1', timestamp: '2024-01-01T10:00:00Z', type: 'save' },
          { id: '2', content: 'entry 2', timestamp: '2024-01-02T11:00:00Z', type: 'search' },
        ],
      })

      const result = handleMemTimeline('session-1', 20)

      expect(result.isError).toBe(false)
      expect(result.content).toContain('[2024-01-01T10:00:00Z] (save) entry 1')
      expect(result.content).toContain('[2024-01-02T11:00:00Z] (search) entry 2')
    })

    it('retorna error si vaultTimeline falla', async () => {
      const mockTimeline = vaultTimeline as ReturnType<typeof vi.fn>

      mockTimeline.mockReturnValue({
        success: false,
        data: [],
        error: 'Timeline failed',
      })

      const result = handleMemTimeline('session-1', 20)

      expect(result.isError).toBe(true)
      expect(result.content).toContain('mem_timeline error')
    })

    it('retorna mensaje cuando no hay entries', async () => {
      const mockTimeline = vaultTimeline as ReturnType<typeof vi.fn>

      mockTimeline.mockReturnValue({
        success: true,
        data: [],
      })

      const result = handleMemTimeline('session-1', 20)

      expect(result.isError).toBe(false)
      expect(result.content).toContain('No timeline entries')
    })
  })

  describe('handleMemGetObservation', () => {
    it('retorna observación formateada', async () => {
      const mockGet = vaultGetObservation as ReturnType<typeof vi.fn>

      mockGet.mockReturnValue({
        success: true,
        data: {
          id: '42',
          content: 'observation content',
          category: 'decision',
          createdAt: '2024-01-01T10:00:00Z',
          sessionId: 'session-1',
        },
      })

      const result = handleMemGetObservation('42')

      expect(result.isError).toBe(false)
      expect(result.content).toContain('ID: 42')
      expect(result.content).toContain('Category: decision')
      expect(result.content).toContain('Session: session-1')
      expect(result.content).toContain('Content: observation content')
    })

    it('retorna error si vaultGetObservation falla', async () => {
      const mockGet = vaultGetObservation as ReturnType<typeof vi.fn>

      mockGet.mockReturnValue({
        success: false,
        data: null,
        error: 'Observation not found',
      })

      const result = handleMemGetObservation('999')

      expect(result.isError).toBe(true)
      expect(result.content).toContain('mem_get_observation error')
    })
  })
})