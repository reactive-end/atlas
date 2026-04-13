import { openDatabase } from '@/modules/vault/database'
import { vaultCreateSession } from '@/modules/vault/client'

const activeSessions = new Set<string>()

export function initializeVault(): boolean {
  try {
    openDatabase()
    return true
  } catch {
    return false
  }
}

export function ensureSession(sessionId: string): boolean {
  if (activeSessions.has(sessionId)) {
    return true
  }

  const result = vaultCreateSession(sessionId)

  if (result.success) {
    activeSessions.add(sessionId)
    return true
  }

  return false
}

export function removeSession(sessionId: string): void {
  activeSessions.delete(sessionId)
}

export function isSessionActive(sessionId: string): boolean {
  return activeSessions.has(sessionId)
}
